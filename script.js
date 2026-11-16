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
    earlyBirdEnd: '2026-10-20', // inclusive
    secondPeriodEnd: '2026-11-15', // inclusive
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
  // WORKSHOP CONFIGURATION
  // Easily add more workshops here as key-value items!
  // ============================================================
  const WORKSHOP_CONFIG = {
    adolescent: {
      id: 'adolescent',
      name: 'Adolescent Workshop',
      title: 'Adolescent Workshop (18th Dec 2026, B R Hospital Auditorium)',
      fee: 1000,
      date: '18th December 2026',
      venue: 'B R Singh Hospital Auditorium',
      description: ''
    },
     nephro: {
      id: 'nephro-w',
      name: 'Nephrology Workshop',
      title: 'Nephrology Workshop (18th Dec 2026, Neotia Bhagirathi women and child care cente, New Town)',
      fee: 1000,
      date: '18th December 2026',
      venue: ' Neotia Bhagirathi women and child care cente, New Town',
      description: ''
     }
  };

  // ============================================================
  // APPS SCRIPT API URL — Replace with deployed Web App URL
  // ============================================================
  const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycby_fHqSMJ7pENWboigTH0gSb-PF40siosT1EBaVy_pl5h0u2yX5aO4l-YVsDExA907Z/exec',
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
    initAlreadyRegisteredModal();
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
  // Current already-registered session (if user fetched an existing reg)
  let activeExistingReg = null;

  // ============================================================
  // WORKSHOP RENDERING & SELECTION (Multi-Select Checkboxes)
  // ============================================================

  // Renders checkboxes from WORKSHOP_CONFIG into #workshop-list-container
  function renderWorkshopCheckboxes(alreadyRegistered) {
    const container = document.getElementById('workshop-list-container');
    if (!container) return;

    const existing = Array.isArray(alreadyRegistered)
      ? alreadyRegistered
      : (typeof alreadyRegistered === 'string' && alreadyRegistered)
        ? alreadyRegistered.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const workshopKeys = Object.keys(WORKSHOP_CONFIG);
    if (!workshopKeys.length) {
      container.innerHTML = '<p class="text-muted" style="font-size:0.9rem;">No workshops available at this time.</p>';
      return;
    }

    container.innerHTML = workshopKeys.map(key => {
      const ws = WORKSHOP_CONFIG[key];
      const isAlready = existing.some(e => e.toLowerCase() === ws.name.toLowerCase());
      const checkId = 'ws-chk-' + key;
      return `<label for="${checkId}" class="workshop-card${isAlready ? ' workshop-card--done' : ''}">
        <input type="checkbox" id="${checkId}" class="workshop-checkbox" value="${key}"${isAlready ? ' disabled checked' : ''} onchange="updateRegistrationFee()">
        <div class="workshop-card-body">
          <div class="workshop-card-name">${ws.name}</div>
          <div class="workshop-card-meta">${ws.date} &nbsp;|&nbsp; ${ws.venue}</div>
          <div class="workshop-card-desc" style="font-size:0.82rem;color:#555;margin-top:3px;">${ws.description}</div>
        </div>
        <div class="workshop-card-fee">${isAlready ? '<span style="color:var(--color-success);font-weight:700;">✔ Registered</span>' : '&#8377;' + ws.fee.toLocaleString('en-IN')}</div>
      </label>`;
    }).join('');
  }

  // Returns array of WORKSHOP_CONFIG objects for all NEW checkboxes that are checked (not already registered)
  function getSelectedWorkshops() {
    const checked = document.querySelectorAll('.workshop-checkbox:checked:not(:disabled)');
    return Array.from(checked).map(el => WORKSHOP_CONFIG[el.value]).filter(Boolean);
  }

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

    const selectedWorkshops = getSelectedWorkshops(); // array of WORKSHOP_CONFIG objects
    const totalWorkshopFee = selectedWorkshops.reduce((sum, ws) => sum + (ws.fee || 0), 0);
    const workshopNames = selectedWorkshops.map(ws => ws.name).join(', ');

    // CASE 1: ALREADY REGISTERED USER ADDING WORKSHOP(S)
    if (activeExistingReg) {
      if (uploadContainer) uploadContainer.style.display = 'none';
      feeBox.style.display = 'block';

      if (selectedWorkshops.length > 0) {
        const breakdown = selectedWorkshops.map(ws =>
          `${ws.name}: &#8377;${ws.fee.toLocaleString('en-IN')}`
        ).join('<br>');
        feeBox.innerHTML = `
          <div class="fee-period">Workshop Add-On(s) for Verified Registration (${activeExistingReg.regId})</div>
          <div class="fee-amount">&#8377;${totalWorkshopFee.toLocaleString('en-IN')}</div>
          <div class="fee-note">${breakdown}<br><small>(Conference already registered)</small></div>`;
        if (totalEl) totalEl.textContent = '₹' + totalWorkshopFee.toLocaleString('en-IN');
      } else {
        feeBox.innerHTML = `
          <div class="fee-period">Existing Conference Registration Verified (${activeExistingReg.regId})</div>
          <div class="fee-amount" style="color:var(--color-success)">No Workshop Selected</div>
          <div class="fee-note">Please select a workshop above to add it to your existing registration.</div>`;
        if (totalEl) totalEl.textContent = '₹0';
      }
      return;
    }

    // CASE 2: REGULAR NEW REGISTRATION
    const category = categoryEl.value;
    if (!category) {
      feeBox.style.display = 'none';
      if (uploadContainer) uploadContainer.style.display = 'none';
      if (totalEl) totalEl.textContent = '—';
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
      earlyBird: 'Early Bird — Up to 20 October 2026',
      regular: 'Regular — 21 October to 15 November 2026',
      tba: '📢 Period Ended'
    };

    if (!result) {
      feeBox.innerHTML = `<div class="fee-period">Category not configured</div>`;
      if (totalEl) totalEl.textContent = '—';
      return;
    }

    const wsBreakdown = selectedWorkshops.length > 0
      ? selectedWorkshops.map(ws => `+ ${ws.name}: &#8377;${ws.fee.toLocaleString('en-IN')}`).join('<br>')
      : '';

    if (result.isFree) {
      const grandTotal = totalWorkshopFee;
      feeBox.innerHTML = `
        <div class="fee-period">${periodLabels[result.period] || ''}</div>
        <div class="fee-amount" style="color:var(--color-success)">${grandTotal > 0 ? '&#8377;' + grandTotal.toLocaleString('en-IN') : 'FREE'}</div>
        <div class="fee-note">
          Conference: FREE (Senior Citizen &gt;65 years)
          ${wsBreakdown ? '<br>' + wsBreakdown : ''}
        </div>`;
      if (totalEl) totalEl.textContent = grandTotal > 0 ? '₹' + grandTotal.toLocaleString('en-IN') : 'FREE';
    } else if (result.tba || result.amount === null) {
      feeBox.innerHTML = `
        <div class="fee-period">Registration Fee</div>
        <div class="fee-amount" style="font-size:1.2rem;color:var(--color-text-muted)">To Be Announced</div>
        <div class="fee-note">Fee details for this category will be updated soon. Please contact the conference secretariat.</div>`;
      if (totalEl) totalEl.textContent = '—';
    } else {
      const confFee = result.amount;
      const grandTotal = confFee + totalWorkshopFee;
      feeBox.innerHTML = `
        <div class="fee-period">${periodLabels[result.period] || ''}</div>
        <div class="fee-amount">&#8377;${grandTotal.toLocaleString('en-IN')}</div>
        <div class="fee-note">
          Conference: &#8377;${confFee.toLocaleString('en-IN')}
          ${wsBreakdown ? '<br>' + wsBreakdown : ''}
          <br><small style="opacity:0.85;">Inclusive of conference kit, certificate &amp; meals</small>
        </div>`;
      if (totalEl) totalEl.textContent = '₹' + grandTotal.toLocaleString('en-IN');
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
    const selectedWorkshops = getSelectedWorkshops(); // array
    const totalWorkshopFee = selectedWorkshops.reduce((s, ws) => s + (ws.fee || 0), 0);
    const workshopNames = selectedWorkshops.map(ws => ws.name).join(', ');

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

    // If ALREADY REGISTERED attendee is adding workshop(s)
    if (activeExistingReg) {
      if (selectedWorkshops.length === 0) {
        return showToast('Please select at least one workshop to add to your registration.', 'info');
      }

      const rzpOptions = {
        key: CONFIG.RZP_KEY,
        amount: totalWorkshopFee * 100,
        currency: 'INR',
        name: CONFERENCE_CONFIG.name,
        description: 'Workshop(s): ' + workshopNames + ' (Reg: ' + activeExistingReg.regId + ')',
        image: 'images/iap-howrah-logo.png',
        handler: function (response) {
          processWorkshopAddon(response.razorpay_payment_id, totalWorkshopFee, selectedWorkshops);
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
      return;
    }

    // REGULAR NEW REGISTRATION FLOW
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

    const confAmount = feeResult.amount;
    const totalAmount = confAmount + totalWorkshopFee;

    // Free conference + no workshop fee — skip Razorpay
    if ((feeResult.isFree || confAmount === 0) && totalWorkshopFee === 0) {
      processRegistrationWithDoc('FREE_' + Date.now(), 0, feeResult, selectedWorkshops);
      return;
    }

    // Razorpay Payment
    const rzpOptions = {
      key: CONFIG.RZP_KEY,
      amount: totalAmount * 100,
      currency: 'INR',
      name: CONFERENCE_CONFIG.name,
      description: category + (workshopNames ? ' + ' + workshopNames : '') + ' — Registration',
      image: 'images/iap-howrah-logo.png',
      handler: function (response) {
        processRegistrationWithDoc(response.razorpay_payment_id, totalAmount, feeResult, selectedWorkshops);
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

  // ============================================================
  // "PLEASE WAIT" OVERLAY (shown while the registration is being saved)
  // Self-contained: creates its own markup + styles, no CSS file needed.
  // ============================================================
  function showWaitOverlay(message) {
    let overlay = document.getElementById('wait-overlay');
    if (!overlay) {
      const style = document.createElement('style');
      style.textContent =
        '#wait-overlay{position:fixed;inset:0;z-index:99999;background:rgba(11,44,77,.88);' +
        'display:flex;align-items:center;justify-content:center;padding:20px;}' +
        '#wait-overlay .wait-box{background:#fff;border-radius:14px;padding:32px 28px;max-width:420px;' +
        'width:100%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:inherit;}' +
        '#wait-overlay .wait-spinner{width:54px;height:54px;margin:0 auto 18px;border:5px solid #e3e8ee;' +
        'border-top-color:#0b2c4d;border-radius:50%;animation:waitspin .9s linear infinite;}' +
        '#wait-overlay h3{margin:0 0 8px;color:#0b2c4d;font-size:1.25rem;}' +
        '#wait-overlay p{margin:0;color:#555;font-size:.95rem;line-height:1.5;}' +
        '#wait-overlay .wait-warn{margin-top:14px;color:#b02a37;font-weight:600;font-size:.9rem;}' +
        '@keyframes waitspin{to{transform:rotate(360deg)}}';
      document.head.appendChild(style);

      overlay = document.createElement('div');
      overlay.id = 'wait-overlay';
      overlay.setAttribute('role', 'alertdialog');
      overlay.setAttribute('aria-live', 'assertive');
      overlay.innerHTML =
        '<div class="wait-box">' +
        '<div class="wait-spinner"></div>' +
        '<h3>Please wait…</h3>' +
        '<p id="wait-overlay-msg"></p>' +
        '<p class="wait-warn">Do not close, refresh or go back until this finishes.</p>' +
        '</div>';
      document.body.appendChild(overlay);
    }
    document.getElementById('wait-overlay-msg').textContent =
      message || 'Saving your registration and generating your ID. This may take up to a minute.';
    overlay.style.display = 'flex';
    window.addEventListener('beforeunload', waitUnloadGuard);
  }

  function hideWaitOverlay() {
    const overlay = document.getElementById('wait-overlay');
    if (overlay) overlay.style.display = 'none';
    window.removeEventListener('beforeunload', waitUnloadGuard);
  }

  function waitUnloadGuard(e) {
    e.preventDefault();
    e.returnValue = '';
  }

  // selectedWorkshops is now an ARRAY of workshop config objects
  function processRegistrationWithDoc(paymentId, amount, feeResult, selectedWorkshops) {
    const btn = document.getElementById('reg-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }
    showWaitOverlay();
    const regDoc = document.getElementById('reg-doc');

    if (regDoc && regDoc.files && regDoc.files.length > 0) {
      const file = regDoc.files[0];
      const reader = new FileReader();
      reader.onload = function (e) {
        const base64Data = e.target.result.split(',')[1];
        registerBackendWBP(paymentId, amount, feeResult, selectedWorkshops, {
          data: base64Data,
          mimeType: file.type,
          name: file.name
        });
      };
      reader.onerror = function () {
        hideWaitOverlay();
        showToast('Failed to read document. Please try again.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Payment'; }
      };
      reader.readAsDataURL(file);
    } else {
      registerBackendWBP(paymentId, amount, feeResult, selectedWorkshops, null);
    }
  }

  // selectedWorkshops is an ARRAY of workshop config objects
  function registerBackendWBP(paymentId, amount, feeResult, selectedWorkshops, docObj) {
    const btn = document.getElementById('reg-submit-btn');
    if (btn && btn.textContent !== 'Processing…') { btn.disabled = true; btn.textContent = 'Processing…'; }

    const wsArray = Array.isArray(selectedWorkshops) ? selectedWorkshops : (selectedWorkshops ? [selectedWorkshops] : []);
    const workshopName = wsArray.map(ws => ws.name).join(', ');
    const workshopFee = wsArray.reduce((s, ws) => s + (ws.fee || 0), 0);

    const data = {
      action: 'register',
      name: document.getElementById('reg-name')?.value.trim(),
      mobile: document.getElementById('reg-mobile')?.value.trim(),
      altMobile: document.getElementById('reg-alt-mobile')?.value.trim() || '',
      email: document.getElementById('reg-email')?.value.trim(),
      category: document.getElementById('reg-category')?.value,
      institution: document.getElementById('reg-institution')?.value.trim(),
      designation: document.getElementById('reg-designation')?.value.trim(),
      workshop: workshopName,
      workshopFee: workshopFee,
      amount,
      period: feeResult.period || '',
      paymentId,
      isFree: feeResult.isFree && workshopFee === 0,
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
          hideWaitOverlay();
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
            showWaitOverlay('Taking longer than usual. Retrying, please keep this page open…');
            setTimeout(() => sendRequest(retryCount + 1), 2000);
          } else {
            hideWaitOverlay();
            if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Payment'; }
            showToast('Network Error. Payment ID: ' + paymentId + '. Please contact: 98303 67423', 'error');
          }
        });
    };
    sendRequest(0);
  }

  // Workshop-only registration for already registered users
  // selectedWorkshops is an ARRAY of workshop config objects
  function processWorkshopAddon(paymentId, totalWorkshopFee, selectedWorkshops) {
    const wsArray = Array.isArray(selectedWorkshops) ? selectedWorkshops : [selectedWorkshops];
    const workshopNames = wsArray.map(ws => ws.name).join(', ');

    const btn = document.getElementById('reg-submit-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing Workshop…'; }
    showWaitOverlay('Adding workshop(s) to your registration and sending confirmation email…');

    const data = {
      action: 'registerWorkshop',
      regId: activeExistingReg.regId,
      phone: document.getElementById('reg-mobile')?.value.trim(),
      email: document.getElementById('reg-email')?.value.trim(),
      workshop: workshopNames,
      workshopFee: totalWorkshopFee,
      paymentId: paymentId
    };

    fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify(data) })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(result => {
        hideWaitOverlay();
        if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Payment'; }
        if (result.success) {
          showToast('Workshop registration confirmed! Confirmation email sent.', 'success');
          showRegistrationSuccess(result, {
            name: activeExistingReg.name || document.getElementById('reg-name')?.value.trim(),
            category: activeExistingReg.category || document.getElementById('reg-category')?.value,
            email: data.email,
            mobile: data.phone,
            institution: activeExistingReg.institution || document.getElementById('reg-institution')?.value.trim(),
            amount: totalWorkshopFee,
            workshop: workshopNames,
            isFree: false,
            period: 'Add-On'
          });
        } else {
          showToast('Error: ' + (result.message || 'Failed to add workshop.'), 'error');
        }
      })
      .catch(err => {
        hideWaitOverlay();
        if (btn) { btn.disabled = false; btn.textContent = 'Proceed to Payment'; }
        showToast('Network error saving workshop. Payment ID: ' + paymentId + '. Please contact 98303 67423.', 'error');
      });
  }

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
      's-period': data.period === 'earlyBird' ? 'Early Bird' : data.period === 'regular' ? 'Regular' : (data.period || 'N/A'),
      's-workshop': data.workshop || 'None',
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
  }

  // ============================================================
  // ALREADY REGISTERED MODAL & FETCH LOGIC
  // ============================================================
  window.fetchExistingRegistration = function () {
    const phoneInput = document.getElementById('fetch-phone');
    const emailInput = document.getElementById('fetch-email');
    const regIdInput = document.getElementById('fetch-reg-id');
    const statusMsg = document.getElementById('fetch-status-msg');
    const submitBtn = document.getElementById('btn-submit-fetch');

    const phone = phoneInput ? phoneInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const regId = regIdInput ? regIdInput.value.trim() : '';

    if (!phone || !email) {
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.style.color = 'var(--color-error)';
        statusMsg.textContent = 'Please enter both phone number and email.';
      }
      return;
    }

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Fetching…'; }
    if (statusMsg) {
      statusMsg.style.display = 'block';
      statusMsg.style.color = 'var(--color-primary)';
      statusMsg.textContent = 'Searching your registration…';
    }

    fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'fetchRegistration',
        phone: phone,
        email: email,
        regId: regId
      })
    })
      .then(res => res.json())
      .then(result => {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Fetch Details'; }

        if (!result.success || !result.registration) {
          if (statusMsg) {
            statusMsg.style.display = 'block';
            statusMsg.style.color = 'var(--color-error)';
            statusMsg.textContent = result.message || 'No matching conference registration found. Please check your phone & email.';
          }
          return;
        }

        // Successfully found registration!
        const reg = result.registration;
        activeExistingReg = reg;

        // Auto-fill form fields
        const nameEl = document.getElementById('reg-name');
        const emailEl = document.getElementById('reg-email');
        const mobileEl = document.getElementById('reg-mobile');
        const catEl = document.getElementById('reg-category');
        const desigEl = document.getElementById('reg-designation');
        const instEl = document.getElementById('reg-institution');
        const submitRegBtn = document.getElementById('reg-submit-btn');

        if (nameEl && reg.name) nameEl.value = reg.name;
        if (emailEl && reg.email) emailEl.value = reg.email;
        if (mobileEl && reg.mobile) mobileEl.value = reg.mobile;
        if (desigEl && reg.designation) desigEl.value = reg.designation;
        if (instEl && reg.institution) instEl.value = reg.institution;
        if (catEl && reg.category) catEl.value = reg.category;

        // Parse existing workshops for this registration
        const existingWorkshops = reg.workshop
          ? reg.workshop.split(',').map(s => s.trim()).filter(Boolean)
          : [];

        // Re-render workshop checkboxes, disabling already-registered ones
        renderWorkshopCheckboxes(existingWorkshops);

        // Show already-registered workshops badge
        const alreadyBadge = document.getElementById('already-registered-workshops-badge');
        const existingWsText = document.getElementById('existing-workshops-text');
        if (alreadyBadge && existingWsText) {
          if (existingWorkshops.length > 0) {
            existingWsText.textContent = existingWorkshops.join(', ');
            alreadyBadge.style.display = 'block';
          } else {
            alreadyBadge.style.display = 'none';
          }
        }

        // Show banner & adjust submit button text
        const banner = document.getElementById('already-reg-banner');
        const bannerId = document.getElementById('banner-reg-id');
        if (banner && bannerId) {
          bannerId.textContent = reg.regId;
          banner.style.display = 'block';
        }

        if (submitRegBtn) {
          submitRegBtn.textContent = 'Pay & Add Workshop';
        }

        // Close modal
        closeAlreadyRegModal();
        showToast('Registration ' + reg.regId + ' found! Select your workshop(s) below.', 'success');

        // Update fee view
        updateRegistrationFee();
      })
      .catch(err => {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Fetch Details'; }
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.style.color = 'var(--color-error)';
          statusMsg.textContent = 'Network error fetching registration. Please try again.';
        }
      });
  };

  function openAlreadyRegModal() {
    const modal = document.getElementById('already-reg-modal');
    const statusMsg = document.getElementById('fetch-status-msg');
    if (statusMsg) statusMsg.style.display = 'none';
    if (modal) modal.style.display = 'flex';
  }

  function closeAlreadyRegModal() {
    const modal = document.getElementById('already-reg-modal');
    if (modal) modal.style.display = 'none';
  }

  function clearAlreadyRegisteredState() {
    activeExistingReg = null;
    const banner = document.getElementById('already-reg-banner');
    if (banner) banner.style.display = 'none';

    const alreadyBadge = document.getElementById('already-registered-workshops-badge');
    if (alreadyBadge) alreadyBadge.style.display = 'none';

    const submitRegBtn = document.getElementById('reg-submit-btn');
    if (submitRegBtn) submitRegBtn.textContent = 'Proceed to Payment';

    const form = document.getElementById('reg-form');
    if (form) form.reset();

    // Re-render workshop checkboxes without any disabled state
    renderWorkshopCheckboxes([]);

    showToast('Switched to new registration mode.', 'info');
    updateRegistrationFee();
  }

  function initAlreadyRegisteredModal() {
    const openBtn = document.getElementById('btn-open-already-registered');
    const closeBtn = document.getElementById('already-reg-modal-close');
    const cancelBtn = document.getElementById('already-reg-modal-cancel');
    const clearBtn = document.getElementById('btn-clear-already-registered');
    const modal = document.getElementById('already-reg-modal');

    if (openBtn) openBtn.addEventListener('click', openAlreadyRegModal);
    if (closeBtn) closeBtn.addEventListener('click', closeAlreadyRegModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAlreadyRegModal);
    if (clearBtn) clearBtn.addEventListener('click', clearAlreadyRegisteredState);

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeAlreadyRegModal();
      });
    }

    // Initial render of workshop checkboxes (no already-registered ones)
    renderWorkshopCheckboxes([]);
  }

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

