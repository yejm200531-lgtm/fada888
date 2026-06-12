'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Check, AlertCircle } from 'lucide-react';

type Platform = {
  id: string;
  name: string;
  icon: string;
  fields: string[];
  is_enabled: boolean;
  has_config: boolean;
};

export default function SettingsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlatforms();
  }, []);

  async function loadPlatforms() {
    const res = await fetch('/api/platforms');
    setPlatforms(await res.json());
    setLoading(false);
  }

  function startEdit(platform: Platform) {
    setEditing(platform.id);
    setFormData({});
  }

  async function savePlatform(platformId: string, is_enabled: boolean) {
    setSaving(true);
    await fetch('/api/platforms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: platformId,
        config: formData,
        is_enabled,
      }),
    });
    setEditing(null);
    setFormData({});
    await loadPlatforms();
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">平台配置</h1>
        <p className="text-gray-500 mt-1">配置各平台 API 密钥以启用真实发布</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
        <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-blue-700">
          <strong>模拟模式：</strong>未配置 API 的平台将使用模拟发布，生成假的帖子 ID。
          配置真实 API 后即可在对应平台实际发帖。所有密钥仅存储在本地数据库中。
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platforms.map((platform) => (
          <Card key={platform.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <CardTitle>{platform.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {platform.is_enabled ? (
                        <Badge variant="success">
                          <Check size={10} className="mr-1 inline" />已启用
                        </Badge>
                      ) : (
                        <Badge variant="default">未启用</Badge>
                      )}
                      {platform.has_config && (
                        <Badge variant="info">已配置</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => editing === platform.id ? setEditing(null) : startEdit(platform)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Settings size={14} />
                  {editing === platform.id ? '取消' : '配置'}
                </button>
              </div>
            </CardHeader>

            {editing === platform.id && (
              <CardContent>
                <div className="space-y-3">
                  {platform.fields.map((field) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                        {field}
                      </label>
                      <input
                        type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('password') ? 'password' : 'text'}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={`输入 ${field}`}
                        value={formData[field] || ''}
                        onChange={(e) => setFormData((d) => ({ ...d, [field]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => savePlatform(platform.id, true)}
                      disabled={saving}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? '保存中...' : '保存并启用'}
                    </button>
                    <button
                      onClick={() => savePlatform(platform.id, false)}
                      disabled={saving}
                      className="px-4 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                    >
                      仅保存
                    </button>
                  </div>
                </div>

                {/* Platform-specific hints */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
                  {platform.id === 'reddit' && (
                    <>
                      <p>1. 前往 reddit.com/prefs/apps 创建应用</p>
                      <p>2. 选择 "script" 类型</p>
                      <p>3. 填入 client ID、secret 及账号密码</p>
                    </>
                  )}
                  {platform.id === 'twitter' && (
                    <>
                      <p>1. 前往 developer.twitter.com 创建项目</p>
                      <p>2. 开启读写权限</p>
                      <p>3. 生成 Access Token</p>
                    </>
                  )}
                  {platform.id === 'weibo' && (
                    <p>前往 open.weibo.com 申请开发者权限获取 Access Token</p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>AI 配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-gray-900">Claude API</p>
              <p className="text-xs text-gray-500">
                通过环境变量 <code className="bg-white px-1 rounded border text-indigo-600">ANTHROPIC_API_KEY</code> 配置
              </p>
            </div>
            <Badge variant={process.env.NEXT_PUBLIC_HAS_CLAUDE === 'true' ? 'success' : 'warning'} >
              {process.env.ANTHROPIC_API_KEY ? '已配置' : '检查 .env'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
