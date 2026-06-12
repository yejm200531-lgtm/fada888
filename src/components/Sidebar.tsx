'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Megaphone, Settings, Zap, FileText } from 'lucide-react';

const nav = [
  { href: '/', icon: BarChart3, label: '数据看板' },
  { href: '/campaigns', icon: Megaphone, label: '推广活动' },
  { href: '/generate', icon: Zap, label: '快速生成' },
  { href: '/posts', icon: FileText, label: '帖子管理' },
  { href: '/settings', icon: Settings, label: '平台配置' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-gray-900 min-h-screen flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          <div>
            <div className="text-white font-bold text-sm">AutoPromoter</div>
            <div className="text-gray-400 text-xs">全自动推广系统</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        <div className="text-xs text-gray-500">Powered by Claude AI</div>
      </div>
    </aside>
  );
}
