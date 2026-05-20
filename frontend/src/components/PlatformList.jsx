import React from 'react';

/**
 * Supported platforms list component.
 */
function PlatformList() {
  const platforms = [
    { name: 'YouTube', icon: '🎬' },
    { name: 'Bilibili', icon: '📺' },
    { name: 'Twitter/X', icon: '🐦' },
    { name: 'Instagram', icon: '📷' },
    { name: 'TikTok', icon: '🎵' },
    { name: 'Facebook', icon: '👥' },
    { name: 'Twitch', icon: '🎮' },
    { name: 'Vimeo', icon: '🎥' },
    { name: 'Dailymotion', icon: '📹' },
    { name: 'SoundCloud', icon: '🎶' },
    { name: 'Reddit', icon: '💬' },
    { name: 'Weibo', icon: '📱' },
    { name: '抖音', icon: '🎤' },
    { name: '西瓜视频', icon: '🍉' },
    { name: '优酷', icon: '🎞️' },
    { name: '更多...', icon: '✨' },
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">支持的平台</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-800"
          >
            <span className="text-lg">{platform.icon}</span>
            <span className="text-sm text-gray-300">{platform.name}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-500 text-center">
        基于 yt-dlp，支持超过 1000 个视频平台
      </p>
    </div>
  );
}

export default PlatformList;
