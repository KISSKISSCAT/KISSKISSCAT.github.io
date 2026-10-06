/*
 * Pre-paint bootstrap, loaded blocking from <head> by index.html and en.html:
 * applies the saved theme and forwards first-time visitors to the language they picked last time.
 */
(() => {
  'use strict';
  try {
    const root = document.documentElement;
    const theme = localStorage.getItem('theme');
    root.setAttribute('data-theme', theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

    const lang = localStorage.getItem('lang');
    const alternate = root.getAttribute('data-lang-alt');
    const firstVisit = sessionStorage.getItem('langJumped') !== '1';
    if (firstVisit && alternate && lang && lang !== root.getAttribute('data-lang')) {
      sessionStorage.setItem('langJumped', '1');
      location.replace(alternate);
    }
  } catch (e) {}
})();
