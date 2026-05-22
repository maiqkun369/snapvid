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

          {/* Method 0: One-line terminal command — the EASIEST */}
          <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.15] p-5">
            <p className="text-sm text-emerald-300/90 font-medium mb-3">最简方式：终端一行命令</p>
            <p className="text-xs text-white/40 mb-3">
              在你的电脑上打开终端（Terminal），粘贴运行以下命令，即可自动从 Chrome 提取 Cookies 并上传：
            </p>
            <div className="relative">
              <pre className="bg-black/40 rounded-lg p-3 text-[11px] text-green-300/80 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
{`yt-dlp --cookies-from-browser chrome --cookies /tmp/cookies.txt --skip-download "https://www.douyin.com/" 2>/dev/null; curl -X POST http://localhost:9090/api/cookies -H "Content-Type: application/json" -d "{\\"platform\\":\\"${platform}\\",\\"cookies_text\\":\\"$(cat /tmp/cookies.txt | sed 's/"/\\\\"/g' | tr '\\n' '\\\\n')\\"}" && echo " ✅ Done!"`}
              </pre>
              <button
                onClick={() => {
                  const cmd = `yt-dlp --cookies-from-browser chrome --cookies /tmp/cookies.txt --skip-download "https://www.douyin.com/" 2>/dev/null; curl -X POST http://localhost:9090/api/cookies -H "Content-Type: application/json" -d '{"platform":"${platform}","cookies_text":"'$(cat /tmp/cookies.txt | base64)'"}'`;
                  navigator.clipboard.writeText(
                    `yt-dlp --cookies-from-browser chrome --cookies /tmp/cookies.txt --skip-download "https://www.douyin.com/" 2>/dev/null && curl -s -X POST http://localhost:9090/api/cookies -H "Content-Type: application/json" -d "$(python3 -c "import json; print(json.dumps({'platform':'${platform}','cookies_text':open('/tmp/cookies.txt').read()}))")" && echo "✅ Cookies uploaded!"`
                  );
                  setMessage('命令已复制到剪贴板！');
                }}
                className="absolute top-2 right-2 text-[10px] bg-white/10 hover:bg-white/20 text-white/50 px-2 py-1 rounded transition-colors"
              >
                复制
              </button>
            </div>
            <p className="text-[11px] text-white/25 mt-2">
              要求：电脑已安装 yt-dlp（<code className="text-white/40">pip install yt-dlp</code>）且 Chrome 浏览器曾访问过抖音
            </p>

            {/* Auto-extract button (for non-Docker setups) */}
            <button
              onClick={async () => {
                setMessage('正在尝试自动提取...');
                try {
                  const res = await fetch(`/api/cookies/auto-extract?platform=${platform}`, { method: 'POST' });
                  const data = await res.json();
                  setMessage(data.message);
                  if (data.success) fetchStatus();
                } catch (e) { setMessage('提取失败'); }
              }}
              className="mt-3 px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-lg
                text-xs text-emerald-300 font-medium transition-all hover:bg-emerald-500/30"
            >
              🔄 尝试自动提取（服务器端）
            </button>
          </div>

          {/* Method 1: Bookmarklet */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <p className="text-xs text-white/50 font-medium mb-2">备选方法：书签脚本</p>
            <p className="text-[11px] text-white/25 mb-2">（注意：此方法对抖音可能无效，因为拿不到 httpOnly cookies）</p>
            <a
              href={bookmarkletCode}
              onClick={(e) => e.preventDefault()}
              draggable="true"
              className="inline-block px-3 py-1.5 bg-white/[0.06] border border-white/[0.1] rounded-lg
                text-[11px] text-white/40 cursor-grab active:cursor-grabbing
                hover:bg-white/[0.1] transition-colors"
            >
              ↗ 导出Cookies（拖到书签栏）
            </a>
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
