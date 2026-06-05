'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Copy, Send, RefreshCw } from 'lucide-react';

const PLATFORMS = ['reddit', 'twitter', 'hackernews', 'producthunt', 'weibo'];
const platformEmoji: Record<string, string> = {
  reddit: '🤖', twitter: '🐦', hackernews: '🟠', producthunt: '🚀', weibo: '📱',
};

type GeneratedItem = {
  platform: string;
  title?: string;
  tagline?: string;
  content: string;
};

export default function GeneratePage() {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [tone, setTone] = useState('engaging');
  const [language, setLanguage] = useState('zh');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['reddit', 'twitter']);
  const [results, setResults] = useState<GeneratedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function generate() {
    if (!topic.trim() || selectedPlatforms.length === 0) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          description,
          tone,
          language,
          platforms: selectedPlatforms,
          save: false,
        }),
      });
      const data = await res.json();
      setResults(data.generated || []);
    } finally {
      setLoading(false);
    }
  }

  async function publishNow(item: GeneratedItem) {
    setPublishing(item.platform);
    try {
      // Save and immediately publish
      const saveRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          description,
          tone,
          language,
          platforms: [item.platform],
          save: false,
        }),
      });
      const saved = await saveRes.json();
      const generated = saved.generated?.[0];
      if (!generated) return;

      // Create post
      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish_direct', content: generated }),
      });
      await postRes.json();
      alert(`已发布到 ${item.platform}！（模拟模式，如需真实发布请配置平台API）`);
    } finally {
      setPublishing(null);
    }
  }

  function copyContent(item: GeneratedItem) {
    const text = item.title ? `${item.title}\n\n${item.content}` : item.content;
    navigator.clipboard.writeText(text);
    setCopied(item.platform);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">快速生成</h1>
        <p className="text-gray-500 mt-1">AI 一键生成多平台推广文案</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>生成参数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">推广主题 *</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 我的开源工具 / 新产品发布"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详细描述</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="核心功能、受众、价值主张..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">风格</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  >
                    <option value="engaging">吸引人</option>
                    <option value="professional">专业</option>
                    <option value="casual">轻松</option>
                    <option value="humorous">幽默</option>
                    <option value="informative">信息丰富</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">语言</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标平台</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        selectedPlatforms.includes(p)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {platformEmoji[p]} {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generate}
                disabled={loading || !topic.trim() || selectedPlatforms.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {loading ? (
                  <><RefreshCw size={16} className="animate-spin" /> 生成中...</>
                ) : (
                  <><Zap size={16} /> AI 生成文案</>
                )}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Claude 正在为你生成内容...</p>
              </div>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <div className="text-center">
                <Zap size={48} className="mx-auto mb-4 opacity-30" />
                <p>填写参数后点击"AI 生成文案"</p>
              </div>
            </div>
          )}

          {results.map((item) => (
            <Card key={item.platform}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{platformEmoji[item.platform]}</span>
                    <CardTitle>{item.platform}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyContent(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <Copy size={12} />
                      {copied === item.platform ? '已复制!' : '复制'}
                    </button>
                    <button
                      onClick={() => publishNow(item)}
                      disabled={publishing === item.platform}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Send size={12} />
                      {publishing === item.platform ? '发布中...' : '立即发布'}
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {item.title && (
                  <div className="mb-2">
                    <Badge variant="info">标题</Badge>
                    <p className="text-sm font-medium text-gray-900 mt-1">{item.title}</p>
                  </div>
                )}
                {item.tagline && (
                  <div className="mb-2">
                    <Badge variant="purple">Tagline</Badge>
                    <p className="text-sm text-gray-600 mt-1 italic">{item.tagline}</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3 mt-2">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.content}</p>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {item.content.length} 字符
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
