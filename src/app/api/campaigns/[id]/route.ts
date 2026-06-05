import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { startCampaignScheduler, stopCampaignScheduler } from '@/lib/scheduler';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const posts = db
    .prepare('SELECT * FROM posts WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(id);

  return NextResponse.json({
    ...campaign,
    platforms: JSON.parse((campaign.platforms as string) || '[]'),
    is_active: Boolean(campaign.is_active),
    posts,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
  if (body.topic !== undefined) { updates.push('topic = ?'); values.push(body.topic); }
  if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
  if (body.tone !== undefined) { updates.push('tone = ?'); values.push(body.tone); }
  if (body.language !== undefined) { updates.push('language = ?'); values.push(body.language); }
  if (body.platforms !== undefined) { updates.push('platforms = ?'); values.push(JSON.stringify(body.platforms)); }
  if (body.schedule_cron !== undefined) { updates.push('schedule_cron = ?'); values.push(body.schedule_cron); }
  if (body.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(body.is_active ? 1 : 0);
    if (body.is_active) {
      startCampaignScheduler(id);
    } else {
      stopCampaignScheduler(id);
    }
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json({
    ...campaign,
    platforms: JSON.parse((campaign.platforms as string) || '[]'),
    is_active: Boolean(campaign.is_active),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  stopCampaignScheduler(id);
  db.prepare('DELETE FROM posts WHERE campaign_id = ?').run(id);
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
