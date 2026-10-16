(() => {
  const FRAME_COUNT = 300;
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loaderBar');
  const floatingBackToTop = document.getElementById('floatingBackToTop');

  // Array to hold image objects
  const images = new Array(FRAME_COUNT);
  const loaded = new Array(FRAME_COUNT).fill(false);
  let loadedCount = 0;

  // Frame interpolation state for ultra-smooth gliding
  let targetProgress = 0;
  let currentProgress = 0;
  let targetFrame = 1;
  let currentFrame = 1;
  let lastDrawnFrameIndex = -1;

  function getFramePath(index) {
    const padded = String(index).padStart(3, '0');
    return `frames/ezgif-frame-${padded}.jpg`;
  }

  // Canvas viewport sizing & retina support
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for optimal 60fps performance

    canvas.width = Math.floor(viewportWidth * dpr);
    canvas.height = Math.floor(viewportHeight * dpr);

    // Force redraw on next frame
    lastDrawnFrameIndex = -1;
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();

  // Draw an image using crisp 'cover' aspect ratio fit
  function drawImage(img) {
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
  }

  // Request loading of a specific frame index (0-based)
  function requestFrame(index) {
    if (index < 0 || index >= FRAME_COUNT) return;
    if (images[index]) return; // already requested

    const img = new Image();
    images[index] = img;

    img.onload = () => {
      loaded[index] = true;
      loadedCount++;

      const progress = Math.round((loadedCount / FRAME_COUNT) * 100);
      if (loaderBar) loaderBar.style.width = `${progress}%`;

      // If frame 0 and nothing drawn yet, render immediately
      if (index === 0 && lastDrawnFrameIndex === -1) {
        drawImage(img);
        lastDrawnFrameIndex = 0;
      }

      // If user is currently looking at or near this frame, trigger a redraw
      const currentTarget = Math.min(Math.max(Math.round(currentFrame) - 1, 0), FRAME_COUNT - 1);
      if (Math.abs(currentTarget - index) <= 2) {
        lastDrawnFrameIndex = -1;
      }

      if (loadedCount >= FRAME_COUNT && loader) {
        setTimeout(() => loader.classList.add('loaded'), 250);
      }
    };

    img.onerror = () => {
      loaded[index] = false;
      loadedCount++;
      if (loadedCount >= FRAME_COUNT && loader) {
        loader.classList.add('loaded');
      }
    };

    img.src = getFramePath(index + 1);
  }

  // Find nearest already-loaded image
  function getNearestLoadedImage(targetIdx) {
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
  }

  // Prioritize frames around current target
  function prioritizeFrames(centerIdx) {
    for (let offset = 0; offset <= 10; offset++) {
      if (offset === 0) {
        requestFrame(centerIdx);
      } else {
        requestFrame(centerIdx + offset);
        requestFrame(centerIdx - offset);
      }
    }
  }

  // Load first 20 frames immediately for instant launch
  for (let i = 0; i < 20; i++) {
    requestFrame(i);
  }

  // Background queue to preload remaining frames progressively
  let bgIndex = 20;
  function preloadBatch() {
    if (bgIndex >= FRAME_COUNT) return;
    const batchEnd = Math.min(bgIndex + 8, FRAME_COUNT);
    for (; bgIndex < batchEnd; bgIndex++) {
      requestFrame(bgIndex);
    }
    if (bgIndex < FRAME_COUNT) {
      setTimeout(preloadBatch, 35);
    }
  }
  setTimeout(preloadBatch, 80);

  // Compute scroll progress from document scroll
  function updateScroll() {
    const doc = document.documentElement;
    const body = document.body;
    const scrollTop = window.pageYOffset || doc.scrollTop || body.scrollTop || window.scrollY || 0;
    const scrollHeight = Math.max(doc.scrollHeight, body.scrollHeight);
    const clientHeight = window.innerHeight || doc.clientHeight || 1;
    const maxScroll = scrollHeight - clientHeight;

    targetProgress = maxScroll > 0 ? Math.min(Math.max(scrollTop / maxScroll, 0), 1) : 0;
    targetFrame = 1 + targetProgress * (FRAME_COUNT - 1);

    const centerIdx = Math.round(targetFrame) - 1;
    prioritizeFrames(centerIdx);

    // Floating Back to Top button toggle
    if (floatingBackToTop) {
      if (scrollTop > 350) {
        floatingBackToTop.classList.remove('hidden');
      } else {
        floatingBackToTop.classList.add('hidden');
      }
    }
  }

  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('wheel', updateScroll, { passive: true });
  window.addEventListener('touchmove', updateScroll, { passive: true });

  updateScroll();

  // Ultra-Smooth Animation Render Loop with Fluid Damping
  function loop() {
    // 0.085 gives an ultra-silky, cinematic ease-in/ease-out deceleration
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

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // 3D Tilt Card Interaction
  const cards = document.querySelectorAll('.group');
  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotateX = (-y / rect.height) * 8;
      const rotateY = (x / rect.width) * 8;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
})();

// Global Helper Functions for Navigation and Modals
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

function toggleMobileMenu() {
  const drawer = document.getElementById('mobileDrawer');
  const menuIcon = document.getElementById('menuIcon');
  const closeIcon = document.getElementById('closeIcon');
  if (drawer.classList.contains('hidden')) {
    drawer.classList.remove('hidden');
    menuIcon.classList.add('hidden');
    closeIcon.classList.remove('hidden');
  } else {
    drawer.classList.add('hidden');
    menuIcon.classList.remove('hidden');
    closeIcon.classList.add('hidden');
  }
}

function openEnquiryModal() {
  const modal = document.getElementById('enquiryModal');
  if (modal) modal.classList.remove('hidden');
}

function closeEnquiryModal() {
  const modal = document.getElementById('enquiryModal');
  if (modal) modal.classList.add('hidden');
}

function handleEnquirySubmit(e) {
  e.preventDefault();
  closeEnquiryModal();
  showToast('Enquiry submitted successfully! We will contact you shortly.');
}

function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMsg');
  if (toast && toastMsg) {
    toastMsg.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 4000);
  }
}

function closeToast() {
  const toast = document.getElementById('toastNotification');
  if (toast) toast.classList.add('hidden');
}

function copyToClipboard(text, msg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(msg || `Copied: ${text}`);
  });
}

function copyAllContactInfo() {
  const contactText = `Bumble wash\nAddress: maharashtra, mumbai\nPhone: 98340 54348\nEmail: bumblewash26@gmail.com\nInstagram: https://www.instagram.com/bumblewash?utm_source=ig_web_button_share_sheet&srtk=ZDNlZDc0MzIxNw==`;
  navigator.clipboard.writeText(contactText).then(() => {
    const btnText = document.getElementById('copyAllBtnText');
    if (btnText) btnText.textContent = '✓ Copied All Info';
    showToast('All contact details copied to clipboard!');
    setTimeout(() => {
      if (btnText) btnText.textContent = 'Copy All Details';
    }, 2500);
  });
}
