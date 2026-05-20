import React, { useState, useMemo } from 'react';

/**
 * Download options panel with format selection and advanced settings.
 * @param {object} props
 * @param {object} props.videoInfo - Video info from API.
 * @param {function} props.onDownload - Callback to start download.
 */
function DownloadOptions({ videoInfo, onDownload }) {
  const [audioOnly, setAudioOnly] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('best');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [subtitles, setSubtitles] = useState('');
  const [playlist, setPlaylist] = useState(false);
  const [rateLimit, setRateLimit] = useState('');

  /**
   * Filter formats into video and audio categories.
   */
  const { videoFormats, audioFormats } = useMemo(() => {
    const formats = videoInfo?.formats || [];
    const video = formats.filter(
      (f) => f.vcodec !== 'none' && f.resolution !== 'audio only'
    );
    const audio = formats.filter(
      (f) => f.vcodec === 'none' || f.resolution === 'audio only'
    );
    return { videoFormats: video, audioFormats: audio };
  }, [videoInfo]);

  /**
   * Format file size for display.
   * @param {number|null} bytes - File size in bytes.
   * @returns {string} Formatted size string.
   */
  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes > 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  /**
   * Handle download button click.
   */
  const handleDownload = () => {
    const options = {
      url: videoInfo._url,
      format_id: audioOnly ? 'best' : selectedFormat,
      audio_only: audioOnly,
      subtitles: subtitles || null,
      playlist,
      rate_limit: rateLimit ? parseFloat(rateLimit) : null,
    };
    onDownload(options);
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-white">下载选项</h3>

      {/* Mode Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setAudioOnly(false)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            !audioOnly
              ? 'bg-primary-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          视频
        </button>
        <button
          onClick={() => setAudioOnly(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            audioOnly
              ? 'bg-primary-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          仅音频 (MP3)
        </button>
      </div>

      {/* Format Selection - Only show for video mode */}
      {!audioOnly && videoFormats.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            画质选择
          </label>
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="input-field"
          >
            <option value="best">最佳画质 (自动)</option>
            {videoFormats.map((fmt) => (
              <option key={fmt.format_id} value={fmt.format_id}>
                {fmt.resolution}
                {fmt.format_note ? ` - ${fmt.format_note}` : ''}
                {fmt.ext ? ` (.${fmt.ext})` : ''}
                {fmt.filesize ? ` [${formatSize(fmt.filesize)}]` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Advanced Options Toggle */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          高级选项
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3 pl-6 border-l-2 border-gray-800">
            {/* Subtitles */}
            {videoInfo.subtitles && videoInfo.subtitles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  下载字幕
                </label>
                <select
                  value={subtitles}
                  onChange={(e) => setSubtitles(e.target.value)}
                  className="input-field"
                >
                  <option value="">不下载字幕</option>
                  {videoInfo.subtitles.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Playlist */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="playlist"
                checked={playlist}
                onChange={(e) => setPlaylist(e.target.checked)}
                className="w-4 h-4 text-primary-600 bg-gray-800 border-gray-700 rounded focus:ring-primary-500"
              />
              <label htmlFor="playlist" className="text-sm text-gray-300">
                下载整个播放列表
              </label>
            </div>

            {/* Rate Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                限速 (MB/s，留空不限速)
              </label>
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                placeholder="例如: 5"
                min="0.1"
                step="0.1"
                className="input-field w-48"
              />
            </div>
          </div>
        )}
      </div>

      {/* Download Button */}
      <button onClick={handleDownload} className="btn-primary w-full flex items-center justify-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        开始下载
      </button>
    </div>
  );
}

export default DownloadOptions;
