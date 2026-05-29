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

  if (loading) return <div className="text-center py-12 text-[#4A4A4A] font-medium">加载中...</div>;

  const isPro = stats?.plan === 'pro';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-extrabold text-[#1D1C1C]">我的账户</h2>

      {/* Plan Card */}
      <div className={`p-6 rounded-lg border border-[#1D1C1C] ${isPro ? 'bg-[#FFF48D]' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-[#4A4A4A]">当前方案</p>
            <p className="text-2xl font-extrabold text-[#1D1C1C] mt-1">
              {isPro ? 'Pro 会员' : '免费版'}
            </p>
          </div>
        </div>
        {!isPro && (
          <button className="w-full mt-3 py-3.5 rounded-full text-sm font-bold text-white
            bg-[#1D1C1C] hover:bg-[#333] transition-all active:scale-[0.97]">
            升级 Pro
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#1D1C1C] rounded-lg p-4 text-center">
          <p className="text-2xl font-extrabold text-[#1D1C1C]">{stats?.downloads_today || 0}</p>
          <p className="text-sm font-medium text-[#4A4A4A] mt-1">今日下载</p>
        </div>
        <div className="bg-white border border-[#1D1C1C] rounded-lg p-4 text-center">
          <p className="text-2xl font-extrabold text-[#1D1C1C]">{stats?.downloads_total || 0}</p>
          <p className="text-sm font-medium text-[#4A4A4A] mt-1">总下载量</p>
        </div>
        <div className="bg-white border border-[#1D1C1C] rounded-lg p-4 text-center">
          <p className="text-2xl font-extrabold text-[#1D1C1C]">
            {isPro ? '无限' : `${stats?.daily_remaining || 0}/${stats?.daily_limit || 3}`}
          </p>
          <p className="text-sm font-medium text-[#4A4A4A] mt-1">今日配额</p>
        </div>
        <div className="bg-white border border-[#1D1C1C] rounded-lg p-4 text-center">
          <p className="text-2xl font-extrabold text-[#1D1C1C]">{stats?.max_resolution || '1080p'}</p>
          <p className="text-sm font-medium text-[#4A4A4A] mt-1">最高画质</p>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white border border-[#1D1C1C] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#4A4A4A]">手机号</span>
          <span className="text-sm font-bold text-[#1D1C1C]">{stats?.phone || '--'}</span>
        </div>
        <div className="h-[1px] bg-gray-200" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#4A4A4A]">注册时间</span>
          <span className="text-sm font-bold text-[#1D1C1C]">{stats?.member_since?.split('T')[0] || '--'}</span>
        </div>
        <div className="h-[1px] bg-gray-200" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#4A4A4A]">会员等级</span>
          <span className={`text-sm font-bold ${isPro ? 'text-[#CC0066]' : 'text-[#1D1C1C]'}`}>
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>
      </div>

      {/* Invite Section */}
      <div className="bg-white border border-[#1D1C1C] rounded-lg p-5 space-y-4">
        <h3 className="text-base font-bold text-[#1D1C1C]">邀请好友</h3>
        <p className="text-sm text-[#4A4A4A]">邀请好友注册，双方各得 7 天 Pro 会员</p>
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
          <code className="flex-1 px-4 py-2.5 bg-[#FFF48D] rounded-full text-sm text-[#1D1C1C] font-bold font-mono
            border border-[#1D1C1C]">{code}</code>
          <button onClick={() => { navigator.clipboard.writeText(code); setMessage('已复制'); }}
            className="px-4 py-2.5 rounded-full border border-[#1D1C1C] text-sm font-bold text-[#1D1C1C] hover:bg-gray-100 transition-all">
            复制
          </button>
        </div>
      )}
      {stats && (
        <p className="text-sm text-[#4A4A4A] font-medium">
          已邀请 {stats.successful_invites} 人 · 累计获得 {stats.earned_days} 天 Pro
        </p>
      )}
      <div className="flex items-center gap-2">
        <input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value)}
          placeholder="输入好友邀请码"
          className="flex-1 border border-[#1D1C1C] rounded-full px-4 py-2.5 text-sm font-medium
            text-[#1D1C1C] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFF48D]" />
        <button onClick={handleUseCode} disabled={!inputCode}
          className="px-5 py-2.5 rounded-full bg-[#1D1C1C] text-white text-sm font-bold disabled:opacity-30 hover:bg-[#333] transition-all">
          使用
        </button>
      </div>
      {message && <p className="text-sm font-bold text-[#83f582]">{message}</p>}
    </div>
  );
}

export default AccountPanel;
