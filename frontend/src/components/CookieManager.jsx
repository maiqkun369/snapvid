import React, { useState, useEffect } from 'react';

function CookieManager() {
  const [cookies, setCookies] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [platform, setPlatform] = useState('youtube');
  const [cookiesText, setCookiesText] = useState('');
  const [message, setMessage] = useState('');

  const platforms = [
    { id: 'youtube', name: 'YouTube', hint: '需要登录才能下载年龄限制/会员内容' },
    { id: 'youku', name: '优酷', hint: '需要登录下载VIP内容' },
    { id: 'tencent', name: '腾讯视频', hint: '需要登录下载VIP/付费内容' },
    { id: 'iqiyi', name: '爱奇艺', hint: '需要登录下载VIP内容' },
    { id: 'mango', name: '芒果TV', hint: '需要登录下载VIP内容' },
    { id: 'bilibili_vip', name: 'B站大会员', hint: '下载大会员专属/高画质内容' },
  ];

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/cookies');
      if (res.ok) setCookies(await res.json());
    } catch (e) { /* ignore */ }
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
        setMessage('Cookies 保存成功');
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
          {showUpload ? '收起' : '+ 添加'}
        </button>
      </div>

      <p className="text-xs text-white/25 mb-4 leading-relaxed">
        部分平台的视频需要登录后才能下载（如会员内容、年龄限制视频）。
        你可以从浏览器导出 Cookies 粘贴到下方，即可下载对应平台的受限内容。
      </p>

      {/* Status list */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        {cookies.map((c) => (
          <div key={c.platform} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <span className="text-xs text-white/50">
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
        <div className="space-y-3 pt-3 border-t border-white/[0.04]">
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="input-field text-sm">
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>{p.name} - {p.hint}</option>
            ))}
          </select>

          <textarea
            value={cookiesText}
            onChange={(e) => setCookiesText(e.target.value)}
            placeholder={"粘贴 Netscape 格式的 Cookies...\n\n获取方式：\n1. 浏览器安装 \"Get cookies.txt LOCALLY\" 扩展\n2. 登录对应视频平台\n3. 点击扩展导出 Cookies\n4. 粘贴到此处"}
            rows={6}
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
