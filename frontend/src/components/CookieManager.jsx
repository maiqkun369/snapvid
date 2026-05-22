import React, { useState, useEffect } from 'react';

function CookieManager() {
  const [cookies, setCookies] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [platform, setPlatform] = useState('douyin');
  const [cookiesText, setCookiesText] = useState('');
  const [message, setMessage] = useState('');

  const platforms = [
    { id: 'douyin', name: '抖音', hint: '抖音视频需要Cookies才能解析' },
    { id: 'youtube', name: 'YouTube', hint: '需要Cookies下载限制内容' },
    { id: 'youku', name: '优酷', hint: '需要登录下载VIP内容' },
    { id: 'tencent', name: '腾讯视频', hint: '需要登录下载VIP/付费内容' },
    { id: 'iqiyi', name: '爱奇艺', hint: '需要登录下载VIP内容' },
    { id: 'mango', name: '芒果TV', hint: '需要登录下载VIP内容' },
    { id: 'bilibili_vip', name: 'B站大会员', hint: '下载大会员专属内容' },
  ];

  // Bookmarklet JS code - user drags this to bookmarks bar
  const bookmarkletCode = `javascript:void((function(){var d=document.cookie.split(';').map(function(c){var p=c.trim().split('=');return'.'+location.hostname+'\\tTRUE\\t/\\tFALSE\\t0\\t'+p[0]+'\\t'+p.slice(1).join('=')}).join('\\n');var t='# Netscape HTTP Cookie File\\n'+d;navigator.clipboard.writeText(t).then(function(){alert('Cookies copied! Paste into SnapVid.')}).catch(function(){prompt('Copy below:',t)})})())`;

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/cookies');
      if (res.ok) setCookies(await res.json());
    } catch (e) {}
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleUpload = async () => {
    setMessage('');
    try {
      const res = await fetch('/api/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, cookies_text: cookiesText }),
      });
      if (res.ok) {
        setMessage('Cookies saved!');
        setCookiesText('');
        setShowUpload(false);
        fetchStatus();
      } else {
        const err = await res.json();
        setMessage(err.detail || '保存失败');
      }
    } catch (e) {
      setMessage('网络错误');
    }
  };

  const handleDelete = async (p) => {
    await fetch(`/api/cookies/${p}`, { method: 'DELETE' });
    fetchStatus();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-white/30 tracking-widest uppercase">Account & Cookies</p>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-xs text-cyan-400/70 hover:text-cyan-300 transition-colors"
        >
          {showUpload ? '收起' : '+ 导入'}
        </button>
      </div>

      <p className="text-xs text-white/25 mb-4 leading-relaxed">
        部分平台（如抖音）需要浏览器 Cookies 才能解析视频。可通过下方两种方式快速导入。
      </p>

      {/* Status list */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {cookies.map((c) => (
          <div key={c.platform} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[11px] text-white/50">
              {platforms.find(p => p.id === c.platform)?.name || c.platform}
            </span>
            {c.has_cookies ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <button onClick={() => handleDelete(c.platform)} className="text-[10px] text-white/20 hover:text-red-400 transition-colors ml-1">x</button>
              </div>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
            )}
          </div>
        ))}
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="space-y-4 pt-4 border-t border-white/[0.04]">

          {/* Primary: Browser Extension — Best UX */}
          <div className="rounded-xl bg-cyan-500/[0.06] border border-cyan-500/[0.15] p-5">
            <p className="text-sm text-cyan-300/90 font-medium mb-2">推荐方式：浏览器扩展一键同步</p>
            <p className="text-xs text-white/40 mb-4 leading-relaxed">
              安装 SnapVid 专属扩展后，只需在浏览器中登录目标平台，点击扩展即可一键同步 Cookies。支持所有平台，含 httpOnly cookies。
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold">1</span>
                <span className="text-xs text-white/50">安装扩展：Chrome → 设置 → 扩展 → 开发者模式 → 加载已解压扩展 → 选择 <code className="text-cyan-300/60">extension/</code> 文件夹</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold">2</span>
                <span className="text-xs text-white/50">在浏览器中打开目标平台并登录（如果已经登录过则跳过）</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold">3</span>
                <span className="text-xs text-white/50">点击扩展图标 → 点击对应平台 → 自动同步完成 ✅</span>
              </div>
            </div>

            {/* Quick login links */}
            <div className="mt-4 pt-3 border-t border-cyan-500/[0.1]">
              <p className="text-xs text-white/30 mb-2">快捷登录（点击后在新窗口登录，然后用扩展同步）：</p>
              <div className="flex flex-wrap gap-2">
                {platforms.map(p => (
                  <a key={p.id} href={
                    p.id === 'douyin' ? 'https://www.douyin.com' :
                    p.id === 'youtube' ? 'https://accounts.google.com/ServiceLogin?service=youtube' :
                    p.id === 'bilibili_vip' ? 'https://passport.bilibili.com/login' :
                    p.id === 'youku' ? 'https://www.youku.com' :
                    p.id === 'tencent' ? 'https://v.qq.com' :
                    p.id === 'iqiyi' ? 'https://www.iqiyi.com' :
                    'https://www.mgtv.com'
                  } target="_blank" rel="noopener"
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/50
                      hover:bg-white/[0.08] hover:text-white/70 transition-all"
                  >
                    {p.name} →
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Alternative: Manual paste */}
          <div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-white/30 hover:text-white/50 transition-colors flex items-center gap-1"
            >
              <svg className={`w-3 h-3 transition-transform ${showGuide ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              其他方式：手动粘贴 Cookies
            </button>
            {showGuide && (
              <div className="mt-3 space-y-3 pl-4 border-l border-white/[0.06]">
                <p className="text-xs text-white/25">使用 Chrome 扩展 「Get cookies.txt LOCALLY」导出后粘贴到下方</p>
              </div>
            )}
          </div>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="input-field text-sm">
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>{p.name} - {p.hint}</option>
            ))}
          </select>

          <textarea
            value={cookiesText}
            onChange={(e) => setCookiesText(e.target.value)}
            placeholder="粘贴 Cookies 内容..."
            rows={4}
            className="input-field text-xs font-mono leading-relaxed"
          />

          <div className="flex items-center gap-3">
            <button onClick={handleUpload} disabled={!cookiesText.trim()}
              className="px-4 py-2 bg-white text-gray-900 text-xs font-medium rounded-lg
                transition-all duration-200 hover:scale-[1.02] disabled:opacity-30">
              保存 Cookies
            </button>
            {message && <span className="text-xs text-emerald-400/70">{message}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default CookieManager;
