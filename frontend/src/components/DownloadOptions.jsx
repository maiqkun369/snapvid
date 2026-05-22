import React, { useState, useMemo } from 'react';

function DownloadOptions({ videoInfo, onDownload }) {
  const [audioOnly, setAudioOnly] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('best');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [subtitles, setSubtitles] = useState('');
  const [embedSubtitles, setEmbedSubtitles] = useState(false);
  const [playlist, setPlaylist] = useState(false);
  const [playlistRange, setPlaylistRange] = useState('');
  const [rateLimit, setRateLimit] = useState('');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioQuality, setAudioQuality] = useState('192');
  const [embedThumbnail, setEmbedThumbnail] = useState(true);
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [splitChapters, setSplitChapters] = useState(false);
  const [sponsorBlock, setSponsorBlock] = useState(false);
  const [outputFormat, setOutputFormat] = useState('mp4');
  const [proxy, setProxy] = useState('');
  // New features
  const [concurrentFragments, setConcurrentFragments] = useState(1);
  const [downloadSections, setDownloadSections] = useState('');
  const [outputTemplate, setOutputTemplate] = useState('');
  const [remuxFormat, setRemuxFormat] = useState('');
  // Roadmap features
  const [writeComments, setWriteComments] = useState(false);
  const [useArchive, setUseArchive] = useState(true);
  const [safeMode, setSafeMode] = useState(false);
  const [playlistRandom, setPlaylistRandom] = useState(false);
  const [filterDurationMin, setFilterDurationMin] = useState('');
  const [filterDurationMax, setFilterDurationMax] = useState('');
  const [maxFilesize, setMaxFilesize] = useState('');
  const [minFilesize, setMinFilesize] = useState('');
  const [dateAfter, setDateAfter] = useState('');
  const [dateBefore, setDateBefore] = useState('');
  const [formatSort, setFormatSort] = useState('');
  const [geoBypassCountry, setGeoBypassCountry] = useState('');
  const [convertSubsFormat, setConvertSubsFormat] = useState('');
  const [convertThumbnailFormat, setConvertThumbnailFormat] = useState('');

  const { videoFormats, audioFormats } = useMemo(() => {
    const formats = videoInfo?.formats || [];
    const video = formats.filter(f => f.vcodec !== 'none' && f.resolution !== 'audio only');
    const audio = formats.filter(f => f.vcodec === 'none' || f.resolution === 'audio only');
    return { videoFormats: video, audioFormats: audio };
  }, [videoInfo]);

  const isYouTube = videoInfo?.platform?.toLowerCase().includes('youtube');
  const hasChapters = videoInfo?.chapters && videoInfo.chapters.length > 0;

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const handleDownload = (thumbnailOnly = false) => {
    onDownload({
      url: videoInfo._url,
      format_id: audioOnly ? 'best' : selectedFormat,
      audio_only: audioOnly,
      audio_format: audioFormat,
      audio_quality: audioQuality,
      subtitles: subtitles || null,
      embed_subtitles: embedSubtitles,
      playlist,
      playlist_range: playlistRange || null,
      rate_limit: rateLimit ? parseFloat(rateLimit) : null,
      embed_thumbnail: embedThumbnail,
      embed_metadata: embedMetadata,
      split_chapters: splitChapters,
      sponsor_block: sponsorBlock,
      output_format: outputFormat,
      proxy: proxy || null,
      concurrent_fragments: concurrentFragments,
      download_sections: downloadSections || null,
      output_template: outputTemplate || null,
      thumbnail_only: thumbnailOnly,
      remux_format: remuxFormat || null,
      // Roadmap features
      write_comments: writeComments,
      use_archive: useArchive,
      safe_mode: safeMode,
      playlist_random: playlistRandom,
      filter_duration_min: filterDurationMin ? parseInt(filterDurationMin) : null,
      filter_duration_max: filterDurationMax ? parseInt(filterDurationMax) : null,
      max_filesize: maxFilesize || null,
      min_filesize: minFilesize || null,
      date_after: dateAfter || null,
      date_before: dateBefore || null,
      format_sort: formatSort || null,
      geo_bypass_country: geoBypassCountry || null,
      convert_subs_format: convertSubsFormat || null,
      convert_thumbnail_format: convertThumbnailFormat || null,
    });
  };

  return (
    <div className="card space-y-5">
      <p className="text-xs text-white/30 tracking-widest uppercase">Download Options</p>

      {/* Mode Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setAudioOnly(false)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all duration-300 ${
            !audioOnly ? 'bg-white text-gray-900 font-medium' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          视频
        </button>
        <button
          onClick={() => setAudioOnly(true)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all duration-300 ${
            audioOnly ? 'bg-white text-gray-900 font-medium' : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
          </svg>
          仅音频
        </button>
      </div>

      {/* Video Format Selection */}
      {!audioOnly && videoFormats.length > 0 && (
        <div>
          <label className="block text-xs text-white/40 mb-2">画质</label>
          <select value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)} className="input-field text-sm">
            <option value="best">最佳画质 (自动)</option>
            {videoFormats.map((fmt) => (
              <option key={fmt.format_id} value={fmt.format_id}>
                {fmt.resolution}{fmt.format_note ? ` - ${fmt.format_note}` : ''}{fmt.ext ? ` (.${fmt.ext})` : ''}{fmt.filesize ? ` [${formatSize(fmt.filesize)}]` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Audio Options */}
      {audioOnly && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-2">格式</label>
            <select value={audioFormat} onChange={(e) => setAudioFormat(e.target.value)} className="input-field text-sm">
              <option value="mp3">MP3</option>
              <option value="m4a">M4A (AAC)</option>
              <option value="flac">FLAC (无损)</option>
              <option value="wav">WAV</option>
              <option value="opus">Opus</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-2">质量</label>
            <select value={audioQuality} onChange={(e) => setAudioQuality(e.target.value)} className="input-field text-sm">
              <option value="128">128 kbps</option>
              <option value="192">192 kbps</option>
              <option value="256">256 kbps</option>
              <option value="320">320 kbps (最高)</option>
            </select>
          </div>
        </div>
      )}

      {/* Video container format */}
      {!audioOnly && (
        <div>
          <label className="block text-xs text-white/40 mb-2">输出格式</label>
          <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} className="input-field text-sm">
            <option value="mp4">MP4 (通用)</option>
            <option value="mkv">MKV (高兼容)</option>
            <option value="webm">WebM</option>
          </select>
        </div>
      )}

      {/* Advanced Options */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          <svg className={`w-3 h-3 transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          高级选项
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 pl-4 border-l border-white/[0.06]">
            {/* Subtitles */}
            {videoInfo.subtitles && videoInfo.subtitles.length > 0 && (
              <div>
                <label className="block text-xs text-white/40 mb-2">字幕</label>
                <select value={subtitles} onChange={(e) => setSubtitles(e.target.value)} className="input-field text-sm">
                  <option value="">不下载字幕</option>
                  {videoInfo.subtitles.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                {subtitles && (
                  <label className="flex items-center gap-2 mt-2 text-xs text-white/40">
                    <input type="checkbox" checked={embedSubtitles} onChange={(e) => setEmbedSubtitles(e.target.checked)} className="rounded" />
                    嵌入字幕到视频文件
                  </label>
                )}
              </div>
            )}

            {/* Playlist */}
            <label className="flex items-center gap-2 text-xs text-white/50">
              <input type="checkbox" checked={playlist} onChange={(e) => setPlaylist(e.target.checked)} className="rounded" />
              下载整个播放列表
            </label>
            {playlist && (
              <input
                type="text" value={playlistRange} onChange={(e) => setPlaylistRange(e.target.value)}
                placeholder="范围 (如 1:5 表示第1-5集)" className="input-field text-sm"
              />
            )}

            {/* Rate Limit */}
            <div>
              <label className="block text-xs text-white/40 mb-2">限速 (MB/s)</label>
              <input type="number" value={rateLimit} onChange={(e) => setRateLimit(e.target.value)}
                placeholder="留空不限速" min="0.1" step="0.1" className="input-field text-sm w-40" />
            </div>

            {/* Embed options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-white/50">
                <input type="checkbox" checked={embedThumbnail} onChange={(e) => setEmbedThumbnail(e.target.checked)} className="rounded" />
                嵌入封面图
              </label>
              <label className="flex items-center gap-2 text-xs text-white/50">
                <input type="checkbox" checked={embedMetadata} onChange={(e) => setEmbedMetadata(e.target.checked)} className="rounded" />
                嵌入元数据 (标题/作者/日期)
              </label>
            </div>

            {/* Chapter split */}
            {hasChapters && (
              <label className="flex items-center gap-2 text-xs text-white/50">
                <input type="checkbox" checked={splitChapters} onChange={(e) => setSplitChapters(e.target.checked)} className="rounded" />
                按章节拆分为多个文件
              </label>
            )}

            {/* SponsorBlock - YouTube only */}
            {isYouTube && (
              <label className="flex items-center gap-2 text-xs text-white/50">
                <input type="checkbox" checked={sponsorBlock} onChange={(e) => setSponsorBlock(e.target.checked)} className="rounded" />
                移除广告/赞助片段 (SponsorBlock)
              </label>
            )}

            {/* Proxy - hidden from UI, use env var instead */}

            {/* === Useful Advanced Features === */}
            <div className="pt-3 mt-3 border-t border-white/[0.04] space-y-3">
              <p className="text-xs text-white/30 tracking-widest uppercase">进阶功能</p>

              {/* Video section clip */}
              <div>
                <label className="block text-xs text-white/40 mb-2">片段截取 (起止时间)</label>
                <input type="text" value={downloadSections} onChange={(e) => setDownloadSections(e.target.value)}
                  placeholder="如 00:01:00-00:02:30" className="input-field text-sm" />
                <p className="text-[10px] text-white/20 mt-1">留空下载完整视频，填入时间范围仅下载该片段</p>
              </div>

              {/* Concurrent fragments */}
              <div>
                <label className="block text-xs text-white/40 mb-2">多线程加速</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="16" value={concurrentFragments}
                    onChange={(e) => setConcurrentFragments(parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-white/[0.08] rounded-full appearance-none cursor-pointer" />
                  <span className="text-xs text-white/50 w-8 text-right">{concurrentFragments}x</span>
                </div>
                {concurrentFragments > 1 && (
                  <p className="text-[10px] text-purple-300/50 mt-1">PRO · {concurrentFragments} 线程并发</p>
                )}
              </div>

              {/* Remux format conversion */}
              <div>
                <label className="block text-xs text-white/40 mb-2">格式转换</label>
                <select value={remuxFormat} onChange={(e) => setRemuxFormat(e.target.value)} className="input-field text-sm">
                  <option value="">不转换</option>
                  <option value="mp4">转为 MP4</option>
                  <option value="mkv">转为 MKV</option>
                  <option value="webm">转为 WebM</option>
                  <option value="mov">转为 MOV</option>
                </select>
              </div>

              {/* Quality preference */}
              <div>
                <label className="block text-xs text-white/40 mb-2">画质偏好</label>
                <select value={formatSort} onChange={(e) => setFormatSort(e.target.value)} className="input-field text-sm">
                  <option value="">默认 (最佳画质)</option>
                  <option value="res:1080">优先 1080P</option>
                  <option value="res:720">优先 720P (省流量)</option>
                  <option value="filesize">优先小体积</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button onClick={() => handleDownload(false)}
          className="flex-1 bg-white text-gray-900 font-medium py-3.5 rounded-xl
            flex items-center justify-center gap-2 transition-all duration-300
            hover:scale-[1.01] hover:shadow-lg hover:shadow-white/5 active:scale-[0.99]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          开始下载
        </button>
        <button onClick={() => handleDownload(true)}
          className="px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1]
            text-white/60 text-sm transition-all duration-200
            hover:bg-white/[0.1] hover:text-white/80 active:scale-[0.98]"
          title="仅下载封面图"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Description/Copywriting extract */}
      {videoInfo.description && (
        <div className="pt-3 border-t border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-white/25 tracking-widest uppercase">Video Description</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(videoInfo.description);
                alert('文案已复制到剪贴板');
              }}
              className="text-[11px] text-cyan-400/60 hover:text-cyan-300 transition-colors"
            >
              复制文案
            </button>
          </div>
          <p className="text-[11px] text-white/30 leading-relaxed line-clamp-3">
            {videoInfo.description.slice(0, 200)}{videoInfo.description.length > 200 ? '...' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

export default DownloadOptions;