/* ============================================================
   ABSTRACT SUBMISSION CLOSING (dashboard)
   Abstract submissions closed on 15 Nov 2026 (end of day IST).
   Disables the abstract form and shows a small note. Re-applies
   itself whenever the dashboard re-renders the form.
   ============================================================ */
(function () {
  var ABSTRACT_DEADLINE = new Date('2026-11-15T23:59:59+05:30');

  function abstractsClosed() {
    return new Date() > ABSTRACT_DEADLINE;
  }

  function applyAbstractClosed() {
    var card = document.getElementById('abstract-card');
    var fieldset = document.getElementById('abstract-fieldset');
    if (!card || !fieldset) return;

    if (!fieldset.disabled) fieldset.disabled = true;

    var badge = document.getElementById('abstract-badge');
    if (badge && badge.textContent !== 'Submitted' && badge.textContent !== 'Closed') {
      badge.textContent = 'Closed';
    }

    if (!document.getElementById('abstract-closed-note')) {
      var note = document.createElement('p');
      note.id = 'abstract-closed-note';
      note.textContent = 'Abstract submissions closed on 15 November 2026.';
      note.style.cssText = 'font-size:0.85rem;color:var(--color-text-muted);margin:0.5rem 0 0;';
      var status = document.getElementById('abstract-status');
      (status ? status.parentNode : card).insertBefore(note, status || null);
    }
  }

  function init() {
    if (!abstractsClosed()) return;
    applyAbstractClosed();

    // Dashboard re-renders the form after login/upload; keep it closed.
    var fieldset = document.getElementById('abstract-fieldset');
    if (fieldset && window.MutationObserver) {
      new MutationObserver(function () {
        if (!fieldset.disabled) applyAbstractClosed();
      }).observe(fieldset, { attributes: true, attributeFilter: ['disabled'] });
    }
    var card = document.getElementById('abstract-card');
    if (card && window.MutationObserver) {
      new MutationObserver(function () {
        applyAbstractClosed();
      }).observe(card, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
