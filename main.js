/*
 * KISSKISSCAT resume — interaction layer shared by index.html (zh) and en.html (en).
 * Everything is progressive enhancement: without JS the pages stay readable and complete.
 */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const ROOT = document.documentElement;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HEADER_OFFSET = 140;

  /* Text this script produces itself; a matching data-* attribute on the element wins. */
  const TEXT = ROOT.lang.startsWith('zh')
    ? { label: '内容', done: '已复制: ', fail: '复制失败, 请手动选择文本: ', open: '打开菜单', close: '关闭菜单' }
    : { label: 'Content', done: ' copied: ', fail: 'Copy failed, please select the text manually: ', open: 'Open menu', close: 'Close menu' };

  const attr = (el, name, fallback) => (el && el.getAttribute(name)) || fallback;
  const remember = (key, value) => { try { localStorage.setItem(key, value); } catch (e) {} };

  let toastTimer;
  const toast = (message) => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2000);
  };

  /* Calls `onSeen` once per element, immediately for all of them when motion is reduced or IO is missing. */
  const whenSeen = (els, options, onSeen) => {
    if (!els.length) return;
    if (REDUCED || !('IntersectionObserver' in window)) { els.forEach(onSeen); return; }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      onSeen(entry.target);
      observer.unobserve(entry.target);
    }), options);
    els.forEach((el) => observer.observe(el));
  };

  /* ---------- dark / light theme ---------- */
  const initTheme = () => {
    const toggle = $('#themeToggle');
    const isLight = () => ROOT.getAttribute('data-theme') === 'light';

    const paintMeta = () => {
      const color = isLight() ? '#f4f6fb' : '#070a12';
      $$('meta[name="theme-color"]').forEach((meta) => {
        meta.removeAttribute('media');
        meta.setAttribute('content', color);
      });
    };

    paintMeta();
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(isLight()));

    toggle.addEventListener('click', () => {
      const theme = isLight() ? 'dark' : 'light';
      ROOT.setAttribute('data-theme', theme);
      remember('theme', theme);
      toggle.setAttribute('aria-pressed', String(theme === 'light'));
      paintMeta();
    });
  };

  /* ---------- remember the language the visitor picked ---------- */
  const initLang = () => {
    $$('[data-lang-switch]').forEach((link) => {
      link.addEventListener('click', () => remember('lang', link.getAttribute('data-lang-switch') || ''));
    });
  };

  /* ---------- hero typewriter ---------- */
  const initTypewriter = () => {
    const el = $('#typedRole');
    if (!el) return;

    const roles = attr(el, 'data-roles', '').split(',').map((role) => role.trim()).filter(Boolean);
    if (!roles.length) return;
    if (REDUCED) { el.textContent = roles[0]; return; }

    let index = 0;
    let chars = 0;
    let deleting = false;

    const tick = () => {
      const word = roles[index];
      chars += deleting ? -1 : 1;
      el.textContent = word.slice(0, Math.max(chars, 0));

      let delay = deleting ? 45 : 95;
      if (!deleting && chars >= word.length) { deleting = true; delay = 1900; }
      else if (deleting && chars <= 0) { deleting = false; index = (index + 1) % roles.length; delay = 420; }
      setTimeout(tick, delay);
    };

    tick();
  };

  /* ---------- staggered reveal on scroll ---------- */
  const initReveal = () => {
    whenSeen($$('.reveal'), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }, (el) => {
      const siblings = el.parentElement
        ? [...el.parentElement.children].filter((node) => node.classList.contains('reveal'))
        : [el];
      el.style.transitionDelay = Math.min(Math.max(0, siblings.indexOf(el)) * 70, 360) + 'ms';
      el.classList.add('is-visible');
    });
  };

  /* ---------- skill bars ---------- */
  const initSkillBars = () => {
    const items = $$('.bar-item');
    items.forEach((item) => {
      const value = Math.min(100, Math.max(0, parseFloat(attr(item, 'data-value', '0')) || 0));
      item.style.setProperty('--fill', value + '%');
    });
    whenSeen(items, { threshold: 0.25 }, (item) => item.classList.add('is-filled'));
  };

  /* ---------- count-up statistics ---------- */
  const initCounters = () => {
    whenSeen($$('.stat-num'), { threshold: 0.4 }, (el) => {
      const target = parseFloat(attr(el, 'data-count', '0'));
      const suffix = attr(el, 'data-suffix', '');
      if (isNaN(target)) return;
      if (REDUCED) { el.textContent = target + suffix; return; }

      const duration = 1500;
      let started;
      const step = (now) => {
        if (started === undefined) started = now;
        const progress = Math.min((now - started) / duration, 1);
        el.textContent = Math.round(target * (1 - (1 - progress) ** 3)) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };

  /* ---------- copy-to-clipboard contact cards ---------- */
  const copyText = (text) => {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      try {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand('copy');
        area.remove();
        if (copied) resolve(); else reject(new Error('copy blocked'));
      } catch (err) { reject(err); }
    });
  };

  const initCopyButtons = () => {
    $$('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const text = attr(btn, 'data-copy', '');
        copyText(text)
          .then(() => {
            toast(attr(btn, 'data-copy-label', TEXT.label) + attr(btn, 'data-copy-done-suffix', TEXT.done) + text);
            btn.classList.add('is-copied');
            setTimeout(() => btn.classList.remove('is-copied'), 1700);
          })
          .catch(() => toast(attr(btn, 'data-copy-fail-prefix', TEXT.fail) + text));
      });
    });
  };

  /* ---------- cursor spotlight on project cards ---------- */
  const initSpotlight = () => {
    if (REDUCED || matchMedia('(hover: none)').matches) return;
    $$('.project-card').forEach((card) => {
      card.addEventListener('mousemove', (event) => {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        card.style.setProperty('--mx', ((event.clientX - rect.left) / rect.width) * 100 + '%');
        card.style.setProperty('--my', ((event.clientY - rect.top) / rect.height) * 100 + '%');
      });
    });
  };

  /* ---------- sticky header, scroll progress, active nav, mobile menu, back-to-top ---------- */
  const initScrollUI = () => {
    const header = $('#siteHeader');
    const progress = $('#scrollProgress');
    const toTop = $('#toTop');
    const nav = $('#primaryNav');
    const navToggle = $('#navToggle');
    const openLabel = attr(navToggle, 'data-label-open', TEXT.open);
    const closeLabel = attr(navToggle, 'data-label-close', TEXT.close);
    const links = $$('.nav-link');

    /* Section id -> the nav link pointing at it; ids that do not exist are ignored. */
    const linkFor = new Map(links
      .map((link) => [attr(link, 'href', '').slice(1), link])
      .filter(([id]) => id && document.getElementById(id)));
    const sections = [...linkFor.keys()].map((id) => document.getElementById(id));

    const closeNav = () => {
      if (!nav || !nav.classList.contains('is-open')) return;
      nav.classList.remove('is-open');
      if (navToggle) {
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', openLabel);
      }
    };

    if (nav && navToggle) {
      navToggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? closeLabel : openLabel);
      });
      links.forEach((link) => link.addEventListener('click', closeNav));
      document.addEventListener('click', (event) => {
        if (!nav.contains(event.target) && !navToggle.contains(event.target)) closeNav();
      });
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeNav(); });
      window.addEventListener('resize', () => { if (innerWidth > 860) closeNav(); });
    }

    if (toTop) {
      toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }));
    }

    const update = () => {
      const y = window.scrollY || ROOT.scrollTop || 0;
      if (header) header.classList.toggle('is-scrolled', y > 12);
      if (progress) {
        const max = ROOT.scrollHeight - innerHeight;
        progress.style.width = (max > 0 ? Math.min(y / max, 1) * 100 : 0).toFixed(2) + '%';
      }
      if (toTop) toTop.classList.toggle('is-show', y > 520);
      if (!sections.length) return;

      const marker = y + HEADER_OFFSET;
      let current = null;
      sections.forEach((section) => { if (section.offsetTop <= marker) current = section; });
      if (y + innerHeight >= ROOT.scrollHeight - 4) current = sections[sections.length - 1];

      /* above the first section nothing is highlighted, just like before */
      const active = current && linkFor.get(current.id);
      links.forEach((link) => link.classList.toggle('is-active', link === active));
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  };

  const initYear = () => {
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
  };

  const boot = () => [initTheme, initLang, initTypewriter, initReveal, initSkillBars,
    initCounters, initCopyButtons, initSpotlight, initScrollUI, initYear].forEach((init) => init());

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
