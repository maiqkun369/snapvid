import React, { useState, useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
    return s;
  if (s.includes('次数已用完'))
    return s;
  if (s.includes('请先登录'))
    return s;
  return s.replace(/ERROR:\s*\[\w+\]\s*\w+:\s*/g, '').replace(/See\s+https:\/\/.*$/g, '').trim() || '解析失败，请稍后重试';
}

function App() {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [route, setRoute] = useState(window.location.hash === '#/dashboard' ? 'dashboard' : 'home');

  useEffect(() => {
    const handleHash = () => setRoute(window.location.hash === '#/dashboard' ? 'dashboard' : 'home');
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Video state
  const [videoInfo, setVideoInfo] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTask, setCurrentTask] = useState(null);
  const [refreshHistory, setRefreshHistory] = useState(0);

  // Refs for GSAP
  const heroRef = useRef(null);
  const heroTitleRef = useRef(null);
  const contentRef = useRef(null);
  const ctaRef = useRef(null);

  const handleParse = useCallback(async (url) => {
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
      setVideoInfo(null);
      window.location.hash = '#/dashboard';
    } catch (err) {
      setError(friendlyError(err.message));
    }
  }, []);

  const handleDownloadComplete = useCallback(() => {
    setRefreshHistory((prev) => prev + 1);
  }, []);

  // ===== GSAP ANIMATION SYSTEM (Wero style) =====
  useEffect(() => {
    if (route !== 'home') return;

    // Wait for DOM to be ready
    const ctx = gsap.context(() => {
      // --- Hero Title Stagger Reveal (exact Wero: back.out + stagger) ---
      const titleSpans = heroTitleRef.current?.querySelectorAll('span');
      if (titleSpans && titleSpans.length) {
        gsap.to(titleSpans, {
          autoAlpha: 1,
          y: 0,
          duration: 1.5,
          stagger: 0.2,
          ease: 'back.out(1.7)',
          delay: 0.3,
        });
      }

      // --- CTA Button Scale In ---
      if (ctaRef.current) {
        gsap.fromTo(ctaRef.current, {
          scale: 0,
          autoAlpha: 0,
        }, {
          scale: 1,
          autoAlpha: 1,
          duration: 0.6,
          ease: 'back.out(1.7)',
          delay: 1,
        });
      }

      // --- Hero Sticky Shrink on Scroll (scrub) ---
      if (heroRef.current) {
        gsap.to(heroRef.current, {
          scale: 0.92,
          borderRadius: '24px',
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }

      // --- Hero Title Parallax (moves up + fades on scroll) ---
      if (heroTitleRef.current) {
        gsap.to(heroTitleRef.current, {
          y: -120,
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: '80% top',
            scrub: true,
          },
        });
      }

      // --- Content Section Reveal (cards, inputs slide up with scrub) ---
      const cards = document.querySelectorAll('.gsap-card-reveal');
      cards.forEach((card) => {
        gsap.fromTo(card, {
          y: 80,
          autoAlpha: 0,
        }, {
          y: 0,
          autoAlpha: 1,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 90%',
            end: 'top 60%',
            scrub: 1,
          },
        });
      });

      // --- Platform Tags Stagger Reveal ---
      const platformTags = document.querySelectorAll('.platform-tag');
      if (platformTags.length) {
        ScrollTrigger.create({
          trigger: platformTags[0]?.parentElement,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            gsap.to(platformTags, {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.6,
              stagger: 0.08,
              ease: 'back.out(1.7)',
            });
          },
        });
      }

      // --- Section Titles Reveal ---
      const sectionTitles = document.querySelectorAll('[data-title-reveal]');
      sectionTitles.forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 80%',
          once: true,
          onEnter: () => {
            gsap.fromTo(el, {
              autoAlpha: 0,
              y: 30,
            }, {
              autoAlpha: 1,
              y: 0,
              duration: 1.2,
              ease: 'back.out(1.7)',
            });
          },
        });
      });

      // --- Word Highlight BG (scaleX reveal, exact Wero) ---
      const wordBgs = document.querySelectorAll('.word-highlight__bg');
      wordBgs.forEach((bg) => {
        ScrollTrigger.create({
          trigger: bg.parentElement,
          start: 'top 80%',
          once: true,
          onEnter: () => {
            gsap.to(bg, {
              scaleX: 1,
              duration: 0.8,
              ease: 'power3.out',
              delay: 0.2,
            });
          },
        });
      });

      // --- Bottom Nav entrance ---
      gsap.fromTo('.bottom-nav', {
        y: 80,
        autoAlpha: 0,
      }, {
        y: 0,
        autoAlpha: 1,
        duration: 0.8,
        ease: 'back.out(1.5)',
        delay: 1.4,
      });

    }, '#app'); // Scope

    return () => ctx.revert(); // Cleanup all GSAP on unmount
  }, [route]);

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
      <Agreement />
      <AuthModal show={showAuth} onClose={() => setShowAuth(false)} onLogin={handleLogin} />

      {route === 'dashboard' && user ? (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          onNewDownload={() => { window.location.hash = '#/'; }}
        />
      ) : (
    <div className="scroll-wrapper" id="app">
      {/* Scroll Progress Bar */}
      <div className="scroll-progress" id="scroll-progress"></div>

      {/* === HERO SECTION (sticky, GSAP-driven shrink) === */}
      <section
        ref={heroRef}
        className="gradient-hero hero-sticky"
      >
        {/* Top Logo */}
        <div className="absolute top-8 left-0 right-0 flex justify-center">
          <span className="text-2xl font-black tracking-tight text-[#1D1C1C]">SnapVid</span>
        </div>

        {/* Main Title (GSAP stagger reveal) */}
        <div className="text-center px-6" ref={heroTitleRef}>
          <h1 className="display-title">
            <span>YOUR</span>
            <span>CREATIVE</span>
            <span className="text-[#CC0066]">BACKUP.</span>
          </h1>
        </div>

        {/* Scroll indicator (GSAP entrance) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" ref={ctaRef} style={{ opacity: 0 }}>
          <div className="w-8 h-12 rounded-full border-2 border-[#1D1C1C] flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-[#1D1C1C] rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* === MAIN CONTENT (scrolls over hero) === */}
      <section className="content-over-hero" ref={contentRef}>
        <div className="max-w-3xl mx-auto py-20 px-6">

          {/* Section title */}
          <div className="text-center mb-12" data-title-reveal>
            <h2 className="text-3xl sm:text-4xl font-black text-[#1D1C1C] tracking-tight">
              粘贴链接，
              <span className="word-highlight">
                <span className="word-highlight__bg --yellow"></span>
                一键下载
              </span>
            </h2>
            <p className="text-lg text-[#4A4A4A] mt-3 font-medium">
              支持 B站、抖音、快手、西瓜视频等 1000+ 平台
            </p>
          </div>

          {/* URL Input */}
          <div className="gsap-card-reveal">
            <UrlInput onParse={handleParse} onBatchParse={handleBatchParse} loading={loading} />
          </div>

          {/* Error */}
          {error && (
            <div className="mt-6 px-6 py-4 rounded-2xl bg-red-50 border-2 border-red-300 text-red-700 text-sm font-bold">
              {error}
            </div>
          )}

          {/* Video Info + Download */}
          {videoInfo && (
            <div className="mt-8 gsap-card-reveal">
              <div className="card">
                <div className="flex gap-5">
                  {videoInfo.thumbnail && (
                    <img src={videoInfo.thumbnail} alt="" className="w-44 h-28 object-cover rounded-xl shrink-0 border-2 border-[#1D1C1C]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black text-[#1D1C1C] truncate">{videoInfo.title}</h3>
                    <p className="text-sm text-[#4A4A4A] mt-1 font-medium">
                      {videoInfo.uploader && <span>{videoInfo.uploader}</span>}
                      {videoInfo.duration_string && <span> · {videoInfo.duration_string}</span>}
                      {videoInfo.platform && <span> · {videoInfo.platform}</span>}
                    </p>
                    <div className="mt-4">
                      <DownloadOptions videoInfo={videoInfo} onDownload={handleDownload} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Batch Results */}
          {batchResults && batchResults.length > 0 && (
            <div className="mt-8 gsap-card-reveal">
              <BatchResultPanel results={batchResults} onClear={() => setBatchResults(null)} />
            </div>
          )}

          {/* Progress */}
          {currentTask && (
            <div className="mt-6 gsap-card-reveal">
              <ProgressBar taskId={currentTask.id} onComplete={handleDownloadComplete} />
            </div>
          )}

          {/* Supported Platforms (GSAP stagger tags) */}
          <div className="mt-20 text-center" data-title-reveal>
            <p className="text-sm font-black text-[#4A4A4A] uppercase tracking-widest mb-5">支持平台</p>
            <div className="flex flex-wrap justify-center gap-3">
              {['Bilibili', '抖音', '快手', '西瓜视频', '小红书', '微博', '优酷', '爱奇艺'].map(p => (
                <span key={p} className="platform-tag px-5 py-2.5 rounded-full border-2 border-[#1D1C1C] text-sm font-bold text-[#1D1C1C]
                  hover:bg-[#1D1C1C] hover:text-white transition-all duration-200 cursor-default">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* === FOOTER === */}
        <footer className="bg-[#FFF48D] py-10 border-t-[3px] border-[#1D1C1C] mb-20">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <p className="text-sm font-bold text-[#1D1C1C]">
              仅支持下载用户自有版权 / CC0 / 公共领域内容 · 不存储不缓存不分发
            </p>
            <p className="text-xs text-[#1D1C1C]/60 mt-2 font-medium">
              侵权投诉: abuse@snapvid.app · Powered by yt-dlp
            </p>
          </div>
        </footer>
      </section>

      {/* === BOTTOM FLOATING NAV (Wero style, GSAP entrance) === */}
      <nav className="bottom-nav" style={{ opacity: 0 }}>
        <a href="#features" className="active">下载</a>
        <a href="#platforms">平台</a>
        {user && <a href="#/dashboard">控制台</a>}
        {!user && <button onClick={() => setShowAuth(true)}>登录</button>}
      </nav>
    </div>
      )}
    </>
  );
}

export default App;
