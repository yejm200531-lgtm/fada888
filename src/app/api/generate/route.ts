import { NextRequest, NextResponse } from 'next/server';
import { generateBatch } from '@/lib/claude';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { campaign_id, platforms, topic, description, tone, language, save = true } = body;

  const generated = await generateBatch(
    platforms,
    topic,
    description || '',
    tone || 'engaging',
    language || 'zh'
  );

  if (save && campaign_id) {
    const db = getDb();
    for (const item of generated) {
      const postId = uuidv4();
      db.prepare(`
        INSERT INTO posts (id, campaign_id, platform, title, content, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(postId, campaign_id, item.platform, item.title || null, item.content);
    }
  }

  return NextResponse.json({ generated });
}
