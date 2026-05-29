import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// GSAP + ScrollTrigger + Lenis (Wero animation stack)
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis Smooth Scroll (exact Wero params)
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
});

// Connect Lenis scroll to GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

// Use GSAP ticker to drive Lenis RAF
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// Expose lenis globally for components to use (e.g., scrollTo)
window.__lenis = lenis;

// Scroll progress bar update
lenis.on('scroll', ({ progress }) => {
  const bar = document.getElementById('scroll-progress');
  if (bar) bar.style.transform = `scaleX(${progress})`;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
