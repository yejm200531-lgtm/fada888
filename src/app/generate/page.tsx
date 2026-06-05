'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Copy, RefreshCw, CheckCircle } from 'lucide-react';

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

type PublishStatus = 'idle' | 'generating' | 'publishing' | 'done';

export default function GeneratePage() {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [tone, setTone] = useState('engaging');
  const [language, setLanguage] = useState('zh');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['reddit', 'twitter']);
  const [results, setResults] = useState<GeneratedItem[]>([]);
  const [publishResults, setPublishResults] = useState<Record<string, 'success' | 'failed'>>({});
  const [status, setStatus] = useState<PublishStatus>('idle');
  const [copied, setCopied] = useState<string | null>(null);

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function generateAndPublish() {
    if (!topic.trim() || !selectedPlatforms.length) return;

    setStatus('generating');
    setResults([]);
    setPublishResults({});

    // Step 1: Generate
    const genRes = await fetch('/api/generate', {
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
    const genData = await genRes.json();
    const generated: GeneratedItem[] = genData.generated || [];
    setResults(generated);

    // Step 2: Auto-publish all
    setStatus('publishing');
    const newResults: Record<string, 'success' | 'failed'> = {};

    await Promise.all(
      generated.map(async (item) => {
        try {
          // Save post to DB
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
          const savedItem = saved.generated?.[0];
          if (!savedItem) { newResults[item.platform] = 'failed'; return; }

          // Create and immediately publish post
          const postRes = await fetch('/api/posts/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: item.platform,
              title: item.title,
              content: item.content,
            }),
          });
          const postData = await postRes.json();
          newResults[item.platform] = postData.success ? 'success' : 'failed';
        } catch {
          newResults[item.platform] = 'failed';
        }
      })
    );

    setPublishResults(newResults);
    setStatus('done');
  }

  function copyContent(item: GeneratedItem) {
    const text = item.title ? `${item.title}\n\n${item.content}` : item.content;
    navigator.clipboard.writeText(text);
    setCopied(item.platform);
    setTimeout(() => setCopied(null), 2000);
  }

  const isRunning = status === 'generating' || status === 'publishing';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">快速生成并发布</h1>
        <p className="text-gray-500 mt-1">AI 生成文案后自动发布到所有选定平台，全程无需操作</p>
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
                  placeholder="e.g. 我的开源工具"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isRunning}
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
                  disabled={isRunning}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">风格</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    disabled={isRunning}
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
                    disabled={isRunning}
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
                      onClick={() => !isRunning && togglePlatform(p)}
                      disabled={isRunning}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors disabled:opacity-50 ${
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

              {/* Progress indicator */}
              {isRunning && (
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <div className="flex items-center gap-2 text-sm text-indigo-700">
                    <RefreshCw size={14} className="animate-spin" />
                    {status === 'generating' ? 'Claude 正在生成内容...' : '自动发布到各平台...'}
                  </div>
                </div>
              )}

              {status === 'done' && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle size={14} />
                    全部完成！内容已自动发布
                  </div>
                </div>
              )}

              <button
                onClick={generateAndPublish}
                disabled={isRunning || !topic.trim() || !selectedPlatforms.length}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {isRunning ? (
                  <><RefreshCw size={16} className="animate-spin" />
                    {status === 'generating' ? '生成中...' : '发布中...'}
                  </>
                ) : (
                  <><Zap size={16} /> AI 生成并自动发布</>
                )}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {status === 'idle' && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <div className="text-center">
                <Zap size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-medium">填写参数后点击"AI 生成并自动发布"</p>
                <p className="text-sm mt-1">一键完成 AI 生成 + 全平台自动发布</p>
              </div>
            </div>
          )}

          {results.map((item) => {
            const pubResult = publishResults[item.platform];
            return (
              <Card key={item.platform} className={
                pubResult === 'success' ? 'border-green-200' :
                pubResult === 'failed' ? 'border-red-200' : ''
              }>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{platformEmoji[item.platform]}</span>
                      <CardTitle>{item.platform}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {pubResult === 'success' && (
                        <Badge variant="success"><CheckCircle size={10} className="mr-1 inline" />已发布</Badge>
                      )}
                      {pubResult === 'failed' && (
                        <Badge variant="danger">发布失败</Badge>
                      )}
                      {!pubResult && status === 'publishing' && (
                        <Badge variant="info"><RefreshCw size={10} className="mr-1 inline animate-spin" />发布中</Badge>
                      )}
                      <button
                        onClick={() => copyContent(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <Copy size={12} />
                        {copied === item.platform ? '已复制!' : '复制'}
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
                  <p className="text-xs text-gray-400 mt-2">{item.content.length} 字符</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
