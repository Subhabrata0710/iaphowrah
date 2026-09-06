/* ============================================================
   IAP Howrah | 45th WB PEDICON 2026
   Shared JavaScript — Navigation, Animations, Registration,
   Dashboard, Countdown, Gallery Lightbox, QR, Print Receipt
   ============================================================ */

(function () {
  'use strict';

  // ============================================================
  // CONFERENCE CONFIGURATION
  // Update conference details here for the entire website
  // ============================================================
  const CONFERENCE_CONFIG = {
    name: '45th WB PEDICON',
    fullName: '45th West Bengal Pediatric Conference',
    year: '2026',
    dates: '19–20 December 2026',
    dateStart: '2026-12-19', // used for countdown
    venue: 'The Park Hotel, Kolkata',
    venueShort: 'The Park, Kolkata',
    organizer: 'IAP Howrah — Howrah Academy of Pediatrics',
    partners: ['Indian Academy of Pediatrics', 'West Bengal Academy of Pediatrics', 'Howrah Academy of Pediatrics'],
    confPartner: 'Roshni Enterprise Event Management',
    confPartnerPhone: '9830367423',
    idPrefix: 'WBP26',
    earlyBirdEnd: '2026-09-30', // inclusive
    secondPeriodEnd: '2026-10-31', // inclusive
  };

  // ============================================================
  // REGISTRATION FEE CONFIGURATION
  // ============================================================
  const REGISTRATION_FEES = {
    Delegate: {
      earlyBird: 2500,  // up to 30 Sep 2026
      regular: 3000   // 1 Oct – 31 Oct 2026
    },
    PGT: {
      earlyBird: 1500,
      regular: 2000
    },
    'Senior Citizen': {
      earlyBird: 0,
      regular: 0,
      isFree: true
    },
    Faculty: {
      // earlyBird: 1000,  // ← UNCOMMENT when Faculty pricing is confirmed
      // regular:   1000,  // ← UNCOMMENT when Faculty pricing is confirmed
      earlyBird: null,
      regular: null,
      tba: true
    }
  };

  // ============================================================
  // APPS SCRIPT API URL — Replace with deployed Web App URL
  // ============================================================
  const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbwEILzmJlnn8GWLTUSfhBt1JJwuQVGkMuXDZd9Rgqnazs-u8Y8erLIBEgSkP1od1vzj/exec',
    RZP_KEY: 'rzp_live_TVAc2I0MUmZ44U',
    ANIMATION_THRESHOLD: 0.15,
    TOAST_DURATION: 4500,
    LOADER_DELAY: 600
  };

  // Expose config globally for pages that need it
  window.WBP_CONFIG = CONFERENCE_CONFIG;
  window.WBP_FEES = REGISTRATION_FEES;
  window.WBP_API_CONFIG = CONFIG;

  // ============================================================
  // DOM READY
  // ============================================================
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadComponent('nav-placeholder', 'nav.html', initNavigation);
    loadComponent('footer-placeholder', 'footer.html');
    initHeroCarousel();
    initScrollAnimations();
    initSmoothScroll();
    initBackToTop();
    initLoader();
    initCountdownIfExists();
    initGalleryIfExists();
    initFAQs();
  }

  // ============================================================
  // COMPONENT LOADER
  // ============================================================
  function loadComponent(placeholderId, file, callback) {
    const el = document.getElementById(placeholderId);
    if (!el) return;
    fetch(file + '?v=' + Date.now())
      .then(r => r.text())
      .then(html => {
        el.innerHTML = html;
        if (callback) callback();
        highlightActiveNav();
      })
      .catch(err => console.warn('Failed to load ' + file + ':', err));
  }

  // ============================================================
  // NAVIGATION
  // ============================================================
  function initNavigation() {
    const toggle = document.querySelector('.nav-toggle');
    const mobile = document.querySelector('.nav-mobile');
    const overlay = document.querySelector('.nav-overlay');
    const navbar = document.querySelector('.navbar');

    function closeMenu() {
      if (toggle) toggle.classList.remove('active');
      if (mobile) mobile.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (toggle && mobile) {
      toggle.addEventListener('click', () => {
        if (mobile.classList.contains('open')) {
          closeMenu();
        } else {
          toggle.classList.add('active');
          mobile.classList.add('open');
          if (overlay) overlay.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      });
      toggle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') toggle.click(); });
      mobile.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
      if (overlay) overlay.addEventListener('click', closeMenu);
    }

    if (navbar) {
      window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
      }, { passive: true });
    }
  }

  function highlightActiveNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage) link.classList.add('active');
    });
  }

  // ============================================================
  // NOTICE TICKER (marquee)
  // ============================================================
  // Update notices here — displayed in the scrolling ticker
  // const NOTICES = [
  // HERO CAROUSEL
  // ============================================================
  function initHeroCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dots .dot');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    if (!slides.length) return;

    let currentIndex = 0;
    let interval;

    function goToSlide(index) {
      slides[currentIndex].classList.remove('active');
      dots[currentIndex].classList.remove('active');

      currentIndex = index;

      slides[currentIndex].classList.add('active');
      dots[currentIndex].classList.add('active');
    }

    function nextSlide() {
      let nextIndex = (currentIndex + 1) % slides.length;
      goToSlide(nextIndex);
    }

    function prevSlide() {
      let prevIndex = (currentIndex - 1 + slides.length) % slides.length;
      goToSlide(prevIndex);
    }

    function startAutoplay() {
      interval = setInterval(nextSlide, 5000);
    }

    function resetAutoplay() {
      clearInterval(interval);
      startAutoplay();
    }

    if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetAutoplay(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetAutoplay(); });

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        if (currentIndex !== index) {
          goToSlide(index);
          resetAutoplay();
        }
      });
    });

    startAutoplay();
  };

  // ============================================================
  // COUNTDOWN TIMER
  // ============================================================
  function initCountdownIfExists() {
    const timerEl = document.getElementById('countdown-timer');
    if (!timerEl) return;

    const targetDate = new Date(CONFERENCE_CONFIG.dateStart + 'T00:00:00+05:30');

    function update() {
      const now = new Date();
      const diff = targetDate - now;
      if (diff <= 0) {
        timerEl.innerHTML = '<span class="countdown-num" style="font-size:1.2rem;color:#fff;">Conference is underway!</span>';
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      timerEl.innerHTML = [
        { num: days, unit: 'Days' },
        { num: hours, unit: 'Hours' },
        { num: minutes, unit: 'Minutes' },
        { num: seconds, unit: 'Seconds' }
      ].map(({ num, unit }) =>
        `<div class="countdown-box">
           <span class="countdown-num">${String(num).padStart(2, '0')}</span>
           <span class="countdown-unit">${unit}</span>
         </div>`
      ).join('');
    }

    update();
    setInterval(update, 1000);
  };

  // ============================================================
  // SCROLL ANIMATIONS
  // ============================================================
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: CONFIG.ANIMATION_THRESHOLD });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    setTimeout(() => {
      document.querySelectorAll('.animate-on-scroll:not(.visible)').forEach(el => observer.observe(el));
    }, 500);
  };

  // ============================================================
  // SMOOTH SCROLL
  // ============================================================
  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
      }
    });
  };

  // ============================================================
  // BACK TO TOP
  // ============================================================
  function initBackToTop() {
    const btn = document.querySelector('.back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  // ============================================================
  // PAGE LOADER
  // ============================================================
  function initLoader() {
    const loader = document.querySelector('.loader-overlay');
    if (!loader) return;

    function hideLoader() {
      setTimeout(() => {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 500);
      }, CONFIG.LOADER_DELAY);
    }

    if (document.readyState === 'complete') {
      hideLoader();
    } else {
      window.addEventListener('load', hideLoader);
    }
  };

  // ============================================================
  // FAQ ACCORDION
  // ============================================================
  function initFAQs() {
    document.querySelectorAll('.faq-question').forEach(q => {
      q.addEventListener('click', () => {
        const item = q.parentElement;
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  };

  // ============================================================
  // GALLERY LIGHTBOX
  // ============================================================
  function initGalleryIfExists() {
    const lb = document.getElementById('lightbox');
    if (!lb) return;

    const lbImg = lb.querySelector('.lightbox-img');
    const lbClose = lb.querySelector('.lightbox-close');
    const lbPrev = lb.querySelector('.lightbox-prev');
    const lbNext = lb.querySelector('.lightbox-next');
    const items = document.querySelectorAll('.gallery-item[data-src]');

    let currentIdx = 0;

    function open(idx) {
      currentIdx = idx;
      const src = items[idx].getAttribute('data-src');
      if (lbImg) lbImg.src = src;
      lb.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lb.classList.remove('active');
      document.body.style.overflow = '';
    }
    function prev() { open((currentIdx - 1 + items.length) % items.length); }
    function next() { open((currentIdx + 1) % items.length); }

    items.forEach((item, idx) => item.addEventListener('click', () => open(idx)));
    if (lbClose) lbClose.addEventListener('click', close);
    if (lbPrev) lbPrev.addEventListener('click', prev);
    if (lbNext) lbNext.addEventListener('click', next);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });

    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('active')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    });
  };

  // ============================================================
  // TOAST NOTIFICATIONS
  // ============================================================
  window.showToast = function (message, type) {
    type = type || 'success';
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span><span class="toast-message">${message}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, CONFIG.TOAST_DURATION);
  };

  // ============================================================
  // REGISTRATION — FEE CALCULATION
  // ============================================================
  window.getRegistrationPeriod = function () {
    const now = new Date();
    const earlyBirdEnd = new Date(CONFERENCE_CONFIG.earlyBirdEnd + 'T23:59:59+05:30');
    const secondEnd = new Date(CONFERENCE_CONFIG.secondPeriodEnd + 'T23:59:59+05:30');

    if (now <= earlyBirdEnd) return 'earlyBird';
    if (now <= secondEnd) return 'regular';
    return 'tba'; // after 31 Oct — show TBA
  };

  window.getFeeForCategory = function (category) {
    const period = getRegistrationPeriod();
    const fees = REGISTRATION_FEES[category];
    if (!fees) return null;
    if (fees.isFree) return { amount: 0, isFree: true, period };
    if (fees.tba || period === 'tba') return { amount: null, tba: true, period };
    const amount = fees[period];
    if (amount === null) return { amount: null, tba: true, period };
    return { amount, isFree: false, tba: false, period };
  };

  window.updateRegistrationFee = function () {
    const categoryEl = document.getElementById('reg-category');
    const feeBox = document.getElementById('fee-display-box');
    const totalEl = document.getElementById('total-display');
    const uploadContainer = document.getElementById('upload-container');
    const uploadLabel = document.getElementById('upload-label');
    const regDoc = document.getElementById('reg-doc');

    if (!categoryEl || !feeBox) return;

    const category = categoryEl.value;
    if (!category) {
      feeBox.style.display = 'none';
      if (uploadContainer) uploadContainer.style.display = 'none';
      return;
    }

    if (uploadContainer && regDoc && uploadLabel) {
      if (category === 'PGT') {
        uploadContainer.style.display = 'block';
        uploadLabel.textContent = 'Upload Auth Letter from HOD *';
        regDoc.required = false;
      } else if (category === 'Senior Citizen') {
        uploadContainer.style.display = 'block';
        uploadLabel.textContent = 'Upload ID Proof (Aadhar, PAN, etc.) *';
        regDoc.required = true;
      } else {
        uploadContainer.style.display = 'none';
        regDoc.required = false;
        regDoc.value = '';
      }
    }

    const result = getFeeForCategory(category);
    feeBox.style.display = 'block';

    const periodLabels = {
      earlyBird: '🐦 Early Bird — Up to 30 September 2026',
      regular: '📅 Regular — 1 October to 31 October 2026',
      tba: '📢 Period Ended'
    };

    if (!result) {
      feeBox.innerHTML = `<div class="fee-period">Category not configured</div>`;
      if (totalEl) totalEl.textContent = '—';
      return;
    }
    if (result.isFree) {
      feeBox.innerHTML = `
        <div class="fee-period">${periodLabels[result.period] || ''}</div>
        <div class="fee-amount" style="color:var(--color-success)">FREE</div>
        <div class="fee-note">Senior Citizen (>65 years) — Complimentary Registration</div>`;
      if (totalEl) totalEl.textContent = 'FREE';
    } else if (result.tba || result.amount === null) {
      feeBox.innerHTML = `
        <div class="fee-period">Registration Fee</div>
        <div class="fee-amount" style="font-size:1.2rem;color:var(--color-text-muted)">To Be Announced</div>
        <div class="fee-note">Fee details for this category will be updated soon. Please contact the conference secretariat.</div>`;
      if (totalEl) totalEl.textContent = '—';
    } else {
      feeBox.innerHTML = `
        <div class="fee-period">${periodLabels[result.period] || ''}</div>
        <div class="fee-amount">₹${result.amount.toLocaleString('en-IN')}</div>
        <div class="fee-note">Inclusive of conference kit, certificate &amp; meals</div>`;
      if (totalEl) totalEl.textContent = '₹' + result.amount.toLocaleString('en-IN');
    }
  };

  // ============================================================
  // REGISTRATION — SUBMIT (Razorpay)
  // ============================================================
  window.payAndRegisterWBP = function () {
    const name = document.getElementById('reg-name')?.value.trim();
    const mobile = document.getElementById('reg-mobile')?.value.trim();
    const altMob = document.getElementById('reg-alt-mobile')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const category = document.getElementById('reg-category')?.value;
    const inst = document.getElementById('reg-institution')?.value.trim();
    const desig = document.getElementById('reg-designation')?.value.trim();

    // Validation
    if (!name || !mobile || !email || !category || !inst || !desig) {
      return showToast('Please fill all required fields.', 'error');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showToast('Please enter a valid email address.', 'error');
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return showToast('Please enter a valid 10-digit Indian mobile number.', 'error');
    }

    const regDoc = document.getElementById('reg-doc');
    if (regDoc && regDoc.required && (!regDoc.files || regDoc.files.length === 0)) {
      return showToast('Please upload the required document.', 'error');
    }
    if (regDoc && regDoc.files && regDoc.files.length > 0) {
      if (regDoc.files[0].size > 2 * 1024 * 1024) {
        return showToast('File size must be less than 2MB.', 'error');
      }
    }

    const feeResult = getFeeForCategory(category);
    if (!feeResult) return showToast('Invalid category selected.', 'error');

    if (feeResult.tba || feeResult.amount === null) {
      return showToast('Registration fee for Faculty is not yet configured. Please contact the secretariat.', 'info');
    }

    const amount = feeResult.amount;

    // Free registration — skip Razorpay
    if (feeResult.isFree || amount === 0) {
      processRegistrationWithDoc('FREE_' + Date.now(), 0, feeResult);
      return;
    }

    // Razorpay Payment
    const rzpOptions = {
      key: CONFIG.RZP_KEY,
      amount: amount * 100,
      currency: 'INR',
      name: CONFERENCE_CONFIG.name,
      description: category + ' — Conference Registration',
      image: 'images/iap-howrah-logo.png',
      handler: function (response) {
        processRegistrationWithDoc(response.razorpay_payment_id, amount, feeResult);
      },
      prefill: { name, email, contact: mobile },
      theme: { color: '#0b2c4d' },
      modal: {
        ondismiss: function () {
          showToast('Payment cancelled. You can try again.', 'info');
        }
      }
    };

    const rzp = new Razorpay(rzpOptions);
    rzp.on('payment.failed', function (response) {
      showToast('Payment Failed: ' + response.error.description, 'error');
    });
    rzp.open();
  };

  function processRegistrationWithDoc(paymentId, amount, feeResult) {
    const btn = document.getElementById('reg-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }
    const regDoc = document.getElementById('reg-doc');

    if (regDoc && regDoc.files && regDoc.files.length > 0) {
      const file = regDoc.files[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        const base64Data = e.target.result.split(',')[1];
        registerBackendWBP(paymentId, amount, feeResult, {
          data: base64Data,
          mimeType: file.type,
          name: file.name
        });
      };
      reader.onerror = function () {
        showToast('Failed to read document. Please try again.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Payment'; }
      };
      reader.readAsDataURL(file);
    } else {
      registerBackendWBP(paymentId, amount, feeResult, null);
    }
  }

  function registerBackendWBP(paymentId, amount, feeResult, docObj) {
    const btn = document.getElementById('reg-submit-btn');
    if (btn && btn.textContent !== 'Processing…') { btn.disabled = true; btn.textContent = 'Processing…'; }

    const data = {
      action: 'register',
      name: document.getElementById('reg-name')?.value.trim(),
      mobile: document.getElementById('reg-mobile')?.value.trim(),
      altMobile: document.getElementById('reg-alt-mobile')?.value.trim() || '',
      email: document.getElementById('reg-email')?.value.trim(),
      category: document.getElementById('reg-category')?.value,
      institution: document.getElementById('reg-institution')?.value.trim(),
      designation: document.getElementById('reg-designation')?.value.trim(),
      amount,
      period: feeResult.period || '',
      paymentId,
      isFree: feeResult.isFree || false,
      docData: docObj ? docObj.data : null,
      docMimeType: docObj ? docObj.mimeType : null,
      docName: docObj ? docObj.name : null
    };

    const sendRequest = function (retryCount) {
      fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify(data) })
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(result => {
          if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Payment'; }
          if (result.success) {
            showRegistrationSuccess(result, data);
          } else if (result.duplicate) {
            showToast('Registration already exists for this email/mobile. ID: ' + result.regId, 'info');
          } else {
            showToast('Error: ' + (result.message || 'Registration failed'), 'error');
          }
        })
        .catch(err => {
          if (retryCount < 1) {
            setTimeout(() => sendRequest(retryCount + 1), 2000);
          } else {
            if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Payment'; }
            showToast('Network Error. Payment ID: ' + paymentId + '. Please contact: 98303 67423', 'error');
          }
        });
    };
    sendRequest(0);
  };

  function showRegistrationSuccess(result, data) {
    const container = document.getElementById('reg-form-container');
    const success = document.getElementById('reg-success-container');
    if (!success) {
      showToast('Registration Successful! ID: ' + result.regId, 'success');
      return;
    }
    if (container) container.style.display = 'none';
    success.style.display = 'block';

    // Populate success screen
    const fields = {
      's-reg-id': result.regId,
      's-name': data.name,
      's-category': data.category,
      's-email': data.email,
      's-mobile': data.mobile,
      's-inst': data.institution,
      's-amount': data.isFree ? 'FREE' : '₹' + data.amount.toLocaleString('en-IN'),
      's-period': data.period === 'earlyBird' ? 'Early Bird' : data.period === 'regular' ? 'Regular' : 'N/A',
      's-date': CONFERENCE_CONFIG.dates,
      's-venue': CONFERENCE_CONFIG.venue
    };
    Object.keys(fields).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = fields[id];
    });

    // Generate QR code
    generateQRCode(result.regId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================================
  // QR CODE GENERATION
  // ============================================================
  window.generateQRCode = function (regId) {
    const container = document.getElementById('qr-container');
    if (!container) return;

    const text = CONFERENCE_CONFIG.name + ' | ' + regId + ' | ' + CONFERENCE_CONFIG.dates + ' | ' + CONFERENCE_CONFIG.venue;
    const qrApiUrl = 'https://quickchart.io/qr?text=' + encodeURIComponent(text) + '&margin=2&size=250&ecLevel=M';
    container.innerHTML = `<img src="${qrApiUrl}" alt="Registration QR Code for ${regId}" class="qr-code-img" loading="lazy" style="width:200px;height:200px;border-radius:8px;border:1px solid var(--color-border);">
                           <p style="font-size:0.82rem;color:var(--color-text-muted);margin-top:0.5rem;">${regId}</p>`;
  };

  // ============================================================
  // PRINT RECEIPT
  // ============================================================
  window.printRegistrationReceipt = function () {
    window.print();
  };

  // ============================================================
  // DASHBOARD — LOOKUP REGISTRATION
  // ============================================================
  window.lookupRegistration = async function () {
    const regId = document.getElementById('lookup-regid')?.value.trim().toUpperCase();
    const contact = document.getElementById('lookup-contact')?.value.trim();
    const btn = document.getElementById('lookup-btn');
    const result = document.getElementById('dashboard-result');

    if (!regId || !contact) {
      return showToast('Please enter both Registration ID and Email/Mobile.', 'error');
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Looking up…'; }

    try {
      const res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'lookup', regId, contact })
      });
      const data = await res.json();

      if (btn) { btn.disabled = false; btn.textContent = 'Find Registration'; }

      if (data.success && data.registration) {
        const reg = data.registration;
        if (result) {
          result.style.display = 'block';
          const fields = {
            'd-reg-id': reg.regId,
            'd-name': reg.name,
            'd-category': reg.category,
            'd-inst': reg.institution,
            'd-desig': reg.designation,
            'd-mobile': reg.mobile,
            'd-email': reg.email,
            'd-amount': reg.isFree ? 'FREE' : '₹' + (reg.amount || 0).toLocaleString('en-IN'),
            'd-status': reg.paymentStatus || 'Confirmed',
            'd-date': CONFERENCE_CONFIG.dates,
            'd-venue': CONFERENCE_CONFIG.venue
          };
          Object.keys(fields).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = fields[id];
          });
          generateQRCode(reg.regId);
        }
      } else if (data.notFound) {
        showToast('No registration found. Please check the details.', 'error');
        if (result) result.style.display = 'none';
      } else {
        showToast(data.message || 'Lookup failed. Please try again.', 'error');
      }
    } catch {
      if (btn) { btn.disabled = false; btn.textContent = 'Find Registration'; }
      showToast('Network error. Please try again.', 'error');
    }
  };

  // ============================================================
  // CONTACT FORM
  // ============================================================
  window.submitContactForm = async function (e) {
    e.preventDefault();
    const btn = document.getElementById('contact-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    const data = {
      action: 'contact',
      name: document.getElementById('contact-name')?.value.trim(),
      email: document.getElementById('contact-email')?.value.trim(),
      mobile: document.getElementById('contact-phone')?.value.trim(),
      subject: document.getElementById('contact-subject')?.value.trim(),
      message: document.getElementById('contact-message')?.value.trim()
    };

    if (!data.name || !data.email || !data.message) {
      if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; }
      return showToast('Please fill all required fields.', 'error');
    }

    try {
      const res = await fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify(data) });
      const result = await res.json();
      if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; }
      if (result.success) {
        showToast('Message sent! We will get back to you soon.', 'success');
        document.getElementById('contact-form')?.reset();
      } else {
        showToast(result.message || 'Failed to send. Please try again.', 'error');
      }
    } catch {
      if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; }
      showToast('Network error. Please try calling us at 98303 67423.', 'error');
    }
  };

  // ============================================================
  // PROGRAM TABS
  // ============================================================
  window.initProgramTabs = function () {
    const tabs = document.querySelectorAll('.tab-btn[data-day]');
    const timelines = document.querySelectorAll('.program-timeline');
    if (!tabs.length) return;
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        timelines.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = document.querySelector('.program-timeline[data-day="' + tab.getAttribute('data-day') + '"]');
        if (target) target.classList.add('active');
      });
    });
  };

})();

// Init program tabs after DOM loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof initProgramTabs === 'function') initProgramTabs();
  });
} else {
  if (typeof initProgramTabs === 'function') initProgramTabs();
}
