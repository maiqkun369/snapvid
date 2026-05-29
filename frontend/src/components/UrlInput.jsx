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
    <div className="space-y-4">
      <form onSubmit={handleSubmit}>
        {!batchMode ? (
          <div className="glass-input flex items-center h-[60px] px-4 group">
            {/* Link icon */}
            <div className="flex-shrink-0 mr-3 text-white/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>

            {/* Input */}
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="粘贴视频链接..."
              className="flex-1 bg-transparent border-none outline-none text-white text-base
                placeholder-white/25 h-full"
              disabled={loading}
            />

            {/* Clear button */}
            {url && !loading && (
              <button
                type="button"
                onClick={() => setUrl('')}
                className="flex-shrink-0 mr-3 text-white/20 hover:text-white/50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex-shrink-0 h-10 px-5 rounded-xl font-medium text-sm
                bg-gradient-to-r from-violet-500 to-cyan-400 text-white
                transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/20
                disabled:opacity-30 disabled:hover:shadow-none active:scale-[0.97]"
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
              className="w-full glass-input px-5 py-4 text-white text-sm placeholder-white/25
                focus:outline-none resize-none font-mono rounded-2xl"
              disabled={loading}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/25">
                {batchUrls.split('\n').filter(u => u.trim()).length} 个链接 (最多 10 个)
              </span>
              <button
                type="submit"
                disabled={loading || !batchUrls.trim()}
                className="btn-primary text-sm px-6 py-2.5"
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
          className="text-xs text-white/25 hover:text-white/50 transition-colors flex items-center gap-1.5
            px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={batchMode
                ? "M4 6h16M4 12h16M4 18h16"
                : "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"} />
          </svg>
          {batchMode ? '切换为单链接模式' : '批量下载 (PRO)'}
        </button>
      </div>
    </div>
  );
}

export default UrlInput;
