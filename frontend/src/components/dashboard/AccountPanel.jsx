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
      <h2 className="text-lg font-semibold text-white/80">我的账户</h2>

      {/* Plan Card — Glass with gradient accent */}
      <div className={`glass rounded-[24px] p-6 ${isPro ? 'border-violet-500/20 bg-violet-500/[0.04]' : ''}`}>
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
          <button className="w-full mt-3 py-3.5 rounded-2xl text-sm font-semibold text-white
            bg-gradient-to-r from-violet-500 to-cyan-500
            hover:opacity-90 transition-all active:scale-[0.98]">
            升级 Pro · ¥29/月
          </button>
        )}
      </div>

      {/* Stats Grid — Glass cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-white/80">{stats?.downloads_today || 0}</p>
          <p className="text-xs text-white/30 mt-1">今日下载</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-white/80">{stats?.downloads_total || 0}</p>
          <p className="text-xs text-white/30 mt-1">总下载量</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-white/80">
            {isPro ? '∞' : `${stats?.daily_remaining || 0}/${stats?.daily_limit || 3}`}
          </p>
          <p className="text-xs text-white/30 mt-1">今日配额</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold text-white/80">{stats?.max_resolution || '1080p'}</p>
          <p className="text-xs text-white/30 mt-1">最高画质</p>
        </div>
      </div>

      {/* Account Info — Glass card */}
      <div className="glass rounded-2xl p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/40">手机号</span>
          <span className="text-sm text-white/60">{stats?.phone || '--'}</span>
        </div>
        <div className="h-[1px] bg-white/[0.04]" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/40">注册时间</span>
          <span className="text-sm text-white/60">{stats?.member_since?.split('T')[0] || '--'}</span>
        </div>
        <div className="h-[1px] bg-white/[0.04]" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/40">会员等级</span>
          <span className={`text-sm ${isPro ? 'text-violet-300' : 'text-white/60'}`}>
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>
      </div>

      {/* Invite Section — Glass card */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm text-white/60 font-medium">邀请好友</h3>
        <p className="text-xs text-white/30">邀请好友注册，双方各得 7 天 Pro 会员</p>
        <InviteSection />
      </div>
    </div>
  );
}

function InviteSection() {
  const [code, setCode] = useState('');
  const [stats, setStats] = useState(null);
  const [inputCode, setInputCode] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('snapvid_token') || '';
    fetch(`/api/invite/code?token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCode(d.invite_code); });
    fetch(`/api/invite/stats?token=${token}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); });
  }, []);

  const handleUseCode = async () => {
    const token = localStorage.getItem('snapvid_token') || '';
    try {
      const res = await fetch(`/api/invite/use?token=${token}&code=${inputCode}`, { method: 'POST' });
      const data = await res.json();
      setMessage(data.message || data.detail || '');
    } catch (e) { setMessage('失败'); }
  };

  return (
    <div className="space-y-3">
      {code && (
        <div className="flex items-center gap-3">
          <code className="flex-1 px-4 py-2.5 bg-white/[0.05] rounded-xl text-sm text-cyan-300 font-mono
            border border-white/[0.06]">{code}</code>
          <button onClick={() => { navigator.clipboard.writeText(code); setMessage('已复制'); }}
            className="btn-secondary text-xs px-3 py-2">
            复制
          </button>
        </div>
      )}
      {stats && (
        <p className="text-xs text-white/30">
          已邀请 {stats.successful_invites} 人 · 累计获得 {stats.earned_days} 天 Pro
        </p>
      )}
      <div className="flex items-center gap-2">
        <input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value)}
          placeholder="输入好友邀请码"
          className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm
            text-white/70 focus:outline-none focus:border-white/[0.2] transition-all" />
        <button onClick={handleUseCode} disabled={!inputCode}
          className="btn-primary text-xs px-4 py-2.5 disabled:opacity-30">
          使用
        </button>
      </div>
      {message && <p className="text-xs text-emerald-400/70">{message}</p>}
    </div>
  );
}

export default AccountPanel;
