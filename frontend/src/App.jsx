import React, { useState, useCallback } from 'react';
import UrlInput from './components/UrlInput.jsx';
import VideoInfo from './components/VideoInfo.jsx';
import DownloadOptions from './components/DownloadOptions.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import DownloadHistory from './components/DownloadHistory.jsx';
import PlatformList from './components/PlatformList.jsx';

/**
 * Main application component for SnapVid.
 */
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
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="animated-bg" />

      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-950/60 backdrop-blur-md sticky top-0 z-50 relative">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">SnapVid</h1>
            <p className="text-xs text-gray-400">一键抓取，极速下载</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6 relative z-10">
        <UrlInput onParse={handleParse} loading={loading} />

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
            <span className="font-medium">错误：</span>{error}
          </div>
        )}

        {videoInfo && <VideoInfo info={videoInfo} />}

        {videoInfo && (
          <DownloadOptions
            videoInfo={videoInfo}
            onDownload={handleDownload}
          />
        )}

        {currentTask && (
          <ProgressBar
            taskId={currentTask.id}
            onComplete={handleDownloadComplete}
          />
        )}

        <DownloadHistory key={refreshHistory} />

        <PlatformList />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 mt-16 relative z-10">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-500 text-sm">
          <p>Made by <span className="text-purple-400 font-medium">qikunma</span></p>
          <p className="mt-1">支持 1000+ 视频平台</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
