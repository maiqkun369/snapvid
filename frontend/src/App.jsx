import React, { useState, useCallback, useEffect } from 'react';
import Agreement from './components/Agreement.jsx';
import AuthModal from './components/AuthModal.jsx';
import UrlInput from './components/UrlInput.jsx';
import VideoInfo from './components/VideoInfo.jsx';
import DownloadOptions from './components/DownloadOptions.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import Dashboard from './components/Dashboard.jsx';
import BatchResultPanel from './components/BatchResultPanel.jsx';

// Clean error messages to never expose technical details to users
function friendlyError(msg) {
  if (!msg) return '操作失败，请重试';
  const s = msg.toString();
  if (s.includes('Sign in') || s.includes('bot') || s.includes('cookies') || s.includes('Cookie') || s.includes('暂不可用'))
    return 'YouTube/Twitter 等海外平台在当前网络环境下不可用。当前支持：B站、抖音、快手、西瓜视频等国内平台';
  if (s.includes('Video unavailable'))
    return '视频不可用，可能已被删除或设为私密';
  if (s.includes('Unsupported URL'))
    return '链接格式不支持，请复制视频的完整分享链接';
  if (s.includes('版权') || s.includes('版权保护'))
    return s; // Keep copyright messages as-is
  if (s.includes('次数已用完'))
    return s; // Keep quota messages
  if (s.includes('请先登录'))
    return s; // Keep login messages
  // Strip yt-dlp internals
  return s.replace(/ERROR:\s*\[\w+\]\s*\w+:\s*/g, '').replace(/See\s+https:\/\/.*$/g, '').trim() || '解析失败，请稍后重试';
}

