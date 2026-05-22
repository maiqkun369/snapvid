import React, { useState, useEffect } from 'react';

function CookieManager() {
  const [accounts, setAccounts] = useState([]);
  const [showConnect, setShowConnect] = useState(false);
  const [platform, setPlatform] = useState('douyin');
  const [message, setMessage] = useState('');

  const platforms = [
    { id: 'douyin', name: '抖音', loginUrl: 'https://www.douyin.com', icon: '🎵' },
    { id: 'youtube', name: 'YouTube', loginUrl: 'https://www.youtube.com', icon: '▶️' },
    { id: 'bilibili_vip', name: 'B站', loginUrl: 'https://passport.bilibili.com/login', icon: '📺' },
    { id: 'youku', name: '优酷', loginUrl: 'https://www.youku.com', icon: '🎬' },
    { id: 'tencent', name: '腾讯视频', loginUrl: 'https://v.qq.com', icon: '🎥' },
    { id: 'iqiyi', name: '爱奇艺', loginUrl: 'https://www.iqiyi.com', icon: '🎞️' },
    { id: 'mango', name: '芒果TV', loginUrl: 'https://www.mgtv.com', icon: '🥭' },
  ];

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/cookies');
      if (res.ok) setAccounts(await res.json());
    } catch (e) {}
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleDisconnect = async (p) => {
    await fetch(`/api/cookies/${p}`, { method: 'DELETE' });
    fetchStatus();
    setMessage('');
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-white/70">平台账号</p>
          <p className="text-xs text-white/30 mt-1">连接平台账号后可下载会员/登录内容</p>
        </div>
        <button
          onClick={() => setShowConnect(!showConnect)}
          className="text-xs text-cyan-400/70 hover:text-cyan-300 transition-colors"
        >
          {showConnect ? '收起' : '+ 连接账号'}
        </button>
      </div>

      {/* Connected accounts status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {accounts.map((c) => {
          const p = platforms.find(p => p.id === c.platform);
          return (
            <div key={c.platform} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${
              c.has_cookies
                ? 'bg-emerald-500/[0.05] border-emerald-500/20'
                : 'bg-white/[0.02] border-white/[0.06]'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{p?.icon || '🔗'}</span>
                <span className="text-xs text-white/60">{p?.name || c.platform}</span>
              </div>
              {c.has_cookies ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <button onClick={() => handleDisconnect(c.platform)}
                    className="text-xs text-white/20 hover:text-red-400 transition-colors ml-1">×</button>
                </div>
              ) : (
                <span className="text-xs text-white/20">未连接</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Connection panel */}
      {showConnect && (
        <div className="space-y-4 pt-4 border-t border-white/[0.06]">
          <div className="rounded-xl bg-cyan-500/[0.04] border border-cyan-500/[0.1] p-5">
            <p className="text-sm text-white/70 font-medium mb-3">如何连接平台账号</p>
            <p className="text-xs text-white/40 mb-4 leading-relaxed">
              安装我们的浏览器助手后，您只需正常登录各平台，助手会自动完成账号连接。全程不需要输入密码给本工具。
            </p>

            {/* Steps */}
            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mt-0.5">1</span>
                <div>
                  <p className="text-xs text-white/60">安装浏览器助手</p>
                  <p className="text-xs text-white/30 mt-0.5">Chrome → 扩展管理 → 开发者模式 → 加载 <code className="text-cyan-300/50">extension/</code> 文件夹</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mt-0.5">2</span>
                <div>
                  <p className="text-xs text-white/60">登录目标平台</p>
                  <p className="text-xs text-white/30 mt-0.5">点击下方按钮跳转登录（如已登录可跳过）</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mt-0.5">3</span>
                <div>
                  <p className="text-xs text-white/60">点击助手同步</p>
                  <p className="text-xs text-white/30 mt-0.5">点击浏览器工具栏的助手图标 → 选择平台 → 完成</p>
                </div>
              </div>
            </div>

            {/* Quick login links */}
            <p className="text-xs text-white/30 mb-2">快捷登录：</p>
            <div className="flex flex-wrap gap-2">
              {platforms.map(p => (
                <a key={p.id} href={p.loginUrl} target="_blank" rel="noopener"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/50
                    hover:bg-white/[0.08] hover:text-white/70 transition-all"
                >
                  <span>{p.icon}</span> {p.name}
                </a>
              ))}
            </div>
          </div>

          {message && <p className="text-xs text-emerald-400/70 text-center">{message}</p>}
        </div>
      )}
    </div>
  );
}

export default CookieManager;
