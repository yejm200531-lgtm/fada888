import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const db = getDb();
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  return NextResponse.json(
    campaigns.map((c: unknown) => {
      const campaign = c as Record<string, unknown>;
      return {
        ...campaign,
        platforms: JSON.parse((campaign.platforms as string) || '[]'),
        is_active: Boolean(campaign.is_active),
      };
    })
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO campaigns (id, name, topic, description, tone, language, platforms, schedule_cron, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    body.name,
    body.topic,
    body.description || null,
    body.tone || 'engaging',
    body.language || 'zh',
    JSON.stringify(body.platforms || []),
    body.schedule_cron || null,
    body.is_active ? 1 : 0
  );

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as Record<string, unknown>;
  return NextResponse.json({
    ...campaign,
    platforms: JSON.parse((campaign.platforms as string) || '[]'),
    is_active: Boolean(campaign.is_active),
  });
}
