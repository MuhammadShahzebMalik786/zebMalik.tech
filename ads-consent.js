(function () {
  'use strict';

  var PUBLISHER_ID = 'ca-pub-9522829065676411';
  var CONSENT_KEY = 'zebmalik-ads-consent-v1';
  var units;
  var banner;
  var adsPage;

  function getUnits() {
    return Array.prototype.slice.call(document.querySelectorAll('ins.adsbygoogle'));
  }

  function setUnitsVisible(visible) {
    getUnits().forEach(function (unit) {
      var container = unit.closest('.ad-slot-unit');
      if (container) container.classList.toggle('ads-consent-hidden', !visible);
    });
  }

  function removeBanner() {
    if (banner) banner.remove();
    banner = null;
  }

  function loadAds() {
    if (window.__zebmalikAdsLoaded) return;
    window.__zebmalikAdsLoaded = true;
    setUnitsVisible(true);

    var script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + PUBLISHER_ID;
    script.onload = function () {
      units.forEach(function () {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      });
    };
    document.head.appendChild(script);
  }

  function saveConsent(value) {
    localStorage.setItem(CONSENT_KEY, value);
    removeBanner();
    if (value === 'granted') {
      loadAds();
    } else {
      setUnitsVisible(false);
    }
  }

  function showBanner() {
    if (!adsPage || banner || !document.body) return;

    banner = document.createElement('div');
    banner.className = 'ads-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'ads-consent-title');
    banner.innerHTML =
      '<div class="ads-consent-copy">' +
        '<strong id="ads-consent-title">Advertising consent</strong>' +
        '<p>We use Google AdSense to support the free tools. Allow advertising cookies and personalized ads, or continue without ads.</p>' +
        '<a href="/privacy">Read our privacy policy</a>' +
      '</div>' +
      '<div class="ads-consent-actions">' +
        '<button type="button" class="btn btn-out" data-ads-consent="denied">No thanks</button>' +
        '<button type="button" class="btn" data-ads-consent="granted">Allow ads</button>' +
      '</div>';

    banner.addEventListener('click', function (event) {
      var button = event.target.closest('[data-ads-consent]');
      if (button) saveConsent(button.getAttribute('data-ads-consent'));
    });
    document.body.appendChild(banner);
  }

  function resetConsent(event) {
    event.preventDefault();
    localStorage.removeItem(CONSENT_KEY);
    setUnitsVisible(false);
    if (units.length) {
      showBanner();
    } else {
      window.location.href = '/';
    }
  }

  function init() {
    units = getUnits();
    adsPage = !!document.querySelector('script[data-ads-page]');
    document.querySelectorAll('[data-ads-consent-reset]').forEach(function (control) {
      control.addEventListener('click', resetConsent);
    });

    var consent = localStorage.getItem(CONSENT_KEY);
    if (!adsPage) return;

    // Detect search crawlers and Google ad bots (Mediapartners-Google, Googlebot, etc.)
    // Verification crawlers must see the ad script to approve site ownership and code placement
    var isCrawler = /bot|google|mediapartners|crawler|spider|slurp|bingpreview/i.test(navigator.userAgent || '');
    if (isCrawler) {
      loadAds();
      return;
    }

    if (consent === 'granted') {
      loadAds();
    } else if (consent === 'denied') {
      setUnitsVisible(false);
    } else {
      setUnitsVisible(false);
      showBanner();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
