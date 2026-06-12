'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, RefreshCw, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type Post = {
  id: string;
  campaign_id: string;
  platform: string;
  title: string | null;
  content: string;
  status: string;
  platform_post_id: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  error: string | null;
  created_at: string;
};

const platformEmoji: Record<string, string> = {
  reddit: '🤖', twitter: '🐦', hackernews: '🟠', producthunt: '🚀', weibo: '📱',
};
const statusVariant: Record<string, string> = {
  published: 'success', failed: 'danger', pending: 'warning', scheduled: 'info',
};
const STATUS_FILTERS = ['all', 'pending', 'published', 'failed', 'scheduled'];

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [statusFilter]);

  async function loadPosts() {
    setLoading(true);
    const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    const res = await fetch(`/api/posts${params}`);
    setPosts(await res.json());
    setLoading(false);
  }

  async function publishPost(id: string) {
    setPublishing(id);
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish', post_id: id }),
    });
    await loadPosts();
    setPublishing(null);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">帖子管理</h1>
          <p className="text-gray-500 mt-1">查看和管理所有推广帖子</p>
        </div>
        <button
          onClick={loadPosts}
          className="flex items-center gap-2 text-gray-600 border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
        >
          <RefreshCw size={14} />
          刷新
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? '全部' : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>没有找到帖子</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <span className="text-2xl mt-1">{platformEmoji[post.platform] || '📢'}</span>
                  <div className="flex-1 min-w-0">
                    {post.title && (
                      <p className="font-medium text-gray-900 text-sm mb-1">{post.title}</p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
                    {post.error && (
                      <p className="text-xs text-red-500 mt-1">错误：{post.error}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400 capitalize">{post.platform}</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(post.created_at), { locale: zhCN, addSuffix: true })}
                      </span>
                      {post.platform_post_id && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-400">ID: {post.platform_post_id}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariant[post.status] || 'default'}>{post.status}</Badge>
                    {post.status === 'pending' && (
                      <button
                        onClick={() => publishPost(post.id)}
                        disabled={publishing === post.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Send size={12} />
                        {publishing === post.id ? '发布中...' : '发布'}
                      </button>
                    )}
                    {post.status === 'published' && post.platform_post_id && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <ExternalLink size={12} />
                        已发布
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
