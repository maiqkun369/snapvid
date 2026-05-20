import React, { useState } from 'react';

function UrlInput({ onParse, loading }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onParse(url.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative group">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste video URL here..."
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-5 pr-32 py-5
            text-white text-base placeholder-white/25 focus:outline-none focus:border-white/20
            focus:bg-white/[0.06] transition-all duration-400
            group-hover:border-white/12 group-hover:bg-white/[0.05]"
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
            disabled:opacity-30 disabled:hover:scale-100
            active:scale-95"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Parsing
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              Parse
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          )}
        </button>
      </div>
    </form>
  );
}

export default UrlInput;
