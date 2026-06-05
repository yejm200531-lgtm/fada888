import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { publishPost } from '@/lib/publishers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaign_id = searchParams.get('campaign_id');
  const status = searchParams.get('status');
  const db = getDb();

  let query = 'SELECT * FROM posts WHERE 1=1';
  const params: unknown[] = [];

  if (campaign_id) { query += ' AND campaign_id = ?'; params.push(campaign_id); }
  if (status) { query += ' AND status = ?'; params.push(status); }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const posts = db.prepare(query).all(...params);
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, post_id } = body;

  if (action === 'publish' && post_id) {
    const result = await publishPost(post_id);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
