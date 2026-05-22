import React, { useState, useCallback, useEffect } from 'react';
import Agreement from './components/Agreement.jsx';
import AuthModal from './components/AuthModal.jsx';
import UrlInput from './components/UrlInput.jsx';
import VideoInfo from './components/VideoInfo.jsx';
import DownloadOptions from './components/DownloadOptions.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import Dashboard from './components/Dashboard.jsx';

// Clean error messages to never expose technical details to users
function friendlyError(msg) {
  if (!msg) return '操作失败，请重试';
  const s = msg.toString();
  if (s.includes('Sign in') || s.includes('bot') || s.includes('cookies') || s.includes('Cookie'))
    return '该平台当前网络无法直接访问，请在高级选项中配置代理后重试';
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

  // Restore state from localStorage on mount
  const [videoInfo, setVideoInfo] = useState(() => {
    try { return JSON.parse(localStorage.getItem('snapvid_videoInfo')); } catch { return null; }
  });
  const [batchResults, setBatchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTask, setCurrentTask] = useState(() => {
    try { return JSON.parse(localStorage.getItem('snapvid_currentTask')); } catch { return null; }
  });
  const [refreshHistory, setRefreshHistory] = useState(0);

  // Persist videoInfo and currentTask to localStorage
  useEffect(() => {
    if (videoInfo) localStorage.setItem('snapvid_videoInfo', JSON.stringify(videoInfo));
    else localStorage.removeItem('snapvid_videoInfo');
  }, [videoInfo]);

  useEffect(() => {
    if (currentTask) localStorage.setItem('snapvid_currentTask', JSON.stringify(currentTask));
    else localStorage.removeItem('snapvid_currentTask');
  }, [currentTask]);

  const handleParse = useCallback(async (url) => {
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
    <div className="min-h-screen relative overflow-hidden bg-[#0a0a0b] text-white">

      {/* Aurora Background */}
      <div className="animated-bg" />
      <div className="grain-overlay" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-base font-semibold text-white/80 tracking-wide">SnapVid</span>
          <div className="flex items-center gap-6">
            <a href="#disclaimer" className="text-sm text-white/50 hover:text-white/80 transition-colors">使用须知</a>
            {user && (
              <a href="#/dashboard" className="text-sm text-cyan-400/70 hover:text-cyan-300 transition-colors font-medium">控制台</a>
            )}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/60">
                  {user.phone || '用户'}
                </span>
                {user.plan === 'pro' && (
                  <span className="text-xs px-2 py-1 rounded-md font-medium bg-purple-500/20 text-purple-300">PRO</span>
                )}
                <button onClick={handleLogout} className="text-sm text-white/30 hover:text-white/60 transition-colors">
                  退出
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-sm text-white font-medium bg-white/10 hover:bg-white/15
                  px-4 py-2 rounded-lg transition-all duration-200 border border-white/10"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-6">

          {/* Hero */}
          <div className="text-center mb-16 fade-up">
            <h1 className="text-5xl sm:text-6xl font-medium tracking-tight leading-[1.1] mb-6">
              <span className="text-white">Your Creative</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">Backup Tool.</span>
            </h1>
            <p className="text-white/60 text-lg mt-6 leading-relaxed max-w-lg mx-auto">
              安全备份你的原创作品，下载公开授权素材。<br />
              支持 1000+ 平台，不存储任何内容。
            </p>
          </div>

          {/* Compliance Banner */}
          <div className="mb-10 px-5 py-4 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/[0.12] text-center fade-up">
            <p className="text-sm text-cyan-200/80">
              仅支持下载用户自有版权 / CC0 公开授权 / 公共领域内容 · 不存储不缓存不分发 · <a href="mailto:abuse@snapvid.app" className="underline hover:text-cyan-100">侵权投诉</a>
            </p>
          </div>

          {/* URL Input */}
          <div className="fade-up" style={{ animationDelay: '0.1s' }}>
            <UrlInput onParse={handleParse} onBatchParse={handleBatchParse} loading={loading} />
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 px-5 py-4 rounded-2xl bg-red-500/[0.08] border border-red-500/[0.15] text-red-300/80 text-sm font-light">
              {error}
            </div>
          )}

          {/* Video Info */}
          {videoInfo && (
            <div className="mt-8 fade-up">
              <VideoInfo info={videoInfo} />
            </div>
          )}

          {/* Batch Results */}
          {batchResults && (
            <div className="mt-8 space-y-2 fade-up">
              <p className="text-xs text-white/30 mb-3">批量解析结果 ({batchResults.filter(r => r.success).length}/{batchResults.length} 成功)</p>
              {batchResults.map((item, i) => (
                <div key={i} className={`px-4 py-3 rounded-xl border ${item.success ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-red-500/[0.05] border-red-500/[0.1]'}`}>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-white/60 truncate">{item.success ? item.title : item.url}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">{item.success ? `${item.platform} · ${item.duration_string}` : item.error}</p>
                    </div>
                    {item.success && (
                      <span className="text-[9px] text-emerald-400/60 ml-2 shrink-0">可下载</span>
                    )}
                  </div>
                </div>
              ))}
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

          {/* Go to Dashboard link */}
          {user && (
            <div className="mt-8 text-center">
              <a href="#/dashboard" className="text-sm text-cyan-400/60 hover:text-cyan-300 transition-colors">
                进入控制台 →
              </a>
            </div>
          )}

        </div>
      </main>

      {/* Footer - compact */}
      <footer id="disclaimer" className="relative z-10 border-t border-white/[0.06] py-10 mt-12">
        <div className="max-w-3xl mx-auto px-6 space-y-4">
          <div className="text-sm text-white/40 leading-relaxed space-y-1.5">
            <p><strong className="text-white/60">合规声明</strong> — 仅支持下载用户自有版权/CC0/公共领域内容。不存储不缓存不分发。系统自动拦截付费平台内容。用户违规责任自负。</p>
          </div>
          <div className="flex items-center justify-between text-xs text-white/25 pt-3 border-t border-white/[0.04]">
            <span>侵权投诉: abuse@snapvid.app</span>
            <span>Powered by yt-dlp</span>
          </div>
        </div>
      </footer>
    </div>
      )}
    </>
  );
}

export default App;
