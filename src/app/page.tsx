'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type Analytics = {
  summary: {
    totalPosts: number;
    publishedPosts: number;
    failedPosts: number;
    totalCampaigns: number;
    activeCampaigns: number;
    successRate: number;
  };
  byPlatform: { platform: string; total: number; published: number }[];
  recentPosts: {
    id: string;
    platform: string;
    title: string | null;
    content: string;
    status: string;
    created_at: string;
    campaign_name?: string;
  }[];
};

const platformEmoji: Record<string, string> = {
  reddit: '🤖',
  twitter: '🐦',
  hackernews: '🟠',
  producthunt: '🚀',
  weibo: '📱',
};

const statusVariant: Record<string, string> = {
  published: 'success',
  failed: 'danger',
  pending: 'warning',
  scheduled: 'info',
};

export default function Dashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
        <p className="text-gray-500 mt-1">实时监控推广效果</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Megaphone className="text-indigo-500" size={20} />}
          label="活跃活动"
          value={s?.activeCampaigns ?? 0}
          sub={`共 ${s?.totalCampaigns ?? 0} 个`}
        />
        <StatCard
          icon={<FileText className="text-blue-500" size={20} />}
          label="总发帖数"
          value={s?.totalPosts ?? 0}
          sub="所有平台"
        />
        <StatCard
          icon={<CheckCircle className="text-green-500" size={20} />}
          label="已发布"
          value={s?.publishedPosts ?? 0}
          sub={`成功率 ${s?.successRate ?? 0}%`}
        />
        <StatCard
          icon={<TrendingUp className="text-purple-500" size={20} />}
          label="失败帖子"
          value={s?.failedPosts ?? 0}
          sub="需要检查"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>各平台发布情况</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.byPlatform.length ? (
              <p className="text-gray-400 text-sm text-center py-4">暂无数据 — 先创建推广活动吧</p>
            ) : (
              <div className="space-y-3">
                {data.byPlatform.map((p) => (
                  <div key={p.platform} className="flex items-center gap-3">
                    <span className="text-xl">{platformEmoji[p.platform] || '📢'}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium capitalize">{p.platform}</span>
                        <span className="text-gray-500">
                          {p.published}/{p.total}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width: `${p.total > 0 ? (p.published / p.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近发布</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {!data?.recentPosts.length ? (
                <p className="text-gray-400 text-sm text-center py-8">暂无帖子</p>
              ) : (
                data.recentPosts.map((post) => (
                  <div key={post.id} className="px-6 py-3 flex items-start gap-3">
                    <span className="text-lg mt-0.5">{platformEmoji[post.platform] || '📢'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {post.title || post.content.slice(0, 60)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {post.campaign_name} ·{' '}
                        {formatDistanceToNow(new Date(post.created_at), {
                          locale: zhCN,
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Badge variant={statusVariant[post.status] || 'default'}>{post.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
          <span className="text-sm text-gray-500">{label}</span>
        </div>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-400 mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}
