import React, { useState, useCallback } from 'react';
import UrlInput from './components/UrlInput.jsx';
import VideoInfo from './components/VideoInfo.jsx';
import DownloadOptions from './components/DownloadOptions.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import DownloadHistory from './components/DownloadHistory.jsx';
import PlatformList from './components/PlatformList.jsx';

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
        </div>
      </main>

      {/* Footer - minimal + disclaimer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-10">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <span className="text-xs text-white/25 tracking-wide">Made by qikunma</span>
            <span className="text-xs text-white/25 tracking-wide">Powered by yt-dlp</span>
          </div>
          {/* Disclaimer */}
          <div className="border-t border-white/[0.04] pt-6">
            <p className="text-[11px] text-white/20 leading-relaxed text-center">
              免责声明：本工具仅供个人学习和研究使用。用户应确保其下载行为符合相关法律法规及平台服务条款。
              本工具不存储任何视频内容，不对用户的下载行为承担任何法律责任。
              请尊重内容创作者的版权，勿将下载内容用于商业用途或未经授权的传播。
              使用本工具即表示您同意自行承担因使用而产生的一切风险和责任。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
