import React, { useState, useEffect } from 'react';

function AccountPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('snapvid_token') || '';
      try {
        const res = await fetch(`/api/user/stats?token=${token}`);
        if (res.ok) setStats(await res.json());
      } catch (e) {}
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-center py-12 text-white/30">加载中...</div>;

  const isPro = stats?.plan === 'pro';

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-white/80">我的账户</h2>

      {/* Plan Card */}
      <div className={`p-6 rounded-2xl border ${isPro ? 'bg-purple-500/[0.06] border-purple-500/20' : 'bg-white/[0.03] border-white/[0.08]'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-white/40">当前方案</p>
            <p className="text-2xl font-semibold text-white/90 mt-1">
              {isPro ? 'Pro 会员' : '免费版'}
            </p>
          </div>
          {isPro && (
            <span className="text-3xl">👑</span>
          )}
        </div>
        {!isPro && (
          <button className="w-full mt-3 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-sm font-semibold text-white
            hover:opacity-90 transition-opacity">
            升级 Pro · ¥29/月
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] text-center">
          <p className="text-2xl font-semibold text-white/80">{stats?.downloads_today || 0}</p>
          <p className="text-xs text-white/30 mt-1">今日下载</p>
        </div>
        <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] text-center">
          <p className="text-2xl font-semibold text-white/80">{stats?.downloads_total || 0}</p>
          <p className="text-xs text-white/30 mt-1">总下载量</p>
        </div>
        <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] text-center">
          <p className="text-2xl font-semibold text-white/80">
            {isPro ? '∞' : `${stats?.daily_remaining || 0}/${stats?.daily_limit || 3}`}
          </p>
          <p className="text-xs text-white/30 mt-1">今日配额</p>
        </div>
        <div className="p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] text-center">
          <p className="text-2xl font-semibold text-white/80">{stats?.max_resolution || '1080p'}</p>
          <p className="text-xs text-white/30 mt-1">最高画质</p>
        </div>
      </div>

      {/* Account Info */}
      <div className="p-5 bg-white/[0.02] rounded-xl border border-white/[0.05] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/40">手机号</span>
          <span className="text-sm text-white/60">{stats?.phone || '--'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/40">注册时间</span>
          <span className="text-sm text-white/60">{stats?.member_since?.split('T')[0] || '--'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/40">会员等级</span>
          <span className={`text-sm ${isPro ? 'text-purple-300' : 'text-white/60'}`}>
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default AccountPanel;
