'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Pause, Trash2, ChevronRight, Clock, Bot, Zap } from 'lucide-react';
import Link from 'next/link';

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
};

const PLATFORMS = ['reddit', 'twitter', 'hackernews', 'producthunt', 'weibo'];
const TONES = [
  { value: 'engaging', label: '吸引人' },
  { value: 'professional', label: '专业' },
  { value: 'casual', label: '轻松' },
  { value: 'humorous', label: '幽默' },
  { value: 'informative', label: '信息丰富' },
];
const CRON_PRESETS = [
  { label: '每30分钟', value: '*/30 * * * *' },
  { label: '每1小时', value: '0 * * * *' },
  { label: '每3小时', value: '0 */3 * * *' },
  { label: '每6小时', value: '0 */6 * * *' },
  { label: '每天上午9点', value: '0 9 * * *' },
  { label: '每天两次 (9点/18点)', value: '0 9,18 * * *' },
  { label: '每周一上午9点', value: '0 9 * * 1' },
];

const platformEmoji: Record<string, string> = {
  reddit: '🤖', twitter: '🐦', hackernews: '🟠', producthunt: '🚀', weibo: '📱',
};

const defaultForm = {
  name: '',
  topic: '',
  description: '',
  tone: 'engaging',
  language: 'zh',
  platforms: [] as string[],
  schedule_cron: '0 */6 * * *',
  is_active: true,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    const res = await fetch('/api/campaigns');
    setCampaigns(await res.json());
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm(defaultForm);
    await loadCampaigns();
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    await loadCampaigns();
  }

  async function runNow(id: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run_now' }),
    });
    await loadCampaigns();
  }

  async function deleteCampaign(id: string) {
    if (!confirm('确认删除此活动及所有帖子？')) return;
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    await loadCampaigns();
  }

  function togglePlatform(p: string) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">推广活动</h1>
          <p className="text-gray-500 mt-1">创建后全程自动运行，无需人工操作</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <Plus size={16} />
          新建活动
        </button>
      </div>

      {/* How it works */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
        <Bot className="text-indigo-500 shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-indigo-700">
          <strong>全自动工作流：</strong>活动激活 → 立刻发第一批 → 按计划定时重复 → Claude 每次重新生成新内容 → 自动发布到所有平台
          <br />
          <span className="text-indigo-500">全程零人工干预，服务器重启后自动恢复。</span>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="mb-6 border-indigo-200 shadow-md">
          <CardHeader>
            <CardTitle>新建全自动推广活动</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">活动名称 *</label>
                  <input
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 产品发布推广"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">推广主题 *</label>
                  <input
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 我的 AI 写作工具"
                    value={form.topic}
                    onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详细描述（越详细 AI 生成越精准）</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="产品核心功能、目标受众、解决了什么问题、核心价值主张..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI 写作风格</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.tone}
                    onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
                  >
                    {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">语言</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.language}
                    onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                  >
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock size={12} className="inline mr-1" />
                    自动运行频率 *
                  </label>
                  <select
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.schedule_cron}
                    onChange={(e) => setForm((f) => ({ ...f, schedule_cron: e.target.value }))}
                  >
                    {CRON_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">自动发布到哪些平台 *</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        form.platforms.includes(p)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {platformEmoji[p]} {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded accent-green-600 w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm text-green-800 font-medium">
                  创建后立即启动 — 马上发第一批内容，之后按计划自动循环
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving || form.platforms.length === 0 || !form.schedule_cron}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                >
                  {saving ? (
                    <><span className="animate-spin inline-block">⚡</span> 创建并启动中...</>
                  ) : (
                    <><Zap size={14} /> 创建并自动运行</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(defaultForm); }}
                  className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-50 text-sm"
                >
                  取消
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Bot size={56} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">还没有推广活动</p>
          <p className="text-sm mt-1">点击"新建活动"，一次设置，永远自动运行</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <Card key={c.id} className={`hover:shadow-md transition-shadow ${c.is_active ? 'border-green-200' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${c.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{c.name}</h3>
                      <Badge variant={c.is_active ? 'success' : 'default'}>
                        {c.is_active ? '🤖 自动运行中' : '已暂停'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{c.topic}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {c.platforms.map((p) => (
                        <span key={p} className="text-sm text-gray-600">{platformEmoji[p]} {p}</span>
                      ))}
                      {c.schedule_cron && (
                        <span className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-500">
                          <Clock size={11} />
                          {CRON_PRESETS.find((x) => x.value === c.schedule_cron)?.label || c.schedule_cron}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.is_active && (
                      <button
                        onClick={() => runNow(c.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                        title="立刻运行一次"
                      >
                        <Zap size={12} />
                        立刻运行
                      </button>
                    )}
                    <button
                      onClick={() => toggleActive(c.id, c.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        c.is_active
                          ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                      title={c.is_active ? '暂停' : '启动（立刻运行）'}
                    >
                      {c.is_active ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      onClick={() => deleteCampaign(c.id)}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </Link>
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
