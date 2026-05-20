import React, { useState, useCallback } from 'react';
import UrlInput from './components/UrlInput.jsx';
import VideoInfo from './components/VideoInfo.jsx';
import DownloadOptions from './components/DownloadOptions.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import DownloadHistory from './components/DownloadHistory.jsx';
import PlatformList from './components/PlatformList.jsx';
import CookieManager from './components/CookieManager.jsx';

function App() {
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTask, setCurrentTask] = useState(null);
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleParse = useCallback(async (url) => {
    setLoading(true);
    setError('');
    setVideoInfo(null);
    setCurrentTask(null);

    try {
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '解析失败');
      }

      const data = await response.json();
      data._url = url;
      setVideoInfo(data);
    } catch (err) {
      setError(err.message || '解析视频信息失败，请检查URL是否正确');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownload = useCallback(async (options) => {
    setError('');

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '下载请求失败');
      }

      const data = await response.json();
      setCurrentTask({ id: data.task_id, ...options });
    } catch (err) {
      setError(err.message || '创建下载任务失败');
    }
  }, []);

  const handleDownloadComplete = useCallback(() => {
    setRefreshHistory((prev) => prev + 1);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050505] text-white">
      {/* Aurora Background */}
      <div className="animated-bg" />
      {/* Grain Overlay */}
      <div className="grain-overlay" />

      {/* Header - minimal, floating */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xs text-white/40 tracking-widest uppercase">1000+ platforms</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20">
        <div className="max-w-3xl mx-auto px-6">
          {/* Hero Text */}
          <div className="text-center mb-16 fade-up">
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight leading-tight mb-4">
              <span className="text-white/90">Grab any video,</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-emerald-300 bg-clip-text text-transparent font-normal">anywhere.</span>
            </h1>
            <p className="text-white/35 text-base mt-6 font-light tracking-wide">
              Paste a link. Choose quality. Download.
            </p>
          </div>

          {/* URL Input */}
          <div className="fade-up" style={{ animationDelay: '0.1s' }}>
            <UrlInput onParse={handleParse} loading={loading} />
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300/90 text-sm font-light">
              {error}
            </div>
          )}

          {/* Video Info */}
          {videoInfo && (
            <div className="mt-8 fade-up">
              <VideoInfo info={videoInfo} />
            </div>
          )}

          {/* Download Options */}
          {videoInfo && (
            <div className="mt-6 fade-up" style={{ animationDelay: '0.15s' }}>
              <DownloadOptions videoInfo={videoInfo} onDownload={handleDownload} />
            </div>
          )}

          {/* Progress */}
          {currentTask && (
            <div className="mt-6">
              <ProgressBar taskId={currentTask.id} onComplete={handleDownloadComplete} />
            </div>
          )}

          {/* Download History */}
          <div className="mt-12">
            <DownloadHistory key={refreshHistory} />
          </div>

        {/* Platforms */}
        <div className="mt-16 fade-up" style={{ animationDelay: '0.2s' }}>
          <PlatformList />
        </div>

        {/* Cookie Manager */}
        <div className="mt-8 fade-up" style={{ animationDelay: '0.25s' }}>
          <CookieManager />
        </div>
        </div>
      </main>

      {/* Footer + Disclaimer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-10 mt-16">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          {/* Disclaimer */}
          <div className="space-y-3">
            <p className="text-[10px] text-white/15 tracking-widest uppercase text-center">Disclaimer</p>
            <div className="text-[11px] text-white/20 leading-relaxed space-y-2">
              <p>1. 本工具基于开源项目 yt-dlp 构建，仅提供视频链接解析和下载的技术实现，不提供任何视频内容的存储、托管或分发服务。</p>
              <p>2. 用户在使用本工具前，应确保其行为符合所在地区的法律法规，以及目标平台的服务条款和版权政策。因用户违规使用本工具所产生的一切法律责任，由用户自行承担。</p>
              <p>3. 本工具不鼓励、不支持任何侵犯版权的行为。请尊重内容创作者的劳动成果，不得将下载内容用于商业目的、二次分发、公开传播或任何未经版权所有者授权的用途。</p>
              <p>4. 用户上传的 Cookies 信息仅存储在本地服务器中用于视频解析，不会被上传至任何第三方服务器。用户应妥善保管自己的账号信息，因 Cookies 泄露导致的账号安全问题，本工具不承担责任。</p>
              <p>5. 本工具按「现状」提供，不做任何明示或暗示的保证。对于因使用或无法使用本工具而造成的任何直接或间接损失，开发者不承担任何责任。</p>
              <p>6. 使用本工具即表示您已阅读、理解并同意以上全部条款。如不同意，请立即停止使用。</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.03] text-center">
            <p className="text-[10px] text-white/15">Powered by yt-dlp | For personal and educational use only</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
