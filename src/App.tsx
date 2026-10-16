import React, { useEffect, useRef, useState, useCallback } from 'react';

const FRAME_COUNT = 300;

function getFramePath(index: number): string {
  const padded = String(index).padStart(3, '0');
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  return `${cleanBase}frames/ezgif-frame-${padded}.jpg`;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isLoaderFinished, setIsLoaderFinished] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [copyAllText, setCopyAllText] = useState('Copy All Details');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 4000);
  }, []);

  const closeToast = useCallback(() => {
    setToastVisible(false);
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openEnquiryModal = useCallback(() => {
    setEnquiryModalOpen(true);
  }, []);

  const closeEnquiryModal = useCallback(() => {
    setEnquiryModalOpen(false);
  }, []);

  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeEnquiryModal();
    showToast('Enquiry submitted successfully! We will contact you shortly.');
  };

  const copyToClipboard = useCallback((text: string, msg?: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(msg || `Copied: ${text}`);
    });
  }, [showToast]);

  const copyAllContactInfo = useCallback(() => {
    const contactText = `Bumble wash\nAddress: maharashtra, mumbai\nPhone: 98340 54348\nEmail: bumblewash26@gmail.com\nInstagram: https://www.instagram.com/bumblewash?utm_source=ig_web_button_share_sheet&srtk=ZDNlZDc0MzIxNw==`;
    navigator.clipboard.writeText(contactText).then(() => {
      setCopyAllText('✓ Copied All Info');
      showToast('All contact details copied to clipboard!');
      setTimeout(() => {
        setCopyAllText('Copy All Details');
      }, 2500);
    });
  }, [showToast]);

  // Scroll to hash target on initial load if URL contains an anchor like #services-section
  useEffect(() => {
    if (window.location.hash) {
      const targetId = window.location.hash.replace('#', '');
      const timer = setTimeout(() => {
        scrollToSection(targetId);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [scrollToSection]);

  // Canvas and Scroll Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const images: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
    const loaded: boolean[] = new Array(FRAME_COUNT).fill(false);
    let loadedCount = 0;

    let targetProgress = 0;
    let currentProgress = 0;
    let currentFrame = 1;
    let lastDrawnFrameIndex = -1;

    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(viewportWidth * dpr);
      canvas.height = Math.floor(viewportHeight * dpr);
      lastDrawnFrameIndex = -1;
    };

    window.addEventListener('resize', resizeCanvas, { passive: true });
    resizeCanvas();

    const drawImage = (img: HTMLImageElement) => {
      if (!img || !img.complete || img.naturalWidth === 0) return;

      ctx.save();
      ctx.scale(dpr, dpr);

      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      const scale = Math.max(viewportWidth / imgWidth, viewportHeight / imgHeight);
      const renderWidth = imgWidth * scale;
      const renderHeight = imgHeight * scale;
      const offsetX = (viewportWidth - renderWidth) / 2;
      const offsetY = (viewportHeight - renderHeight) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, offsetX, offsetY, renderWidth, renderHeight);
      ctx.restore();
    };

    const requestFrame = (index: number) => {
      if (index < 0 || index >= FRAME_COUNT) return;
      if (images[index]) return;

      const img = new Image();
      images[index] = img;

      img.onload = () => {
        loaded[index] = true;
        loadedCount++;
        const pct = Math.round((loadedCount / FRAME_COUNT) * 100);
        setLoadProgress(pct);

        if (index === 0 && lastDrawnFrameIndex === -1) {
          drawImage(img);
          lastDrawnFrameIndex = 0;
        }

        const currentTarget = Math.min(Math.max(Math.round(currentFrame) - 1, 0), FRAME_COUNT - 1);
        if (Math.abs(currentTarget - index) <= 2) {
          lastDrawnFrameIndex = -1;
        }

        if (loadedCount >= FRAME_COUNT) {
          setTimeout(() => setIsLoaderFinished(true), 250);
        }
      };

      img.onerror = () => {
        loaded[index] = false;
        loadedCount++;
        if (loadedCount >= FRAME_COUNT) {
          setIsLoaderFinished(true);
        }
      };

      img.src = getFramePath(index + 1);
    };

    const getNearestLoadedImage = (targetIdx: number) => {
      if (loaded[targetIdx] && images[targetIdx]) {
        return { img: images[targetIdx], idx: targetIdx };
      }

      let left = targetIdx - 1;
      let right = targetIdx + 1;
      while (left >= 0 || right < FRAME_COUNT) {
        if (right < FRAME_COUNT && loaded[right] && images[right]) {
          return { img: images[right], idx: right };
        }
        if (left >= 0 && loaded[left] && images[left]) {
          return { img: images[left], idx: left };
        }
        left--;
        right++;
      }
      return null;
    };

    const prioritizeFrames = (centerIdx: number) => {
      for (let offset = 0; offset <= 10; offset++) {
        if (offset === 0) {
          requestFrame(centerIdx);
        } else {
          requestFrame(centerIdx + offset);
          requestFrame(centerIdx - offset);
        }
      }
    };

    // Load first 20 frames immediately
    for (let i = 0; i < 20; i++) {
      requestFrame(i);
    }

    // Background queue to preload remaining frames progressively
    let bgIndex = 20;
    let bgTimeout: ReturnType<typeof setTimeout> | null = null;
    const preloadBatch = () => {
      if (bgIndex >= FRAME_COUNT) return;
      const batchEnd = Math.min(bgIndex + 8, FRAME_COUNT);
      for (; bgIndex < batchEnd; bgIndex++) {
        requestFrame(bgIndex);
      }
      if (bgIndex < FRAME_COUNT) {
        bgTimeout = setTimeout(preloadBatch, 35);
      }
    };
    bgTimeout = setTimeout(preloadBatch, 80);

    const updateScroll = () => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollTop = window.pageYOffset || doc.scrollTop || body.scrollTop || window.scrollY || 0;
      const scrollHeight = Math.max(doc.scrollHeight, body.scrollHeight);
      const clientHeight = window.innerHeight || doc.clientHeight || 1;
      const maxScroll = scrollHeight - clientHeight;

      targetProgress = maxScroll > 0 ? Math.min(Math.max(scrollTop / maxScroll, 0), 1) : 0;
      const targetF = 1 + targetProgress * (FRAME_COUNT - 1);
      const centerIdx = Math.round(targetF) - 1;
      prioritizeFrames(centerIdx);

      setShowBackToTop(scrollTop > 350);
    };

    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('wheel', updateScroll, { passive: true });
    window.addEventListener('touchmove', updateScroll, { passive: true });
    updateScroll();

    let animId: number;
    const loop = () => {
      currentProgress += (targetProgress - currentProgress) * 0.085;
      currentFrame = 1 + currentProgress * (FRAME_COUNT - 1);
      const roundedIdx = Math.min(Math.max(Math.round(currentFrame) - 1, 0), FRAME_COUNT - 1);

      if (roundedIdx !== lastDrawnFrameIndex) {
        const result = getNearestLoadedImage(roundedIdx);
        if (result && result.img) {
          drawImage(result.img);
          lastDrawnFrameIndex = result.idx;
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('wheel', updateScroll);
      window.removeEventListener('touchmove', updateScroll);
      cancelAnimationFrame(animId);
      if (bgTimeout) clearTimeout(bgTimeout);
    };
  }, []);

  // 3D Tilt Card Interaction
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = (-y / rect.height) * 8;
    const rotateY = (x / rect.width) * 8;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  };

  return (
    <div className="bg-black text-white antialiased selection:bg-white selection:text-black font-sans min-h-screen">
      {/* TOP LOADING PROGRESS INDICATOR */}
      <div className={`loader ${isLoaderFinished ? 'loaded' : ''}`} id="loader">
        <div className="loader-bar" id="loaderBar" style={{ width: `${loadProgress}%` }}></div>
      </div>

      {/* FIXED FULLSCREEN SCROLL ANIMATION CANVAS */}
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} id="canvas"></canvas>
        {/* Cinematic Vignette & Ambient Radial Shading for Legibility */}
        <div className="canvas-overlay"></div>
      </div>

      {/* FOREGROUND SCROLLABLE CONTENT */}
      <div className="relative z-10 w-full min-h-screen">
        {/* SUBTLE GEOMETRIC GRID ACCENT */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.025] z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px]"></div>
        </div>

        {/* MAIN HEADER NAVIGATION */}
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex items-center justify-between flex-nowrap gap-3 sm:gap-6 relative z-30">
          {/* Logo */}
          <div
            onClick={scrollToTop}
            className="flex items-center space-x-3 cursor-pointer shrink-0 hover:opacity-90 transition-opacity"
            title="Bumble Wash - Scroll to Top"
          >
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white uppercase leading-none whitespace-nowrap">
                  Bumble Wash
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] tracking-[0.25em] text-white/80 font-semibold uppercase mt-0.5 whitespace-nowrap">
                PREMIUM LAUNDRY CARE
              </span>
            </div>
          </div>

          {/* Desktop Navigation Capsule */}
          <nav className="hidden md:flex items-center flex-nowrap space-x-1 lg:space-x-1.5 bg-neutral-900/40 border border-white/15 backdrop-blur-xl rounded-full px-2.5 sm:px-3 py-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.5)] shrink-0 whitespace-nowrap">
            <button
              onClick={() => scrollToSection('services-section')}
              className="nav-btn group relative shrink-0 whitespace-nowrap px-3 sm:px-3.5 lg:px-4 py-1.5 text-xs sm:text-[13px] font-medium tracking-wide transition-all duration-300 rounded-full cursor-pointer text-white/70 hover:text-white"
            >
              <span className="relative z-10 block transition-all duration-200 group-hover:-translate-y-0.5">Services</span>
              <span className="nav-glow absolute bottom-0.5 left-3 right-3 h-[2px] rounded-full bg-white opacity-0 transition-all duration-300 group-hover:opacity-100"></span>
            </button>
            <button
              onClick={() => scrollToSection('stats-section')}
              className="nav-btn group relative shrink-0 whitespace-nowrap px-3 sm:px-3.5 lg:px-4 py-1.5 text-xs sm:text-[13px] font-medium tracking-wide transition-all duration-300 rounded-full cursor-pointer text-white/70 hover:text-white"
            >
              <span className="relative z-10 block transition-all duration-200 group-hover:-translate-y-0.5">Stats</span>
              <span className="nav-glow absolute bottom-0.5 left-3 right-3 h-[2px] rounded-full bg-white opacity-0 transition-all duration-300 group-hover:opacity-100"></span>
            </button>
            <button
              onClick={() => scrollToSection('reviews-section')}
              className="nav-btn group relative shrink-0 whitespace-nowrap px-3 sm:px-3.5 lg:px-4 py-1.5 text-xs sm:text-[13px] font-medium tracking-wide transition-all duration-300 rounded-full cursor-pointer text-white/70 hover:text-white"
            >
              <span className="relative z-10 block transition-all duration-200 group-hover:-translate-y-0.5">Reviews</span>
              <span className="nav-glow absolute bottom-0.5 left-3 right-3 h-[2px] rounded-full bg-white opacity-0 transition-all duration-300 group-hover:opacity-100"></span>
            </button>
            <button
              onClick={() => scrollToSection('cards-section')}
              className="nav-btn group relative shrink-0 whitespace-nowrap px-3 sm:px-3.5 lg:px-4 py-1.5 text-xs sm:text-[13px] font-medium tracking-wide transition-all duration-300 rounded-full cursor-pointer text-white/70 hover:text-white"
            >
              <span className="relative z-10 block transition-all duration-200 group-hover:-translate-y-0.5">Tailored Care</span>
              <span className="nav-glow absolute bottom-0.5 left-3 right-3 h-[2px] rounded-full bg-white opacity-0 transition-all duration-300 group-hover:opacity-100"></span>
            </button>
            <button
              onClick={() => scrollToSection('contact-section')}
              className="nav-btn group relative shrink-0 whitespace-nowrap px-3 sm:px-3.5 lg:px-4 py-1.5 text-xs sm:text-[13px] font-medium tracking-wide transition-all duration-300 rounded-full cursor-pointer text-white/70 hover:text-white"
            >
              <span className="relative z-10 block transition-all duration-200 group-hover:-translate-y-0.5">Contact</span>
              <span className="nav-glow absolute bottom-0.5 left-3 right-3 h-[2px] rounded-full bg-white opacity-0 transition-all duration-300 group-hover:opacity-100"></span>
            </button>
            <button
              onClick={openEnquiryModal}
              className="nav-btn group relative shrink-0 whitespace-nowrap px-3 sm:px-3.5 lg:px-4 py-1.5 text-xs sm:text-[13px] font-medium tracking-wide transition-all duration-300 rounded-full cursor-pointer text-white/70 hover:text-white"
            >
              <span className="relative z-10 block transition-all duration-200 group-hover:-translate-y-0.5">Enquiry</span>
              <span className="nav-glow absolute bottom-0.5 left-3 right-3 h-[2px] rounded-full bg-white opacity-0 transition-all duration-300 group-hover:opacity-100"></span>
            </button>
          </nav>

          {/* Header Action & Mobile Toggle */}
          <div className="flex items-center space-x-3 shrink-0 whitespace-nowrap">
            <button
              onClick={openEnquiryModal}
              className="bg-white text-black hover:bg-neutral-200 transition-all font-bold text-xs sm:text-sm px-5 sm:px-6 py-2.5 rounded-full uppercase tracking-wider shadow-sm hover:shadow-white/20 hover:shadow-lg cursor-pointer transform active:scale-95 shrink-0 whitespace-nowrap"
            >
              Book a Pickup
            </button>
            <button
              id="mobileMenuBtn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              )}
            </button>
          </div>
        </header>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div id="mobileDrawer" className="relative z-40 px-4 pb-6 transition-all duration-300 md:hidden">
            <div className="bg-neutral-950/95 border border-white/20 backdrop-blur-2xl rounded-2xl p-4 shadow-2xl flex flex-col space-y-1">
              <button
                onClick={() => { scrollToSection('services-section'); setMobileMenuOpen(false); }}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all text-left"
              >
                <span>Services</span>
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
              <button
                onClick={() => { scrollToSection('stats-section'); setMobileMenuOpen(false); }}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all text-left"
              >
                <span>Stats</span>
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
              <button
                onClick={() => { scrollToSection('reviews-section'); setMobileMenuOpen(false); }}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all text-left"
              >
                <span>Reviews</span>
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
              <button
                onClick={() => { scrollToSection('cards-section'); setMobileMenuOpen(false); }}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all text-left"
              >
                <span>Tailored Care</span>
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
              <button
                onClick={() => { scrollToSection('contact-section'); setMobileMenuOpen(false); }}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all text-left"
              >
                <span>Contact</span>
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
              <button
                onClick={() => { openEnquiryModal(); setMobileMenuOpen(false); }}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all text-left"
              >
                <span>Enquiry</span>
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>
        )}

        {/* 1. HERO SECTION */}
        <section className="relative z-10 pt-12 sm:pt-20 md:pt-24 pb-12 sm:pb-16 flex flex-col items-center text-center px-4 max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15] max-w-3xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
            Fresh Clothes.
            <span className="inline-block relative mt-2 sm:mt-0 ml-1.5 sm:ml-2">
              <span className="relative inline-block border-2 border-white rounded-full px-4 sm:px-6 py-0.5 font-extrabold bg-black/30 backdrop-blur-[2px] shadow-[0_0_25px_rgba(255,255,255,0.25)]">
                Happier Days.
              </span>
            </span>
          </h1>

          <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-white font-semibold max-w-2xl leading-relaxed drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] px-5 py-3 rounded-2xl bg-black/40 backdrop-blur-[3px] border border-white/15">
            Experience a new level of laundry care with Bumble Wash. From stubborn stains to everyday freshness, we make your clothes look their best while giving you more time to enjoy life.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={openEnquiryModal}
              className="interactive-btn bg-white text-black hover:bg-neutral-200 transition-all font-bold text-xs sm:text-sm px-8 py-3.5 rounded-full uppercase tracking-wider shadow-md hover:shadow-white/30 hover:scale-105 active:scale-95 cursor-pointer"
            >
              Book a Pickup
            </button>
            <button
              onClick={() => scrollToSection('services-section')}
              className="interactive-btn bg-black/40 hover:bg-black/60 text-white border border-white/40 hover:border-white transition-all font-bold text-xs sm:text-sm px-8 py-3.5 rounded-full uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-sm"
            >
              Explore Our Services
            </button>
          </div>
        </section>

        {/* 5 BOTTOM HERO FEATURE CARDS */}
        <section className="relative z-20 max-w-5xl mx-auto px-3 sm:px-6 pb-20 sm:pb-28">
          <div className="grid grid-cols-5 gap-2 sm:gap-3.5 md:gap-4 items-stretch">
            {/* Card 1 */}
            <div
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="group relative overflow-hidden rounded-xl sm:rounded-[22px] p-2.5 sm:p-4 md:p-5 flex flex-col items-center justify-between text-center backdrop-blur-xl bg-neutral-900/40 hover:bg-neutral-800/60 border border-white/25 hover:border-white/60 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_12px_28px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer min-h-[115px] sm:min-h-[145px]"
            >
              <div className="relative z-10 mb-1.5 sm:mb-2 text-white">
                <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 17h24l-2.5 15a3 3 0 0 1-3 2.5H13.5A3 3 0 0 1 10.5 32L8 17Z" />
                  <path d="M6 17h28" />
                  <circle cx="15" cy="11" r="2.5" />
                  <circle cx="25" cy="10" r="3.5" />
                  <circle cx="20" cy="7" r="1.5" />
                </svg>
              </div>
              <h3 className="relative z-10 font-bold text-[11px] sm:text-xs md:text-[13px] leading-tight whitespace-pre-line tracking-tight text-white">
                Advanced<br />Fresh
              </h3>
            </div>

            {/* Card 2 */}
            <div
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="group relative overflow-hidden rounded-xl sm:rounded-[22px] p-2.5 sm:p-4 md:p-5 flex flex-col items-center justify-between text-center backdrop-blur-xl bg-neutral-900/40 hover:bg-neutral-800/60 border border-white/25 hover:border-white/60 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_12px_28px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer min-h-[115px] sm:min-h-[145px]"
            >
              <div className="relative z-10 mb-1.5 sm:mb-2 text-white">
                <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 7h12l5 6v19a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V13l5-6Z" />
                  <circle cx="20" cy="14" r="2" />
                  <path d="M20 16v14" />
                  <path d="M18 7a2 2 0 1 1 4 0" />
                </svg>
              </div>
              <h3 className="relative z-10 font-bold text-[11px] sm:text-xs md:text-[13px] leading-tight whitespace-pre-line tracking-tight text-white">
                Professional<br />Touch
              </h3>
            </div>

            {/* Card 3 */}
            <div
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="group relative overflow-hidden rounded-xl sm:rounded-[22px] p-2.5 sm:p-4 md:p-5 flex flex-col items-center justify-between text-center backdrop-blur-xl bg-neutral-900/40 hover:bg-neutral-800/60 border border-white/25 hover:border-white/60 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_12px_28px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer min-h-[115px] sm:min-h-[145px]"
            >
              <div className="relative z-10 mb-1.5 sm:mb-2 text-white">
                <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="6" width="22" height="28" rx="3" />
                  <circle cx="20" cy="22" r="6" />
                  <path d="M18 22a2 2 0 0 0 2 2" />
                  <circle cx="14" cy="11" r="1.5" fill="currentColor" />
                  <line x1="21" y1="11" x2="27" y2="11" />
                </svg>
              </div>
              <h3 className="relative z-10 font-bold text-[11px] sm:text-xs md:text-[13px] leading-tight whitespace-pre-line tracking-tight text-white">
                Customized<br />Options
              </h3>
            </div>

            {/* Card 4 */}
            <div
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="group relative overflow-hidden rounded-xl sm:rounded-[22px] p-2.5 sm:p-4 md:p-5 flex flex-col items-center justify-between text-center backdrop-blur-xl bg-neutral-900/40 hover:bg-neutral-800/60 border border-white/25 hover:border-white/60 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_12px_28px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer min-h-[115px] sm:min-h-[145px]"
            >
              <div className="relative z-10 mb-1.5 sm:mb-2 text-white">
                <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 24c0 3 2 6 6 7l4 2 4-2c4-1 6-4 6-7" />
                  <path d="M20 9c-3 4-6 7.5-6 10.5a6 6 0 1 0 12 0C26 16.5 23 13 20 9Z" />
                  <circle cx="20" cy="20" r="2" />
                </svg>
              </div>
              <h3 className="relative z-10 font-bold text-[11px] sm:text-xs md:text-[13px] leading-tight whitespace-pre-line tracking-tight text-white">
                Superior<br />Clean
              </h3>
            </div>

            {/* Card 5 */}
            <div
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="group relative overflow-hidden rounded-xl sm:rounded-[22px] p-2.5 sm:p-4 md:p-5 flex flex-col items-center justify-between text-center backdrop-blur-xl bg-neutral-900/40 hover:bg-neutral-800/60 border border-white/25 hover:border-white/60 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_12px_28px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5 cursor-pointer min-h-[115px] sm:min-h-[145px]"
            >
              <div className="relative z-10 mb-1.5 sm:mb-2 text-white">
                <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 9l6 4 6-4 5 4-2 19H11L9 13l5-4Z" />
                  <path d="M14 9l6 4 6-4" />
                  <path d="M20 13v19" />
                  <path d="M28 7l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" fill="currentColor" />
                </svg>
              </div>
              <h3 className="relative z-10 font-bold text-[11px] sm:text-xs md:text-[13px] leading-tight whitespace-pre-line tracking-tight text-white">
                Exceptional<br />Quality
              </h3>
            </div>
          </div>
        </section>

        {/* 2. SERVICES SECTION */}
        <section id="services-section" className="pt-20 sm:pt-28 pb-24 sm:pb-32 border-t border-white/10 relative overflow-hidden bg-black/20 backdrop-blur-[2px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Headline Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center mb-14 sm:mb-20">
              <div className="lg:col-span-7 text-left">
                <span className="text-xs sm:text-sm uppercase tracking-[0.25em] text-white/60 font-semibold block mb-3 sm:mb-4">
                  Tailored Garment Care
                </span>
                <h2 className="font-italic-headline text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-white leading-[1.08] tracking-tight">
                  Laundry Care <br />
                  <span className="text-white/95">Made Effortless</span>
                </h2>
              </div>

              <div className="lg:col-span-5 text-left flex flex-col justify-center">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-snug mb-3.5">
                  Great fabric care should feel completely effortless.
                </h3>
                <p className="text-sm sm:text-base text-white/80 leading-relaxed font-normal mb-8">
                  Your clothes deserve the best care. Discover convenient laundry solutions designed to keep your wardrobe fresh, clean, and ready for every occasion.
                </p>
                <div>
                  <button
                    onClick={openEnquiryModal}
                    className="group inline-flex items-center space-x-3 px-7 py-3.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-white/30 cursor-pointer"
                  >
                    <span>Discover Our Services</span>
                    <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 17L17 7M17 7H7M17 7V17"></path></svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Service Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 pt-10 pb-16 border-t border-b border-white/10">
              {/* Service 1 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 text-left backdrop-blur-2xl bg-neutral-900/50 hover:bg-neutral-800/70 border border-white/20 hover:border-white/50 shadow-[0_12px_28px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 tracking-wider">#01</span>
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" /><path d="M8 2v4" /><path d="M16 2v4" /><path d="M7 12h10" /><path d="M7 16h6" />
                        </svg>
                      </div>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white mb-2 tracking-tight">Wash &amp; Fold</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-white/75 leading-relaxed font-normal mt-1">Freshly washed, perfectly dried, and neatly folded clothes.</p>
                </div>
              </div>

              {/* Service 2 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 text-left backdrop-blur-2xl bg-neutral-900/50 hover:bg-neutral-800/70 border border-white/20 hover:border-white/50 shadow-[0_12px_28px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 tracking-wider">#02</span>
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8L12 2z" /><path d="M19 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
                        </svg>
                      </div>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white mb-2 tracking-tight">Dry Cleaning</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-white/75 leading-relaxed font-normal mt-1">Special care for delicate fabrics and premium garments.</p>
                </div>
              </div>

              {/* Service 3 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 text-left backdrop-blur-2xl bg-neutral-900/50 hover:bg-neutral-800/70 border border-white/20 hover:border-white/50 shadow-[0_12px_28px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 tracking-wider">#03</span>
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 18h16" /><path d="M5 18l2.5-9h9l2.5 9" /><path d="M9 13h6" /><circle cx="12" cy="7" r="1" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white mb-2 tracking-tight">Ironing &amp; Steam Press</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-white/75 leading-relaxed font-normal mt-1">Crisp, wrinkle-free clothes for a polished look.</p>
                </div>
              </div>

              {/* Service 4 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 text-left backdrop-blur-2xl bg-neutral-900/50 hover:bg-neutral-800/70 border border-white/20 hover:border-white/50 shadow-[0_12px_28px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between"
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 tracking-wider">#04</span>
                      <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13" rx="2" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                      </div>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white mb-2 tracking-tight">Pickup &amp; Delivery</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-white/75 leading-relaxed font-normal mt-1">Hassle-free laundry service right at your doorstep.</p>
                </div>
              </div>
            </div>

            {/* Trust Badges Strip */}
            <div className="pt-14 sm:pt-18 text-center">
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] font-semibold text-white/50 block mb-8">
                TRUSTED FABRIC CARE CERTIFICATIONS &amp; STANDARDS
              </span>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 md:gap-14 opacity-75 hover:opacity-100 transition-opacity">
                <div className="flex items-center space-x-2.5 text-white/70">
                  <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-[10px] font-mono font-bold bg-white/5 text-white">WM</div>
                  <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase">Woolmark Care</span>
                </div>
                <div className="flex items-center space-x-2.5 text-white/70">
                  <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-[10px] font-mono font-bold bg-white/5 text-white">GOTS</div>
                  <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase">GOTS Organic</span>
                </div>
                <div className="flex items-center space-x-2.5 text-white/70">
                  <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-[10px] font-mono font-bold bg-white/5 text-white">PLC</div>
                  <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase">Pure Linen Co.</span>
                </div>
                <div className="flex items-center space-x-2.5 text-white/70">
                  <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-[10px] font-mono font-bold bg-white/5 text-white">MPC</div>
                  <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase">Miele Pro Care</span>
                </div>
                <div className="flex items-center space-x-2.5 text-white/70">
                  <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center text-[10px] font-mono font-bold bg-white/5 text-white">SGS</div>
                  <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase">Silk Guild Standard</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. STATS SECTION */}
        <section id="stats-section" className="pt-20 sm:pt-28 pb-24 sm:pb-32 border-t border-white/10 relative overflow-hidden bg-black/20 backdrop-blur-[2px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
              <h2 className="font-italic-headline text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-white leading-[1.08] tracking-tight mb-4">
                Freshness You Can <br />
                <span className="text-white/95">Count On</span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed font-normal">
                We’re making laundry day simpler with quality care, reliable service, and a fresh experience in every wash.
              </p>
            </div>

            {/* 4 Stats Cards Grid with Infographic Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {/* Stat 1 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[24px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-[3px] bg-black/35 hover:bg-black/55 border border-white/20 hover:border-white/45 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/90">#01</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-white/60">Fabric Care Volume</span>
                  </div>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-none mb-2">10K+</div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">Clothes Freshened</h3>
                  <p className="text-xs sm:text-[13px] text-white/75 leading-relaxed font-normal mt-2">Over 10,000 garments restored to pristine crispness &amp; showroom finish.</p>
                </div>
                {/* Pillar bar */}
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="h-44 sm:h-48 w-full bg-neutral-950/80 rounded-2xl border border-white/10 p-3 flex items-end justify-center relative overflow-hidden">
                    <div className="w-14 sm:w-16 h-[88%] rounded-t-xl rounded-b-[20px] bg-gradient-to-t from-cyan-400 via-sky-500 to-blue-600 relative flex flex-col justify-between items-center shadow-[0_0_24px_rgba(56,189,248,0.3)]">
                      <div className="w-full h-2 rounded-t-xl bg-white shadow-[0_0_12px_rgba(255,255,255,0.95),0_0_20px_#38bdf8]"></div>
                      <div className="my-auto px-2 py-0.5 rounded-full bg-black/50 border border-white/30 text-[10px] font-mono font-bold text-white">94%</div>
                      <div className="w-full h-3 rounded-b-[20px] bg-black/35 border-t border-white/20"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat 2 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[24px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-[3px] bg-black/35 hover:bg-black/55 border border-white/20 hover:border-white/45 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/90">#02</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-white/60">Verified Excellence</span>
                  </div>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-none mb-2">98%</div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">Customer Satisfaction</h3>
                  <p className="text-xs sm:text-[13px] text-white/75 leading-relaxed font-normal mt-2">Exceptional client reviews for gentle fabric treatment and punctuality.</p>
                </div>
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="h-44 sm:h-48 w-full bg-neutral-950/80 rounded-2xl border border-white/10 p-3 flex items-end justify-center relative overflow-hidden">
                    <div className="w-14 sm:w-16 h-[96%] rounded-t-xl rounded-b-[20px] bg-gradient-to-t from-blue-400 via-indigo-500 to-sky-500 relative flex flex-col justify-between items-center shadow-[0_0_24px_rgba(96,165,250,0.3)]">
                      <div className="w-full h-2 rounded-t-xl bg-white shadow-[0_0_12px_rgba(255,255,255,0.95),0_0_20px_#60a5fa]"></div>
                      <div className="my-auto px-2 py-0.5 rounded-full bg-black/50 border border-white/30 text-[10px] font-mono font-bold text-white">98%</div>
                      <div className="w-full h-3 rounded-b-[20px] bg-black/35 border-t border-white/20"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat 3 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[24px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-[3px] bg-black/35 hover:bg-black/55 border border-white/20 hover:border-white/45 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/90">#03</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-white/60">Active Community</span>
                  </div>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-none mb-2">500+</div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">Happy Customers</h3>
                  <p className="text-xs sm:text-[13px] text-white/75 leading-relaxed font-normal mt-2">Dedicated households, working executives &amp; local boutiques served weekly.</p>
                </div>
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="h-44 sm:h-48 w-full bg-neutral-950/80 rounded-2xl border border-white/10 p-3 flex items-end justify-center relative overflow-hidden">
                    <div className="w-14 sm:w-16 h-[80%] rounded-t-xl rounded-b-[20px] bg-gradient-to-t from-sky-400 via-teal-400 to-blue-500 relative flex flex-col justify-between items-center shadow-[0_0_24px_rgba(56,189,248,0.3)]">
                      <div className="w-full h-2 rounded-t-xl bg-white shadow-[0_0_12px_rgba(255,255,255,0.95),0_0_20px_#38bdf8]"></div>
                      <div className="my-auto px-2 py-0.5 rounded-full bg-black/50 border border-white/30 text-[10px] font-mono font-bold text-white">82%</div>
                      <div className="w-full h-3 rounded-b-[20px] bg-black/35 border-t border-white/20"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stat 4 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[24px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-[3px] bg-black/35 hover:bg-black/55 border border-white/20 hover:border-white/45 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/90">#04</span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-white/60">Always Accessible</span>
                  </div>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-none mb-2">24/7</div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">Easy Online Booking</h3>
                  <p className="text-xs sm:text-[13px] text-white/75 leading-relaxed font-normal mt-2">Seamless digital scheduling for doorstep laundry pickup anytime.</p>
                </div>
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="h-44 sm:h-48 w-full bg-neutral-950/80 rounded-2xl border border-white/10 p-3 flex items-end justify-center relative overflow-hidden">
                    <div className="w-14 sm:w-16 h-[100%] rounded-t-xl rounded-b-[20px] bg-gradient-to-t from-teal-400 via-cyan-400 to-blue-500 relative flex flex-col justify-between items-center shadow-[0_0_24px_rgba(45,212,191,0.3)]">
                      <div className="w-full h-2 rounded-t-xl bg-white shadow-[0_0_12px_rgba(255,255,255,0.95),0_0_20px_#2dd4bf]"></div>
                      <div className="my-auto px-2 py-0.5 rounded-full bg-black/50 border border-white/30 text-[10px] font-mono font-bold text-white">100%</div>
                      <div className="w-full h-3 rounded-b-[20px] bg-black/35 border-t border-white/20"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-14 sm:mt-18 text-center relative z-20">
              <button
                onClick={openEnquiryModal}
                className="interactive-btn group relative inline-flex items-center space-x-3 px-8 sm:px-11 py-4 rounded-full bg-white text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider hover:bg-neutral-200 transition-all duration-300 shadow-[0_0_25px_rgba(255,255,255,0.35)] hover:scale-105 cursor-pointer"
              >
                <span>Experience the Bumble Wash Difference</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 17L17 7M17 7H7M17 7V17"></path></svg>
              </button>
            </div>
          </div>
        </section>

        {/* 4. REVIEWS SECTION */}
        <section id="reviews-section" className="pt-20 sm:pt-28 pb-24 sm:pb-32 border-t border-white/10 relative overflow-hidden bg-black/20 backdrop-blur-[2px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
              <span className="text-xs sm:text-sm uppercase tracking-[0.25em] text-white/60 font-semibold block mb-3 sm:mb-4">
                Customer Experiences
              </span>
              <h2 className="font-italic-headline text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-white leading-[1.08] tracking-tight mb-4">
                Freshness Loved <br />
                <span className="text-white/95">by Our Community</span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed font-normal">
                Real reviews from happy households and professionals who experience Bumble Wash everyday fabric care.
              </p>
            </div>

            {/* 3 Review Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 items-stretch">
              {/* Review 1 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[24px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-2xl bg-neutral-900/50 hover:bg-neutral-800/70 border border-white/20 hover:border-white/45 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center space-x-3.5 mb-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm tracking-wider bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-amber-300 border border-amber-400/30">
                        PS
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">Priya Sharma</h3>
                        <span className="text-[11px] text-white/55 font-medium block">Verified Customer • Regular Care</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 my-3 text-amber-400">
                      ★★★★★ <span className="text-xs font-mono font-bold text-amber-300 ml-1.5">5.0</span>
                    </div>

                    <p className="text-sm sm:text-[15px] text-white/90 leading-relaxed font-normal mt-2">
                      “Absolutely love the service! My clothes come back fresh, neatly folded, and smelling amazing. Bumble Wash has made laundry day so much easier!”
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">Wash &amp; Fold • Delivery</span>
                    <span className="text-[11px] text-emerald-400 font-medium">✓ Verified Review</span>
                  </div>
                </div>
              </div>

              {/* Review 2 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[24px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-2xl bg-neutral-900/50 hover:bg-neutral-800/70 border border-white/20 hover:border-white/45 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center space-x-3.5 mb-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm tracking-wider bg-gradient-to-br from-sky-400/20 to-blue-500/20 text-cyan-300 border border-cyan-400/30">
                        RV
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">Rahul Verma</h3>
                        <span className="text-[11px] text-white/55 font-medium block">Verified Customer • Executive</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 my-3 text-amber-400">
                      ★★★★★ <span className="text-xs font-mono font-bold text-amber-300 ml-1.5">5.0</span>
                    </div>

                    <p className="text-sm sm:text-[15px] text-white/90 leading-relaxed font-normal mt-2">
                      “Super convenient and reliable! The pickup and delivery service saves me so much time. Great experience from start to finish.”
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">Express Pickup</span>
                    <span className="text-[11px] text-emerald-400 font-medium">✓ Verified Review</span>
                  </div>
                </div>
              </div>

              {/* Review 3 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[24px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-2xl bg-neutral-900/50 hover:bg-neutral-800/70 border border-white/20 hover:border-white/45 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-center space-x-3.5 mb-4">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm tracking-wider bg-gradient-to-br from-emerald-400/20 to-teal-500/20 text-emerald-300 border border-emerald-400/30">
                        AG
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">Ananya Gupta</h3>
                        <span className="text-[11px] text-white/55 font-medium block">Verified Customer • Delicate Wardrobe</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 my-3 text-amber-400">
                      ★★★★★ <span className="text-xs font-mono font-bold text-amber-300 ml-1.5">5.0</span>
                    </div>

                    <p className="text-sm sm:text-[15px] text-white/90 leading-relaxed font-normal mt-2">
                      “The care they give to clothes is impressive. Everything feels clean, fresh, and perfectly finished. Highly recommended!”
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">Delicate Steam Press</span>
                    <span className="text-[11px] text-emerald-400 font-medium">✓ Verified Review</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. TAILORED CARE FEATURE CARDS */}
        <section id="cards-section" className="pt-16 sm:pt-20 pb-20 sm:pb-28 border-t border-white/10 relative bg-black/20 backdrop-blur-[2px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-[11px] sm:text-xs tracking-[0.25em] uppercase font-bold text-white/70 block mb-3">
                TAILORED LAUNDRY SOLUTIONS
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3">
                Care Built Around You
              </h2>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed font-normal">
                Experience a new standard in fabric freshness, convenience, and attentive laundry craftsmanship.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
              {/* Card 1 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[22px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-[3px] bg-black/35 hover:bg-black/55 border border-white/25 hover:border-white/50 shadow-[0_14px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase bg-white/10 text-white border border-white/25">
                      Premium Laundry Care
                    </div>
                    <span className="text-[11px] font-mono font-bold text-white/40 border border-white/15 px-2.5 py-0.5 rounded-lg bg-white/5">01</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug mb-2.5">
                    Your Clothes Deserve the Best
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal mb-6">
                    Experience exceptional laundry care with gentle cleaning, fresh results, and a perfect finish for your everyday essentials.
                  </p>
                </div>
                <div className="relative z-10 pt-3.5 border-t border-white/15 flex items-center justify-between">
                  <button
                    onClick={() => scrollToSection('services-section')}
                    className="interactive-btn px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/30 transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Explore Our Services</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                  <span className="text-[11px] text-white/40 font-mono tracking-wider">OFFICIAL SERVICE</span>
                </div>
              </div>

              {/* Card 2 */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[22px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-[3px] bg-black/35 hover:bg-black/55 border border-white/25 hover:border-white/50 shadow-[0_14px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1.5"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase bg-white/10 text-white border border-white/25">
                      Convenient Pickup &amp; Delivery
                    </div>
                    <span className="text-[11px] font-mono font-bold text-white/40 border border-white/15 px-2.5 py-0.5 rounded-lg bg-white/5">02</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug mb-2.5">
                    Laundry Made Easy
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal mb-6">
                    Skip the laundry-day hassle. Schedule a pickup, let us handle the cleaning, and enjoy fresh clothes delivered to your doorstep.
                  </p>
                </div>
                <div className="relative z-10 pt-3.5 border-t border-white/15 flex items-center justify-between">
                  <button
                    onClick={openEnquiryModal}
                    className="interactive-btn px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-black hover:bg-neutral-200 transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <span>Book a Pickup</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                  <span className="text-[11px] text-white/40 font-mono tracking-wider">OFFICIAL SERVICE</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. CONTACT SECTION */}
        <section id="contact-section" className="pt-20 sm:pt-28 pb-16 sm:pb-24 border-t border-white/10 relative overflow-hidden bg-black/25 backdrop-blur-[2px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
              <span className="text-xs sm:text-sm uppercase tracking-[0.25em] text-white/60 font-semibold block mb-3 sm:mb-4">
                Get In Touch
              </span>
              <h2 className="font-italic-headline text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-white leading-[1.08] tracking-tight mb-4">
                Effortless Care, <br />
                <span className="text-white/95">Always Within Reach</span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed font-normal">
                Connect directly with Bumble Wash for scheduled doorstep pickups, specialized fabric inquiries, or everyday laundry solutions across Mumbai.
              </p>
            </div>

            {/* 4 Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
              {/* Location */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[24px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-2xl bg-neutral-900/60 border border-white/20 hover:border-white/45 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/25 flex items-center justify-center text-white mb-5 shadow-inner">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5">Studio Location</span>
                  <h3 className="text-xl font-bold text-white tracking-tight mb-2 capitalize">maharashtra, mumbai</h3>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal mb-6">Doorstep laundry pickup and express drop-off across Mumbai.</p>
                </div>
                <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Bumble wash</span>
                  <button
                    onClick={openEnquiryModal}
                    className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    Pickup
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[24px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-2xl bg-neutral-900/60 border border-white/20 hover:border-white/45 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/25 flex items-center justify-center text-white mb-5 shadow-inner">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5">Phone Number</span>
                  <a href="tel:9834054348" className="text-xl font-bold text-white tracking-tight mb-2 hover:underline block">98340 54348</a>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal mb-6">Direct helpline for urgent bookings, special requests, and support.</p>
                </div>
                <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                  <a href="tel:9834054348" className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors">Call</a>
                  <button
                    onClick={() => copyToClipboard('98340 54348', 'Phone copied: 98340 54348')}
                    className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Email */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[24px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-2xl bg-neutral-900/60 border border-white/20 hover:border-white/45 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/25 flex items-center justify-center text-white mb-5 shadow-inner">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5">Official Gmail</span>
                  <a href="mailto:bumblewash26@gmail.com" className="text-base sm:text-lg font-bold text-white tracking-tight mb-2 hover:underline block truncate" title="bumblewash26@gmail.com">bumblewash26@gmail.com</a>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal mb-6">Corporate inquiries, delicate fabric specifications, and custom plans.</p>
                </div>
                <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                  <a href="mailto:bumblewash26@gmail.com" className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors">Email</a>
                  <button
                    onClick={() => copyToClipboard('bumblewash26@gmail.com', 'Email copied: bumblewash26@gmail.com')}
                    className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-medium uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Instagram */}
              <div
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                className="group relative overflow-hidden rounded-[24px] p-6 sm:p-7 flex flex-col justify-between text-left backdrop-blur-2xl bg-neutral-900/60 border border-white/20 hover:border-white/45 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/25 flex items-center justify-center text-white mb-5 shadow-inner">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5">Official Instagram</span>
                  <a href="https://www.instagram.com/bumblewash?utm_source=ig_web_button_share_sheet&srtk=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="text-xl font-bold text-white tracking-tight mb-2 hover:underline block">@bumblewash</a>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-normal mb-6">Follow us for fabric care tips, before &amp; after reveals, and updates.</p>
                </div>
                <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider">Social</span>
                  <a href="https://www.instagram.com/bumblewash?utm_source=ig_web_button_share_sheet&srtk=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors flex items-center gap-1.5">
                    <span>Visit</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Actions & Back to Top */}
            <div className="mt-14 sm:mt-18 pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative z-20">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4">
                <button
                  onClick={copyAllContactInfo}
                  className="inline-flex items-center space-x-2 px-5 py-3 rounded-full bg-white/[0.08] hover:bg-white/15 border border-white/20 text-white text-xs sm:text-sm font-semibold tracking-wider transition-all duration-300 cursor-pointer shadow-sm hover:border-white/40"
                >
                  <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  <span>{copyAllText}</span>
                </button>
                <button
                  onClick={openEnquiryModal}
                  className="inline-flex items-center space-x-2 px-5 py-3 rounded-full bg-white text-black text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.25)] cursor-pointer"
                >
                  <span>Book Pickup / Enquiry</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 17L17 7M17 7H7M17 7V17"></path></svg>
                </button>
              </div>

              <button
                onClick={scrollToTop}
                className="group inline-flex items-center space-x-3 px-6 sm:px-7 py-3.5 rounded-full bg-white/[0.08] hover:bg-white text-white hover:text-black border border-white/25 hover:border-white transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-105 cursor-pointer"
              >
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Back to Top</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 gap-4">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white uppercase tracking-wider">BUMBLE WASH</span>
                <span>•</span>
                <span>Maharashtra, Mumbai</span>
                <span>•</span>
                <span>© 2026</span>
              </div>

              <div className="flex items-center space-x-6 text-[11px] font-medium tracking-wider uppercase text-white/60">
                <button onClick={() => scrollToSection('services-section')} className="hover:text-white transition-colors cursor-pointer">Services</button>
                <button onClick={() => scrollToSection('stats-section')} className="hover:text-white transition-colors cursor-pointer">Stats</button>
                <button onClick={() => scrollToSection('reviews-section')} className="hover:text-white transition-colors cursor-pointer">Reviews</button>
                <button onClick={() => scrollToSection('cards-section')} className="hover:text-white transition-colors cursor-pointer">Tailored Care</button>
                <button onClick={scrollToTop} className="hover:text-white transition-colors cursor-pointer flex items-center gap-1">Top ↑</button>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* FLOATING BACK TO TOP BUTTON */}
      <button
        id="floatingBackToTop"
        onClick={scrollToTop}
        aria-label="Back to Top"
        className={`${showBackToTop ? '' : 'hidden'} fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-neutral-900/90 text-white hover:bg-white hover:text-black border border-white/25 hover:border-white shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-300 hover:scale-110 cursor-pointer`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
      </button>

      {/* TOAST NOTIFICATION */}
      <div
        id="toastNotification"
        className={`${toastVisible ? '' : 'hidden'} fixed bottom-6 left-6 z-50 bg-white text-black px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-neutral-300 transition-all duration-300`}
      >
        <svg className="w-5 h-5 text-black shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <div className="text-xs sm:text-sm">
          <span id="toastMsg" className="font-bold">{toastMessage || 'Action Triggered!'}</span>
          <p className="text-neutral-600 text-[11px]">Ready for booking or customer assistance.</p>
        </div>
        <button onClick={closeToast} className="ml-2 text-neutral-400 hover:text-black font-bold text-xs cursor-pointer">✕</button>
      </div>

      {/* ENQUIRY MODAL */}
      <div
        id="enquiryModal"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeEnquiryModal();
        }}
        className={`${enquiryModalOpen ? '' : 'hidden'} fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-200`}
      >
        <div className="relative w-full max-w-lg bg-neutral-950 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
            <div>
              <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-white/60 block mb-1">BUMBLE WASH CARE</span>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Send an Enquiry</h3>
            </div>
            <button
              onClick={closeEnquiryModal}
              className="p-2 rounded-full border border-white/20 text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleEnquirySubmit} className="mt-6 space-y-4 relative z-10 text-xs sm:text-sm">
            <div>
              <label className="block text-white/70 font-medium mb-1.5">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Jane Doe"
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 font-medium mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="jane@example.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 font-medium mb-1.5">Service Type</label>
                <select className="w-full px-4 py-3 bg-neutral-900 border border-white/15 rounded-xl text-white focus:outline-none focus:border-white transition-colors">
                  <option value="dry-cleaning">Dry Cleaning &amp; Press</option>
                  <option value="wash-fold">Wash &amp; Fold</option>
                  <option value="custom">Custom Fabric Care</option>
                  <option value="bulk">Corporate / Bulk</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-white/70 font-medium mb-1.5">Message / Requirements</label>
              <textarea
                rows={3}
                required
                placeholder="Tell us what garments or schedule you need..."
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors resize-none"
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full mt-2 py-3.5 bg-white text-black font-bold uppercase tracking-wider text-xs sm:text-sm rounded-full hover:bg-neutral-200 transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
            >
              <span>Submit Enquiry</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
