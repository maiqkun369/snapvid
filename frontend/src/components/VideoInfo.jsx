import React from 'react';

/**
 * Video information display card.
 * Note: In the new design, this is used as a standalone fallback.
 * The main page uses inline video info in a combined card.
 */
function VideoInfo({ info }) {
  if (!info) return null;

  return (
    <div className="glass-strong p-6 rounded-[24px]">
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Thumbnail */}
        {info.thumbnail && (
          <div className="flex-shrink-0">
            <img
              src={info.thumbnail}
              alt={info.title}
              className="w-full sm:w-44 h-auto rounded-xl object-cover bg-white/[0.03]"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white/90 truncate" title={info.title}>
            {info.title}
          </h3>
          <div className="mt-3 space-y-2">
            {info.uploader && (
              <p className="text-sm text-white/50 flex items-center gap-2">
                <span className="text-white/30">作者</span> {info.uploader}
              </p>
            )}
            {info.duration_string && (
              <p className="text-sm text-white/50 flex items-center gap-2">
                <span className="text-white/30">时长</span> {info.duration_string}
              </p>
            )}
            {info.platform && (
              <p className="text-sm text-white/50 flex items-center gap-2">
                <span className="text-white/30">平台</span> {info.platform}
              </p>
            )}
            <p className="text-sm text-white/40 flex items-center gap-2">
              <span className="text-white/30">格式</span> {info.formats?.length || 0} 个可用
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoInfo;
