import React from 'react';

/**
 * Video information display card.
 * @param {object} props
 * @param {object} props.info - Video info response from API.
 */
function VideoInfo({ info }) {
  if (!info) return null;

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Thumbnail */}
        {info.thumbnail && (
          <div className="flex-shrink-0">
            <img
              src={info.thumbnail}
              alt={info.title}
              className="w-full sm:w-48 h-auto rounded-lg object-cover bg-gray-800"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate" title={info.title}>
            {info.title}
          </h3>
          <div className="mt-2 space-y-1.5">
            {info.uploader && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{info.uploader}</span>
              </div>
            )}
            {info.duration_string && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{info.duration_string}</span>
              </div>
            )}
            {info.platform && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>{info.platform}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m0 2v2m0-2h10m4 10v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6m18 0V8a2 2 0 00-2-2H5a2 2 0 00-2 2v6m18 0H3" />
              </svg>
              <span>{info.formats?.length || 0} 个可用格式</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoInfo;
