import React, { useState, useCallback } from 'react';
import UrlInput from './components/UrlInput.jsx';
import VideoInfo from './components/VideoInfo.jsx';
import DownloadOptions from './components/DownloadOptions.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import DownloadHistory from './components/DownloadHistory.jsx';
import PlatformList from './components/PlatformList.jsx';

/**
 * Main application component for ytdlp-web.
 */
function App() {
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTask, setCurrentTask] = useState(null);
  const [refreshHistory, setRefreshHistory] = useState(0);

  /**
   * Handle URL submission for video info extraction.
   * @param {string} url - The video URL to parse.
   */
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

  /**
   * Handle download start.
   * @param {object} options - Download options.
   */
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

  /**
   * Handle download completion.
   */
  const handleDownloadComplete = useCallback(() => {
    setRefreshHistory((prev) => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">ytdlp-web</h1>
            <p className="text-xs text-gray-400">强大的在线视频下载器</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* URL Input Section */}
        <UrlInput onParse={handleParse} loading={loading} />

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
            <span className="font-medium">错误：</span>{error}
          </div>
        )}

        {/* Video Info Card */}
        {videoInfo && <VideoInfo info={videoInfo} />}

        {/* Download Options */}
        {videoInfo && (
          <DownloadOptions
            videoInfo={videoInfo}
            onDownload={handleDownload}
          />
        )}

        {/* Progress Bar */}
        {currentTask && (
          <ProgressBar
            taskId={currentTask.id}
            onComplete={handleDownloadComplete}
          />
        )}

        {/* Download History */}
        <DownloadHistory key={refreshHistory} />

        {/* Platform List */}
        <PlatformList />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>Powered by <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300">yt-dlp</a></p>
          <p className="mt-1">支持 1000+ 视频平台</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
