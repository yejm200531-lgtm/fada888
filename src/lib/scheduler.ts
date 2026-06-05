import cron, { ScheduledTask } from 'node-cron';
import { getDb } from './db';
import { publishPost } from './publishers';
import { generateBatch } from './claude';
import { v4 as uuidv4 } from 'uuid';

const activeTasks = new Map<string, ScheduledTask>();

export function startCampaignScheduler(campaignId: string) {
  const db = getDb();
  const campaign = db
    .prepare('SELECT * FROM campaigns WHERE id = ? AND is_active = 1')
    .get(campaignId) as {
    id: string;
    name: string;
    topic: string;
    description: string | null;
    tone: string;
    language: string;
    platforms: string;
    schedule_cron: string | null;
  } | undefined;

  if (!campaign || !campaign.schedule_cron) return;

  if (activeTasks.has(campaignId)) {
    activeTasks.get(campaignId)?.stop();
  }

  const task = cron.schedule(campaign.schedule_cron, async () => {
    const platforms = JSON.parse(campaign.platforms || '[]') as string[];
    if (!platforms.length) return;

    const generated = await generateBatch(
      platforms,
      campaign.topic,
      campaign.description || '',
      campaign.tone,
      campaign.language
    );

    for (const item of generated) {
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO posts (id, campaign_id, platform, title, content, status, scheduled_at)
        VALUES (?, ?, ?, ?, ?, 'scheduled', datetime('now'))
      `).run(postId, campaignId, item.platform, item.title || null, item.content);

      await publishPost(postId);
    }
  });

  activeTasks.set(campaignId, task);
}

export function stopCampaignScheduler(campaignId: string) {
  const task = activeTasks.get(campaignId);
  if (task) {
    task.stop();
    activeTasks.delete(campaignId);
  }
}

export function initAllSchedulers() {
  const db = getDb();
  const campaigns = db
    .prepare('SELECT id FROM campaigns WHERE is_active = 1 AND schedule_cron IS NOT NULL')
    .all() as { id: string }[];

  for (const c of campaigns) {
    startCampaignScheduler(c.id);
  }
}
