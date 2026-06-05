import cron, { ScheduledTask } from 'node-cron';
import { getDb } from './db';
import { publishPost } from './publishers';
import { generateBatch } from './claude';
import { v4 as uuidv4 } from 'uuid';

const activeTasks = new Map<string, ScheduledTask>();

type CampaignRow = {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  tone: string;
  language: string;
  platforms: string;
  schedule_cron: string | null;
};

export async function runCampaign(campaignId: string, trigger: 'scheduled' | 'manual') {
  const db = getDb();
  const campaign = db
    .prepare('SELECT * FROM campaigns WHERE id = ? AND is_active = 1')
    .get(campaignId) as CampaignRow | undefined;

  if (!campaign) return;

  const platforms = JSON.parse(campaign.platforms || '[]') as string[];
  if (!platforms.length) return;

  const logId = uuidv4();
  db.prepare(`
    INSERT INTO run_logs (id, campaign_id, trigger, status, message)
    VALUES (?, ?, ?, 'running', 'AI 正在生成内容...')
  `).run(logId, campaignId, trigger);

  try {
    const generated = await generateBatch(
      platforms,
      campaign.topic,
      campaign.description || '',
      campaign.tone,
      campaign.language
    );

    let published = 0;
    const postIds: string[] = [];

    for (const item of generated) {
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO posts (id, campaign_id, platform, title, content, status, scheduled_at)
        VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
      `).run(postId, campaignId, item.platform, item.title || null, item.content);
      postIds.push(postId);
    }

    for (const postId of postIds) {
      const result = await publishPost(postId);
      if (result.success) published++;
    }

    db.prepare(`
      UPDATE run_logs SET status = 'success', message = ?, posts_created = ?, posts_published = ?
      WHERE id = ?
    `).run(`成功发布到 ${published}/${generated.length} 个平台`, generated.length, published, logId);

    console.log(`[AutoPromoter] Campaign "${campaign.name}" run complete: ${published}/${generated.length} published`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.prepare(`
      UPDATE run_logs SET status = 'error', message = ? WHERE id = ?
    `).run(`错误: ${msg}`, logId);
    console.error(`[AutoPromoter] Campaign "${campaign.name}" run failed:`, msg);
  }
}

export function startCampaignScheduler(campaignId: string, runImmediately = false) {
  const db = getDb();
  const campaign = db
    .prepare('SELECT id, name, schedule_cron FROM campaigns WHERE id = ? AND is_active = 1')
    .get(campaignId) as { id: string; name: string; schedule_cron: string | null } | undefined;

  if (!campaign) return;

  if (activeTasks.has(campaignId)) {
    activeTasks.get(campaignId)?.stop();
    activeTasks.delete(campaignId);
  }

  if (campaign.schedule_cron && cron.validate(campaign.schedule_cron)) {
    const task = cron.schedule(campaign.schedule_cron, () => {
      runCampaign(campaignId, 'scheduled');
    });
    activeTasks.set(campaignId, task);
    console.log(`[AutoPromoter] Scheduled "${campaign.name}" with cron: ${campaign.schedule_cron}`);
  }

  // Run immediately on activation (first fire)
  if (runImmediately) {
    runCampaign(campaignId, 'manual');
  }
}

export function stopCampaignScheduler(campaignId: string) {
  const task = activeTasks.get(campaignId);
  if (task) {
    task.stop();
    activeTasks.delete(campaignId);
    console.log(`[AutoPromoter] Stopped scheduler for campaign ${campaignId}`);
  }
}

export function initAllSchedulers() {
  const db = getDb();
  const campaigns = db
    .prepare("SELECT id FROM campaigns WHERE is_active = 1 AND schedule_cron IS NOT NULL AND schedule_cron != ''")
    .all() as { id: string }[];

  for (const c of campaigns) {
    startCampaignScheduler(c.id, false);
  }

  console.log(`[AutoPromoter] Initialized ${campaigns.length} active scheduler(s)`);
}

export function getActiveCount(): number {
  return activeTasks.size;
}
