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
    const handleHash = () => {
      const newRoute = window.location.hash === '#/dashboard' ? 'dashboard' : 'home';
      setRoute(newRoute);
      // Clear video state when navigating back to home
      if (newRoute === 'home') {
        setVideoInfo(null);
        setBatchResults(null);
        setError('');
        setCurrentTask(null);
      }
    };
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
  const curvesRef = useRef(null);

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
          y: -150,
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: '70% top',
            scrub: true,
          },
        });
      }

      // --- Decorative Parallax Elements (Wero puzzle/hands-style floating objects) ---
      const parallaxEls = document.querySelectorAll('.parallax-float');
      parallaxEls.forEach((el, i) => {
        const speed = el.dataset.speed || (1 + i * 0.5);
        gsap.fromTo(el, {
          y: 200 + i * 80,
          rotation: -15 + i * 10,
          autoAlpha: 0,
        }, {
          y: 0,
          rotation: 0,
          autoAlpha: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: speed,
          },
        });
      });

      // --- Organic Curves Decoration Parallax (Wero transition style) ---
      if (curvesRef.current) {
        const curvePaths = curvesRef.current.querySelectorAll('.curve-path');
        const puzzleBlocks = curvesRef.current.querySelectorAll('.puzzle-block-3d');
        const sparkles = curvesRef.current.querySelectorAll('.sparkle-star');

        // Entire decoration layer shifts up with scroll
        gsap.to(curvesRef.current, {
          y: -120,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 1.5,
          },
        });

        // Individual curve paths move at different speeds
        curvePaths.forEach((path, i) => {
          gsap.to(path, {
            y: -40 - i * 25,
            x: 15 + i * 10,
            ease: 'none',
            scrollTrigger: {
              trigger: heroRef.current,
              start: 'top top',
              end: 'bottom top',
              scrub: 1 + i * 0.4,
            },
          });
        });

        // Puzzle blocks float at different rates
        puzzleBlocks.forEach((block, i) => {
          gsap.to(block, {
            y: -60 - i * 30,
            rotation: 5 - i * 3,
            ease: 'none',
            scrollTrigger: {
              trigger: heroRef.current,
              start: 'top top',
              end: 'bottom top',
              scrub: 1.2 + i * 0.5,
            },
          });
        });

        // Sparkle stars drift at their own pace
        sparkles.forEach((star, i) => {
          gsap.to(star, {
            y: -30 - i * 20,
            rotation: 45 + i * 15,
            scale: 1.1,
            ease: 'none',
            scrollTrigger: {
              trigger: heroRef.current,
              start: 'top top',
              end: 'bottom top',
              scrub: 0.8 + i * 0.6,
            },
          });
        });
      }

      // --- Content Over Hero: Parallax slide-up (exact Wero: content floats up over hero) ---
      if (contentRef.current) {
        // The content section itself gets a scrub-driven translateY for that floating-in feel
        gsap.fromTo(contentRef.current, {
          y: 100,
        }, {
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: contentRef.current,
            start: 'top bottom',
            end: 'top 60%',
            scrub: 1,
          },
        });
      }

      // --- Content Section Cards Reveal (scrub entrance from below) ---
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

      // --- Subtitle Reveals (Wero stagger spans) ---
      const subtitleEls = document.querySelectorAll('[data-subtitle-reveal]');
      subtitleEls.forEach((el) => {
        const spans = el.querySelectorAll('span');
        if (!spans.length) return;
        ScrollTrigger.create({
          trigger: el,
          start: 'top 85%',
          once: true,
          onEnter: () => {
            gsap.to(spans, {
              autoAlpha: 1,
              y: 0,
              duration: 1.2,
              stagger: 0.15,
              ease: 'back.out(1.7)',
            });
          },
        });
      });

      // --- Puzzle Section Title (special big title) ---
      const puzzleTitles = document.querySelectorAll('.puzzle-section-title');
      puzzleTitles.forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 80%',
          once: true,
          onEnter: () => {
            gsap.to(el, {
              autoAlpha: 1,
              y: 0,
              duration: 1.5,
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
    window.location.hash = '#/';
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

        {/* Decorative Parallax Floating Elements (Wero puzzle/hands style) */}
        <div className="parallax-float absolute top-[20%] right-[5%] w-[180px] h-[180px] pointer-events-none" data-speed="0.8">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
            <rect x="20" y="20" width="160" height="160" rx="16" fill="#83f582" stroke="#1d1c1c" strokeWidth="2"
              transform="rotate(-12 100 100)"/>
            <rect x="50" y="50" width="80" height="80" rx="8" fill="none" stroke="#1d1c1c" strokeWidth="1.5"
              transform="rotate(5 90 90)"/>
            <circle cx="100" cy="100" r="15" fill="#1d1c1c"/>
          </svg>
        </div>

        <div className="parallax-float absolute bottom-[15%] left-[3%] w-[140px] h-[140px] pointer-events-none" data-speed="1.2">
          <svg viewBox="0 0 160 160" fill="none" className="w-full h-full">
            <ellipse cx="80" cy="80" rx="70" ry="50" fill="none" stroke="#1d1c1c" strokeWidth="2"
              transform="rotate(-8 80 80)"/>
            <ellipse cx="80" cy="80" rx="45" ry="30" fill="none" stroke="#1d1c1c" strokeWidth="1.5"
              transform="rotate(15 80 80)"/>
            <path d="M60 80 L80 60 L100 80 L80 100 Z" fill="#fd97fd" stroke="#1d1c1c" strokeWidth="1.5"/>
          </svg>
        </div>

        <div className="parallax-float absolute top-[60%] right-[15%] w-[100px] h-[100px] pointer-events-none" data-speed="1.8">
          <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
            <path d="M50 5 L61 39 L97 39 L68 60 L79 95 L50 73 L21 95 L32 60 L3 39 L39 39 Z"
              fill="white" stroke="#1d1c1c" strokeWidth="2"/>
          </svg>
        </div>

        <div className="parallax-float absolute bottom-[30%] right-[40%] w-[220px] h-[120px] pointer-events-none" data-speed="2.2">
          <svg viewBox="0 0 220 120" fill="none" className="w-full h-full">
            <rect x="10" y="10" width="200" height="100" rx="50" fill="none" stroke="#1d1c1c" strokeWidth="2"/>
            <rect x="30" y="25" width="160" height="70" rx="35" fill="none" stroke="#1d1c1c" strokeWidth="1.2"/>
          </svg>
        </div>

        {/* Main Title (GSAP stagger reveal) */}
        <div className="text-center px-6 relative z-10" ref={heroTitleRef}>
          <h1 className="display-title">
            <span>YOUR</span>
            <span>CREATIVE</span>
            <span className="text-[#CC0066]">BACKUP.</span>
          </h1>
        </div>

        {/* Scroll indicator (GSAP entrance) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10" ref={ctaRef} style={{ opacity: 0 }}>
          <div className="w-8 h-12 rounded-full border-2 border-[#1D1C1C] flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-[#1D1C1C] rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* === ORGANIC CURVES DECORATION (Wero transition style) === */}
      <div className="curves-decoration" ref={curvesRef}>
        {/* Main SVG with organic flowing tube curves */}
        <svg
          className="curves-svg"
          viewBox="0 0 1440 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Gradient definitions for tube fills */}
          <defs>
            <linearGradient id="curveGrad1" x1="0%" y1="0%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#FFF48D" />
              <stop offset="50%" stopColor="#FDAD70" />
              <stop offset="100%" stopColor="#FD97FD" />
            </linearGradient>
            <linearGradient id="curveGrad2" x1="0%" y1="30%" x2="100%" y2="70%">
              <stop offset="0%" stopColor="#FDAD70" />
              <stop offset="60%" stopColor="#FF6B9D" />
              <stop offset="100%" stopColor="#FD97FD" />
            </linearGradient>
            <linearGradient id="curveGrad3" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#FFF48D" />
              <stop offset="100%" stopColor="#FF8C42" />
            </linearGradient>
            <linearGradient id="curveGrad4" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#FFD166" />
              <stop offset="50%" stopColor="#FDAD70" />
              <stop offset="100%" stopColor="#FD74FD" />
            </linearGradient>
            <linearGradient id="curveGrad5" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#FD97FD" />
              <stop offset="50%" stopColor="#FDAD70" />
              <stop offset="100%" stopColor="#FFF48D" />
            </linearGradient>
            <linearGradient id="puzzleGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7AF7F7" />
              <stop offset="100%" stopColor="#83F582" />
            </linearGradient>
            <linearGradient id="puzzleGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#83F582" />
              <stop offset="100%" stopColor="#4ECDC4" />
            </linearGradient>
            {/* Drop shadow filter for puzzle blocks */}
            <filter id="puzzleShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#1D1C1C" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Curve 1: Large sweeping arc from bottom-left to upper-right */}
          <path
            className="curve-path"
            d="M-80 700 C200 650, 350 350, 600 300 C850 250, 1000 450, 1200 200 C1350 50, 1400 100, 1540 50"
            fill="none"
            stroke="url(#curveGrad1)"
            strokeWidth="28"
            strokeLinecap="round"
          />
          <path
            className="curve-path"
            d="M-80 700 C200 650, 350 350, 600 300 C850 250, 1000 450, 1200 200 C1350 50, 1400 100, 1540 50"
            fill="none"
            stroke="#1D1C1C"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Curve 2: Mid-level wave flowing right to left */}
          <path
            className="curve-path"
            d="M-50 500 C150 420, 300 550, 500 480 C700 410, 850 600, 1050 520 C1250 440, 1350 350, 1550 400"
            fill="none"
            stroke="url(#curveGrad2)"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            className="curve-path"
            d="M-50 500 C150 420, 300 550, 500 480 C700 410, 850 600, 1050 520 C1250 440, 1350 350, 1550 400"
            fill="none"
            stroke="#1D1C1C"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Curve 3: Deeper curve crossing over curve 1 */}
          <path
            className="curve-path"
            d="M-100 350 C100 300, 250 600, 480 550 C710 500, 900 200, 1100 350 C1300 500, 1400 250, 1560 300"
            fill="none"
            stroke="url(#curveGrad3)"
            strokeWidth="22"
            strokeLinecap="round"
          />
          <path
            className="curve-path"
            d="M-100 350 C100 300, 250 600, 480 550 C710 500, 900 200, 1100 350 C1300 500, 1400 250, 1560 300"
            fill="none"
            stroke="#1D1C1C"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Curve 4: Tight lower S-curve */}
          <path
            className="curve-path"
            d="M-60 650 C200 580, 400 750, 650 680 C900 610, 1050 730, 1300 660 C1420 630, 1480 700, 1560 680"
            fill="none"
            stroke="url(#curveGrad4)"
            strokeWidth="20"
            strokeLinecap="round"
          />
          <path
            className="curve-path"
            d="M-60 650 C200 580, 400 750, 650 680 C900 610, 1050 730, 1300 660 C1420 630, 1480 700, 1560 680"
            fill="none"
            stroke="#1D1C1C"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Curve 5: Top accent curve */}
          <path
            className="curve-path"
            d="M-40 200 C180 150, 320 350, 550 280 C780 210, 950 100, 1150 180 C1350 260, 1450 150, 1560 120"
            fill="none"
            stroke="url(#curveGrad5)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            className="curve-path"
            d="M-40 200 C180 150, 320 350, 550 280 C780 210, 950 100, 1150 180 C1350 260, 1450 150, 1560 120"
            fill="none"
            stroke="#1D1C1C"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        {/* 3D Puzzle Blocks */}
        <div className="puzzle-block-3d puzzle-block-1">
          <svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
            {/* Main block face */}
            <path
              d="M10 30 L60 10 L110 30 L110 70 L60 90 L10 70 Z"
              fill="url(#puzzleGrad1Inline)"
              stroke="#1D1C1C"
              strokeWidth="2"
            />
            {/* Top face (3D effect) */}
            <path
              d="M10 30 L60 10 L110 30 L60 50 Z"
              fill="#7AF7F7"
              stroke="#1D1C1C"
              strokeWidth="2"
              opacity="0.8"
            />
            {/* Right face (darker for depth) */}
            <path
              d="M110 30 L110 70 L60 90 L60 50 Z"
              fill="#4ECDC4"
              stroke="#1D1C1C"
              strokeWidth="2"
              opacity="0.7"
            />
            {/* Puzzle connector bump */}
            <circle cx="60" cy="10" r="8" fill="#83F582" stroke="#1D1C1C" strokeWidth="1.5" />
            {/* Puzzle connector indent */}
            <circle cx="10" cy="50" r="6" fill="#FAFAF9" stroke="#1D1C1C" strokeWidth="1.5" />
            <defs>
              <linearGradient id="puzzleGrad1Inline" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#83F582" />
                <stop offset="100%" stopColor="#7AF7F7" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="puzzle-block-3d puzzle-block-2">
          <svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
            {/* Main block face */}
            <path
              d="M10 25 L50 8 L90 25 L90 60 L50 77 L10 60 Z"
              fill="#4ECDC4"
              stroke="#1D1C1C"
              strokeWidth="2"
            />
            {/* Top face */}
            <path
              d="M10 25 L50 8 L90 25 L50 42 Z"
              fill="#7AF7F7"
              stroke="#1D1C1C"
              strokeWidth="2"
              opacity="0.85"
            />
            {/* Right face */}
            <path
              d="M90 25 L90 60 L50 77 L50 42 Z"
              fill="#3DA8A0"
              stroke="#1D1C1C"
              strokeWidth="2"
              opacity="0.7"
            />
            {/* Puzzle bump on top */}
            <circle cx="50" cy="8" r="7" fill="#83F582" stroke="#1D1C1C" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Sparkle Stars */}
        <div className="sparkle-star sparkle-1">
          <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 2 L23 15 L36 15 L25 23 L29 37 L20 28 L11 37 L15 23 L4 15 L17 15 Z"
              fill="white"
              stroke="#1D1C1C"
              strokeWidth="1"
            />
          </svg>
        </div>
        <div className="sparkle-star sparkle-2">
          <svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
            {/* Four-pointed star (cross + rotated) */}
            <path
              d="M15 0 L17 12 L30 15 L17 18 L15 30 L13 18 L0 15 L13 12 Z"
              fill="white"
            />
          </svg>
        </div>
        <div className="sparkle-star sparkle-3">
          <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M18 0 L20.5 14 L36 18 L20.5 22 L18 36 L15.5 22 L0 18 L15.5 14 Z"
              fill="white"
              stroke="#1D1C1C"
              strokeWidth="0.5"
            />
          </svg>
        </div>
        <div className="sparkle-star sparkle-4">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 0 L14 9 L24 12 L14 15 L12 24 L10 15 L0 12 L10 9 Z"
              fill="white"
            />
          </svg>
        </div>
        <div className="sparkle-star sparkle-5">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M16 0 L18.5 12 L32 16 L18.5 20 L16 32 L13.5 20 L0 16 L13.5 12 Z"
              fill="white"
              stroke="#1D1C1C"
              strokeWidth="0.8"
            />
          </svg>
        </div>
      </div>

      {/* === MAIN CONTENT (scrolls over hero with parallax) === */}
      <section className="content-over-hero" ref={contentRef}>

        {/* Puzzle/Intro Section (Wero "WAT IS HET?" style) */}
        <div className="puzzle-intro-section">
          <div className="max-w-4xl mx-auto px-6 py-24 relative">
            {/* Parallax decorative element */}
            <div className="parallax-float absolute -top-16 right-0 w-[250px] h-[250px] pointer-events-none opacity-80" data-speed="1.5">
              <svg viewBox="0 0 250 250" fill="none" className="w-full h-full">
                <rect x="30" y="30" width="190" height="100" rx="10"
                  fill="url(#grad1)" stroke="#1d1c1c" strokeWidth="2"
                  transform="rotate(-6 125 80)"/>
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7af7f7"/>
                    <stop offset="100%" stopColor="#83f582"/>
                  </linearGradient>
                </defs>
                {/* Puzzle notch */}
                <circle cx="125" cy="80" r="20" fill="none" stroke="#1d1c1c" strokeWidth="2"/>
                <circle cx="125" cy="80" r="8" fill="#1d1c1c"/>
              </svg>
            </div>

            <div className="relative z-10">
              <p className="puzzle-section-label" data-subtitle-reveal>
                <span className="inline-block">→</span>
                <span className="inline-block ml-2">视频下载，从未如此简单</span>
              </p>
              <h2 className="puzzle-section-title" data-title-reveal>
                粘贴链接<br/>即刻下载
              </h2>
              <p className="puzzle-section-text gsap-card-reveal">
                支持 B站、抖音、快手、西瓜视频等 1000+ 视频平台。
                只需粘贴视频链接，我们帮你完成剩下的一切。高清画质，极速下载。
              </p>
            </div>
          </div>
        </div>

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
                    <img 
                      src={videoInfo.thumbnail} 
                      alt="" 
                      className="w-44 h-28 object-cover rounded-xl shrink-0 border-2 border-[#1D1C1C]" 
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
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
      <nav className="bottom-nav">
        <a href="#features" className="active">下载</a>
        {user && <a href="#/dashboard">控制台</a>}
        {!user && <button onClick={() => setShowAuth(true)}>登录</button>}
      </nav>
    </div>
      )}
    </>
  );
}

export default App;
