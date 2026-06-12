'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Zap, Pause, Play, RefreshCw, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type RunLog = {
  id: string;
  trigger: string;
  status: string;
  message: string;
  posts_created: number;
  posts_published: number;
  created_at: string;
};

type Post = {
  id: string;
  platform: string;
  title: string | null;
  content: string;
  status: string;
  created_at: string;
  platform_post_id: string | null;
};

type Campaign = {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  tone: string;
  language: string;
  platforms: string[];
  schedule_cron: string | null;
  is_active: boolean;
  created_at: string;
  posts: Post[];
  logs: RunLog[];
};

const platformEmoji: Record<string, string> = {
  reddit: '🤖', twitter: '🐦', hackernews: '🟠', producthunt: '🚀', weibo: '📱',
};
const statusVariant: Record<string, string> = {
  published: 'success', failed: 'danger', pending: 'warning', scheduled: 'info',
};
const CRON_PRESETS: Record<string, string> = {
  '*/30 * * * *': '每30分钟',
  '0 * * * *': '每1小时',
  '0 */3 * * *': '每3小时',
  '0 */6 * * *': '每6小时',
  '0 9 * * *': '每天上午9点',
  '0 9,18 * * *': '每天两次',
  '0 9 * * 1': '每周一',
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}`);
    if (res.ok) setCampaign(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    // Poll every 5s to show live activity
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  async function toggleActive() {
    if (!campaign) return;
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !campaign.is_active }),
    });
    load();
  }

  async function runNow() {
    setRunning(true);
    // Fire and forget — server runs async, we poll for result
    fetch(`/api/campaigns/${id}/run`, { method: 'POST' });
    // Poll a few times to catch when the log appears
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      await load();
    }
    setRunning(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>活动不存在</p>
        <Link href="/campaigns" className="text-indigo-600 mt-2 inline-block">返回列表</Link>
      </div>
    );
  }

  const publishedCount = campaign.posts.filter((p) => p.status === 'published').length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/campaigns" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              campaign.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${campaign.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {campaign.is_active ? '自动运行中' : '已暂停'}
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-1">{campaign.topic}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            title="刷新"
          >
            <RefreshCw size={16} />
          </button>
          {campaign.is_active && (
            <button
              onClick={runNow}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
            >
              <Zap size={14} />
              {running ? '运行中...' : '立刻运行'}
            </button>
          )}
          <button
            onClick={toggleActive}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              campaign.is_active
                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100'
                : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
            }`}
          >
            {campaign.is_active ? <><Pause size={14} /> 暂停</> : <><Play size={14} /> 启动</>}
          </button>
        </div>
      </div>

      {/* Config Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{campaign.posts.length}</div>
            <div className="text-xs text-gray-500 mt-1">总帖子数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
            <div className="text-xs text-gray-500 mt-1">已发布</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{campaign.logs.length}</div>
            <div className="text-xs text-gray-500 mt-1">运行次数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-sm font-medium text-gray-900">
              {CRON_PRESETS[campaign.schedule_cron || ''] || campaign.schedule_cron || '手动'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <Clock size={10} className="inline mr-1" />自动频率
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Run Logs - the heart of "fully automatic" */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>自动运行日志</CardTitle>
              <span className="text-xs text-gray-400">每5秒刷新</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {campaign.logs.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Loader size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">等待首次运行...</p>
                {campaign.is_active && (
                  <p className="text-xs mt-1">活动已激活，日志即将出现</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {campaign.logs.map((log) => (
                  <div key={log.id} className="px-5 py-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        {log.status === 'success' && <CheckCircle size={16} className="text-green-500" />}
                        {log.status === 'error' && <XCircle size={16} className="text-red-500" />}
                        {log.status === 'running' && <Loader size={16} className="text-indigo-500 animate-spin" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${
                            log.status === 'success' ? 'text-green-700' :
                            log.status === 'error' ? 'text-red-700' : 'text-indigo-700'
                          }`}>
                            {log.status === 'success' ? '成功' : log.status === 'error' ? '失败' : '运行中'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {log.trigger === 'manual' ? '手动触发' : '定时触发'}
                          </span>
                          {log.posts_created > 0 && (
                            <span className="text-xs text-gray-500">
                              发布 {log.posts_published}/{log.posts_created} 篇
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{log.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDistanceToNow(new Date(log.created_at), { locale: zhCN, addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card>
          <CardHeader>
            <CardTitle>自动发布的帖子</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {campaign.posts.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">还没有帖子</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                {campaign.posts.map((post) => (
                  <div key={post.id} className="px-5 py-3 flex items-start gap-3">
                    <span className="text-lg shrink-0">{platformEmoji[post.platform] || '📢'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 line-clamp-1">
                        {post.title || post.content.slice(0, 60)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDistanceToNow(new Date(post.created_at), { locale: zhCN, addSuffix: true })}
                        {post.platform_post_id && ` · ID: ${post.platform_post_id}`}
                      </p>
                    </div>
                    <Badge variant={statusVariant[post.status] || 'default'}>{post.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Platform targets */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>目标平台</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {campaign.platforms.map((p) => (
              <div key={p} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-xl">{platformEmoji[p] || '📢'}</span>
                <span className="text-sm font-medium text-gray-700 capitalize">{p}</span>
                {campaign.is_active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
