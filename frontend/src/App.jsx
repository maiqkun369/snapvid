import React, { useState, useCallback, useEffect } from 'react';
import Agreement from './components/Agreement.jsx';
import AuthModal from './components/AuthModal.jsx';
import UrlInput from './components/UrlInput.jsx';
import VideoInfo from './components/VideoInfo.jsx';
import DownloadOptions from './components/DownloadOptions.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import DownloadHistory from './components/DownloadHistory.jsx';
import PlatformList from './components/PlatformList.jsx';
import CookieManager from './components/CookieManager.jsx';
import PricingPanel from './components/PricingPanel.jsx';
import Features from './components/Features.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTask, setCurrentTask] = useState(null);
  const [refreshHistory, setRefreshHistory] = useState(0);

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
      setError(err.message || '解析视频信息失败，请检查URL是否正确');
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
    <div className="min-h-screen relative overflow-hidden bg-[#050505] text-white">
      {/* Agreement Modal */}
      <Agreement />
      {/* Auth Modal */}
      <AuthModal show={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLogin} />

      {/* Aurora Background */}
      <div className="animated-bg" />
      <div className="grain-overlay" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-xs text-white/40 tracking-widest uppercase">Creator Backup Tool</span>
          <div className="flex items-center gap-4">
            <a href="#disclaimer" className="text-[10px] text-white/30 hover:text-white/50 transition-colors">使用须知</a>
            <a href="#pricing" className="text-[10px] text-white/30 hover:text-white/50 transition-colors">Pro</a>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/50">
                  {user.phone || (user.plan === 'pro' ? 'Pro会员' : '免费版')}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${user.plan === 'pro' ? 'bg-purple-400/20 text-purple-300' : 'bg-white/[0.06] text-white/30'}`}>
                  {user.plan === 'pro' ? 'PRO' : 'FREE'}
                </span>
                <button onClick={handleLogout} className="text-[10px] text-white/20 hover:text-white/40 transition-colors ml-1">
                  退出
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-[11px] text-white/60 hover:text-white bg-white/[0.06] hover:bg-white/[0.1]
                  px-3 py-1.5 rounded-lg transition-all duration-200"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-6">

          {/* Hero */}
          <div className="text-center mb-14 fade-up">
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight leading-tight mb-4">
              <span className="text-white/90">Your Creative</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-emerald-300 bg-clip-text text-transparent font-normal">Backup Tool.</span>
            </h1>
            <p className="text-white/35 text-sm mt-5 font-light leading-relaxed max-w-md mx-auto">
              安全备份你的原创作品，下载公开授权素材。<br />
              支持 1000+ 平台，不存储任何内容。
            </p>
          </div>

          {/* Compliance Banner */}
          <div className="mb-8 px-4 py-3 rounded-xl bg-cyan-500/[0.05] border border-cyan-500/[0.1] text-center fade-up">
            <p className="text-[11px] text-cyan-300/60">
              仅支持下载用户自有版权 / CC0 公开授权 / 公共领域内容 · 不存储不缓存不分发 · <a href="mailto:abuse@snapvid.app" className="underline hover:text-cyan-200/80">侵权投诉</a>
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

          {/* Download History */}
          <div className="mt-12">
            <DownloadHistory key={refreshHistory} />
          </div>

          {/* Ad Placeholder */}
          <div className="mt-8 rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 text-center">
            <p className="text-[9px] text-white/15 tracking-widest uppercase">Sponsored</p>
            <p className="text-[11px] text-white/20 mt-1.5">广告位招商中 · ads@snapvid.app</p>
          </div>

          {/* Features */}
          <div className="mt-16 fade-up" style={{ animationDelay: '0.2s' }}>
            <Features />
          </div>

          {/* Pricing */}
          <div id="pricing" className="mt-16 fade-up" style={{ animationDelay: '0.25s' }}>
            <PricingPanel />
          </div>

          {/* Platforms */}
          <div className="mt-16 fade-up" style={{ animationDelay: '0.3s' }}>
            <PlatformList />
          </div>

          {/* Cookie Manager */}
          <div className="mt-8 fade-up" style={{ animationDelay: '0.35s' }}>
            <CookieManager />
          </div>
        </div>
      </main>

      {/* Footer + Full Disclaimer */}
      <footer id="disclaimer" className="relative z-10 border-t border-white/[0.04] py-12 mt-16">
        <div className="max-w-3xl mx-auto px-6 space-y-8">
          {/* Copyright Notice */}
          <div className="text-center">
            <p className="text-[10px] text-white/15 tracking-widest uppercase mb-2">Legal Notice</p>
            <p className="text-[11px] text-white/30">
              本工具定位为「创作者视频备份工具」与「公开素材下载工具」，仅服务于合法合规的使用场景。
            </p>
          </div>

          {/* Full Disclaimer */}
          <div className="space-y-2.5 text-[11px] text-white/20 leading-relaxed">
            <p><strong className="text-white/30">1. 内容合规</strong> — 本工具仅支持下载用户自有版权、CC0/CC 协议公开授权、公共领域的视频内容。系统内置版权内容识别机制，将自动拦截对受版权保护的影视、综艺、付费课程、平台专属会员内容的解析请求。</p>
            <p><strong className="text-white/30">2. 零存储承诺</strong> — 本工具不存储、不缓存、不分发任何用户下载的视频资源。所有解析均为实时处理，资源直接从源站下载到用户本地设备，从根源规避存储侵权责任。</p>
            <p><strong className="text-white/30">3. 用户责任</strong> — 用户应确保其下载行为符合所在地区的法律法规及目标平台的服务条款和版权政策。因用户违规使用本工具所产生的一切法律责任，由用户自行承担。</p>
            <p><strong className="text-white/30">4. 版权保护</strong> — 请尊重内容创作者的劳动成果。严禁将下载内容用于商业目的、二次分发、公开传播或任何未经版权所有者授权的用途。</p>
            <p><strong className="text-white/30">5. 数据安全</strong> — 我们遵循数据最小化原则，基础功能无需注册，不收集用户下载记录和个人隐私信息。用户上传的 Cookies 仅存储在本地服务器用于解析，不会传输至第三方。</p>
            <p><strong className="text-white/30">6. 免责条款</strong> — 本工具按「现状」提供，不做任何明示或暗示的保证。对因使用或无法使用本工具造成的任何直接或间接损失，运营方不承担法律责任。使用本工具即表示您已阅读、理解并同意以上全部条款。</p>
          </div>

          {/* Contact */}
          <div className="pt-4 border-t border-white/[0.03] flex items-center justify-between text-[10px] text-white/15">
            <span>侵权投诉: abuse@snapvid.app</span>
            <span>企业合作: enterprise@snapvid.app</span>
          </div>

          <div className="text-center">
            <p className="text-[9px] text-white/10">Powered by yt-dlp · For personal and educational use only</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
