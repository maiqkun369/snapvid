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

          {/* Method 1: Bookmarklet - easiest */}
          <div className="rounded-xl bg-cyan-500/[0.04] border border-cyan-500/[0.1] p-4">
            <p className="text-xs text-cyan-300/70 font-medium mb-2">方法一：一键书签导入（推荐）</p>
            <ol className="text-[11px] text-white/35 space-y-1.5 mb-3">
              <li>1. 将下方按钮 <strong className="text-white/50">拖拽到浏览器书签栏</strong></li>
              <li>2. 打开目标视频平台网站（如 douyin.com）</li>
              <li>3. 点击书签栏中的「导出Cookies」</li>
              <li>4. Cookies 自动复制到剪贴板，回到此处粘贴即可</li>
            </ol>
            <a
              href={bookmarkletCode}
              onClick={(e) => e.preventDefault()}
              draggable="true"
              className="inline-block px-4 py-2 bg-cyan-500/20 border border-cyan-400/30 rounded-lg
                text-xs text-cyan-300 font-medium cursor-grab active:cursor-grabbing
                hover:bg-cyan-500/30 transition-colors"
            >
              ↗ 导出Cookies（拖我到书签栏）
            </a>
          </div>

          {/* Method 2: Extension guide */}
          <div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-[11px] text-white/30 hover:text-white/50 transition-colors flex items-center gap-1"
            >
              <svg className={`w-3 h-3 transition-transform ${showGuide ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              方法二：浏览器扩展导出
            </button>
            {showGuide && (
              <div className="mt-2 pl-4 text-[11px] text-white/25 space-y-1">
                <p>1. Chrome 安装 <a href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc" target="_blank" className="text-cyan-400/60 underline">Get cookies.txt LOCALLY</a> 扩展</p>
                <p>2. 打开并登录目标平台（如 douyin.com）</p>
                <p>3. 点击扩展图标 → 导出当前网站 Cookies</p>
                <p>4. 粘贴到下方文本框</p>
              </div>
            )}
          </div>

          {/* Platform + paste area */}
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
