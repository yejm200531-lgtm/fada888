import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const SUPPORTED_PLATFORMS = [
  { id: 'reddit', name: 'Reddit', icon: '🤖', fields: ['clientId', 'clientSecret', 'username', 'password', 'subreddit', 'userAgent'] },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', fields: ['apiKey', 'apiSecret', 'accessToken', 'accessSecret'] },
  { id: 'hackernews', name: 'Hacker News', icon: '🟠', fields: ['username', 'password'] },
  { id: 'producthunt', name: 'Product Hunt', icon: '🚀', fields: ['accessToken'] },
  { id: 'weibo', name: '微博', icon: '📱', fields: ['accessToken', 'appKey'] },
];

export async function GET() {
  const db = getDb();
  const configs = db.prepare('SELECT * FROM platform_configs').all() as {
    platform: string;
    config: string;
    is_enabled: number;
  }[];
  const configMap = Object.fromEntries(
    configs.map((c) => [c.platform, { config: JSON.parse(c.config), is_enabled: Boolean(c.is_enabled) }])
  );

  return NextResponse.json(
    SUPPORTED_PLATFORMS.map((p) => ({
      ...p,
      is_enabled: configMap[p.id]?.is_enabled || false,
      has_config: Object.keys(configMap[p.id]?.config || {}).length > 0,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { platform, config, is_enabled } = body;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM platform_configs WHERE platform = ?').get(platform) as { id: string } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE platform_configs SET config = ?, is_enabled = ?, updated_at = datetime('now')
      WHERE platform = ?
    `).run(JSON.stringify(config || {}), is_enabled ? 1 : 0, platform);
  } else {
    db.prepare(`
      INSERT INTO platform_configs (id, platform, config, is_enabled)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), platform, JSON.stringify(config || {}), is_enabled ? 1 : 0);
  }

  return NextResponse.json({ success: true });
}
