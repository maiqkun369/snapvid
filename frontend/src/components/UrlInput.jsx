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
          <div className="flex items-center h-[64px] bg-white border-2 border-[#1D1C1C] rounded-full px-5 shadow-[4px_4px_0_0_#1D1C1C] transition-all hover:shadow-[6px_6px_0_0_#1D1C1C]">
            {/* Link icon */}
            <div className="flex-shrink-0 mr-3 text-[#6B6B6B]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>

            {/* Input */}
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="粘贴视频链接..."
              className="flex-1 bg-transparent border-none outline-none text-[#1D1C1C] text-base font-medium
                placeholder-gray-400 h-full"
              disabled={loading}
            />

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="ml-3 px-6 py-2.5 rounded-full bg-[#CC0066] text-white font-bold text-sm
                transition-all duration-200 hover:bg-[#FF1A80] disabled:opacity-40
                disabled:cursor-not-allowed active:scale-[0.95]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  解析中
                </span>
              ) : '解析 →'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={batchUrls}
              onChange={(e) => setBatchUrls(e.target.value)}
              placeholder="每行一个视频链接..."
              rows={5}
              className="w-full bg-white border-2 border-[#1D1C1C] rounded-2xl px-5 py-4
                text-[#1D1C1C] text-base font-medium placeholder-gray-400
                focus:outline-none focus:border-[#CC0066] shadow-[4px_4px_0_0_#1D1C1C] resize-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !batchUrls.trim()}
              className="btn-accent w-full"
            >
              {loading ? '批量解析中...' : `批量解析 (${batchUrls.split('\n').filter(u => u.trim()).length} 条)`}
            </button>
          </div>
        )}
      </form>

      {/* Mode toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setBatchMode(!batchMode)}
          className="text-sm font-semibold text-[#6B6B6B] hover:text-[#CC0066] transition-colors"
        >
          {batchMode ? '← 单个链接模式' : '批量下载模式 →'}
        </button>
      </div>
    </div>
  );
}

export default UrlInput;
