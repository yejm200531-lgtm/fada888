import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { publishPost } from '@/lib/publishers';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { platform, title, content } = body;

  const db = getDb();
  const postId = uuidv4();

  db.prepare(`
    INSERT INTO posts (id, campaign_id, platform, title, content, status)
    VALUES (?, '', ?, ?, ?, 'pending')
  `).run(postId, platform, title || null, content);

  const result = await publishPost(postId);
  return NextResponse.json(result);
}