function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  // Simple hash router
  const [route, setRoute] = useState(window.location.hash === '#/dashboard' ? 'dashboard' : 'home');

  useEffect(() => {
    const handleHash = () => setRoute(window.location.hash === '#/dashboard' ? 'dashboard' : 'home');
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Video state - no longer persisted, fresh on each visit
  const [videoInfo, setVideoInfo] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTask, setCurrentTask] = useState(null);
  const [refreshHistory, setRefreshHistory] = useState(0);

  const handleParse = useCallback(async (url) => {
    // Must be logged in to parse
    const token = localStorage.getItem('snapvid_token') || '';
    if (!token) {
      setError('请先登录后再使用');
      setShowAuth(true);
      return;
    }

    setLoading(true);
    setError('');
    setVideoInfo(null);
    setBatchResults(null);
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
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBatchParse = useCallback(async (urls) => {
    // Must be logged in
    const token = localStorage.getItem('snapvid_token') || '';
    if (!token) {
      setError('请先登录后再使用');
      setShowAuth(true);
      return;
    }

    setLoading(true);
    setError('');
    setVideoInfo(null);
    setBatchResults(null);

    try {
      const response = await fetch('/api/batch-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '批量解析失败');
      }

      const data = await response.json();
      setBatchResults(data);
    } catch (err) {
      setError(err.message || '批量解析失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownload = useCallback(async (options) => {
    setError('');
    const token = localStorage.getItem('snapvid_token') || '';

    // Check login status
    if (!token) {
      setError('请先登录后再下载');
      setShowAuth(true);
      return;
    }

    try {
      const response = await fetch(`/api/download?token=${token}`, {
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
      // Clear video info after download starts (it's now in task center)
      setVideoInfo(null);
      // Auto-navigate to dashboard after submitting download
      window.location.hash = '#/dashboard';
    } catch (err) {
      setError(friendlyError(err.message));
    }
  }, []);

  const handleDownloadComplete = useCallback(() => {
    setRefreshHistory((prev) => prev + 1);
  }, []);

  // Auth: restore session from token
  useEffect(() => {
    const token = localStorage.getItem('snapvid_token');
    if (token) {
      fetch('/api/auth/check-permission?token=' + token)
        .then(res => res.json())
        .then(data => {
          if (data.plan) {
            setUser({ plan: data.plan, daily_remaining: data.daily_remaining });
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleLogin = (data) => {
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('snapvid_token');
    setUser(null);
  };

  return (
    <>
      {/* Agreement Modal */}
      <Agreement />
      {/* Auth Modal */}
      <AuthModal show={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLogin} />

      {/* Route: Dashboard */}
      {route === 'dashboard' && user ? (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onNewDownload={() => { window.location.hash = '#/'; }}
        />
      ) : (
    <div className="min-h-screen relative overflow-hidden bg-[#0f0f11] text-white">

      {/* Animated Background */}
      <div className="animated-bg" />
      <div className="grain-overlay" />

      {/* Floating Glass Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4 px-6 py-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08]
          shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="#/" className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              SnapVid
            </a>
            <div className="flex items-center gap-4">
              {user && (
                <a href="#/dashboard" className="text-sm text-white/60 hover:text-white/90 transition-colors font-medium
                  px-3 py-1.5 rounded-xl hover:bg-white/[0.06]">
                  控制台
                </a>
              )}
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/50">
                    {user.phone || '用户'}
                  </span>
                  {user.plan === 'pro' && (
                    <span className="text-xs px-2.5 py-1 rounded-lg font-medium
                      bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-400/20
                      text-violet-300">PRO</span>
                  )}
                  <button onClick={handleLogout} className="text-sm text-white/30 hover:text-white/60 transition-colors">
                    退出
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-sm text-white font-medium bg-white/[0.08] hover:bg-white/[0.12]
                    px-5 py-2 rounded-xl transition-all duration-200 border border-white/[0.1]
                    hover:border-white/[0.2] active:scale-[0.97]"
                >
                  登录
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Gradient line at bottom */}
        <div className="h-[1px] mx-4 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-36 pb-24">
        <div className="max-w-3xl mx-auto px-6">

          {/* Hero */}
          <div className="text-center mb-14 fade-up">
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
                SnapVid
              </span>
            </h1>
            <p className="text-white/50 text-lg mt-4 leading-relaxed max-w-md mx-auto font-light">
              安全备份你的原创作品
            </p>
          </div>

          {/* URL Input */}
          <div className="fade-up" style={{ animationDelay: '0.1s' }}>
            <UrlInput onParse={handleParse} onBatchParse={handleBatchParse} loading={loading} />
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 px-5 py-4 rounded-2xl bg-red-500/[0.06] border border-red-500/[0.12] backdrop-blur-xl">
              <p className="text-red-300/80 text-sm font-light">{error}</p>
            </div>
          )}

          {/* Combined Video Result Card */}
          {videoInfo && (
            <div className="mt-8 fade-up">
              <div className="glass-strong p-6 rounded-[24px]">
                {/* Video Info Section */}
                <div className="flex flex-col sm:flex-row gap-5">
                  {/* Thumbnail */}
                  {videoInfo.thumbnail && (
                    <div className="flex-shrink-0">
                      <img
                        src={videoInfo.thumbnail}
                        alt={videoInfo.title}
                        className="w-full sm:w-44 h-auto rounded-xl object-cover bg-white/[0.03]"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                  {/* Meta */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white/90 truncate" title={videoInfo.title}>
                      {videoInfo.title}
                    </h3>
                    <div className="mt-3 space-y-2">
                      {videoInfo.uploader && (
                        <p className="text-sm text-white/50 flex items-center gap-2">
                          <span className="text-white/30">作者</span> {videoInfo.uploader}
                        </p>
                      )}
                      {videoInfo.platform && (
                        <p className="text-sm text-white/50 flex items-center gap-2">
                          <span className="text-white/30">平台</span> {videoInfo.platform}
                        </p>
                      )}
                      {videoInfo.duration_string && (
                        <p className="text-sm text-white/50 flex items-center gap-2">
                          <span className="text-white/30">时长</span> {videoInfo.duration_string}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-5 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

                {/* Download Options inline */}
                <DownloadOptions videoInfo={videoInfo} onDownload={handleDownload} />
              </div>
            </div>
          )}

          {/* Batch Results */}
          {batchResults && batchResults.length > 0 && (
            <BatchResultPanel
              results={batchResults}
              onClear={() => setBatchResults(null)}
            />
          )}

          {/* Progress */}
          {currentTask && (
            <div className="mt-6">
              <ProgressBar taskId={currentTask.id} onComplete={handleDownloadComplete} />
            </div>
          )}

          {/* Platform Support */}
          <div className="mt-16 text-center fade-up" style={{ animationDelay: '0.2s' }}>
            <p className="text-xs text-white/25 mb-3 tracking-wider uppercase">支持平台</p>
            <p className="text-sm text-white/40 font-light">
              B站 · 抖音 · 快手 · 西瓜视频 · 小红书 · 微博 · 微视 · 好看视频 · 更多
            </p>
          </div>

        </div>
      </main>

      {/* Footer - ultra minimal */}
      <footer className="relative z-10 py-8">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs text-white/25 text-center leading-relaxed">
            仅支持下载用户自有版权 / CC0 公开授权 / 公共领域内容 · 不存储不缓存不分发 · 侵权投诉 abuse@snapvid.app
          </p>
        </div>
      </footer>
    </div>
      )}
    </>
  );
}

export default App;
