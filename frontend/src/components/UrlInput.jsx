import React, { useState } from 'react';

function UrlInput({ onParse, onBatchParse, loading }) {
  const [url, setUrl] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (batchMode) {
      const urls = batchUrls.split('\n').map(u => u.trim()).filter(Boolean);
      if (urls.length > 0 && onBatchParse) onBatchParse(urls);
    } else {
      if (url.trim()) onParse(url.trim());
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        {!batchMode ? (
          <div className="relative group">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="粘贴视频链接..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-5 pr-32 py-5
                text-white text-base placeholder-white/25 focus:outline-none focus:border-white/20
                focus:bg-white/[0.06] transition-all duration-300
                group-hover:border-white/[0.12] group-hover:bg-white/[0.05]"
              disabled={loading}
            />
            {url && !loading && (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="absolute right-28 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="absolute right-2.5 top-1/2 -translate-y-1/2
                bg-white text-gray-900 font-medium text-sm
                px-6 py-2.5 rounded-xl transition-all duration-300
                hover:scale-[1.02] hover:shadow-lg hover:shadow-white/5
                disabled:opacity-30 disabled:hover:scale-100 active:scale-95"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  解析中
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  解析
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={batchUrls}
              onChange={(e) => setBatchUrls(e.target.value)}
              placeholder={"粘贴多个视频链接，每行一个...\nhttps://www.bilibili.com/video/BV...\nhttps://www.douyin.com/video/..."}
              rows={5}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-5 py-4
                text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/20
                focus:bg-white/[0.06] transition-all duration-300 resize-none font-mono"
              disabled={loading}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/25">
                {batchUrls.split('\n').filter(u => u.trim()).length} 个链接 (最多 10 个)
              </span>
              <button
                type="submit"
                disabled={loading || !batchUrls.trim()}
                className="bg-white text-gray-900 font-medium text-sm
                  px-6 py-2.5 rounded-xl transition-all duration-300
                  hover:scale-[1.02] disabled:opacity-30 active:scale-95"
              >
                {loading ? '解析中...' : '批量解析'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Mode toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setBatchMode(!batchMode)}
          className="text-[11px] text-white/25 hover:text-white/50 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={batchMode ? "M4 6h16M4 12h16M4 18h16" : "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"} />
          </svg>
          {batchMode ? '切换为单链接模式' : '批量下载 (PRO)'}
        </button>
      </div>
    </div>
  );
}

export default UrlInput;
