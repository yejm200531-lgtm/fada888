import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();

  const totalPosts = (db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number }).count;
  const publishedPosts = (db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published'").get() as { count: number }).count;
  const failedPosts = (db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'failed'").get() as { count: number }).count;
  const totalCampaigns = (db.prepare('SELECT COUNT(*) as count FROM campaigns').get() as { count: number }).count;
  const activeCampaigns = (db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE is_active = 1').get() as { count: number }).count;

  const byPlatform = db.prepare(`
    SELECT platform, COUNT(*) as total,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published
    FROM posts GROUP BY platform
  `).all();

  const recentPosts = db.prepare(`
    SELECT p.*, c.name as campaign_name
    FROM posts p
    LEFT JOIN campaigns c ON p.campaign_id = c.id
    ORDER BY p.created_at DESC
    LIMIT 10
  `).all();

  const dailyPosts = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM posts
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all();

  return NextResponse.json({
    summary: {
      totalPosts,
      publishedPosts,
      failedPosts,
      totalCampaigns,
      activeCampaigns,
      successRate: totalPosts > 0 ? Math.round((publishedPosts / totalPosts) * 100) : 0,
    },
    byPlatform,
    recentPosts,
    dailyPosts,
  });
}
