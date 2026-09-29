// Global Command Palette (Ctrl+K / Cmd+K) for zebMalik.tech
// Provides instant fuzzy search & keyboard navigation across articles, developer tools, and site actions.
(function () {
  'use strict';

  var STATIC_ITEMS = [
    // --- Actions & Core Pages ---
    { id: 'act-theme', title: 'Toggle Theme (Dark / Light Mode)', category: 'Actions', badge: 'Ctrl+J', icon: '🌓', action: function () {
      var btn = document.getElementById('theme-toggle') || document.querySelector('.theme-toggle');
      if (btn) btn.click();
      else {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
          document.documentElement.removeAttribute('data-theme');
          try { localStorage.setItem('theme', 'light'); } catch(_) {}
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
          try { localStorage.setItem('theme', 'dark'); } catch(_) {}
        }
      }
    }},
    { id: 'act-saved', title: 'Saved / Bookmarked Articles', category: 'Actions', badge: 'Bookmarks', icon: '🔖', url: '/blog?filter=bookmarks' },
    { id: 'act-blog', title: 'Blog & Engineering Research', category: 'Navigation', badge: 'Explore', icon: '📚', url: '/blog' },
    { id: 'act-tools', title: 'All Developer & PDF Tools (22 Free Utilities)', category: 'Navigation', badge: '22 Tools', icon: '🛠️', url: '/tools' },
    { id: 'act-write', title: 'Write & Get Paid (Contributor Program)', category: 'Writer Studio', badge: 'Earn', icon: '✍️', url: '/write' },
    { id: 'act-author', title: 'Author Portal & Reader Analytics', category: 'Writer Studio', badge: 'Dashboard', icon: '📊', url: '/author-dashboard' },
    { id: 'act-about', title: 'About zebMalik.tech & Engineering Team', category: 'Navigation', badge: 'About', icon: '👤', url: '/about' },
    { id: 'act-services', title: 'Engineering & Automation Services', category: 'Navigation', badge: 'Services', icon: '⚡', url: '/services' },
    { id: 'act-work', title: 'Case Studies & Client Work', category: 'Navigation', badge: 'Portfolio', icon: '💼', url: '/work' },
    { id: 'sol-ecom', title: 'E-commerce Price Monitoring Engine', category: 'Solutions', badge: 'Case Study', icon: '🛒', url: '/ecommerce-price-monitoring' },
    { id: 'sol-leads', title: 'B2B Lead List Building & Verification', category: 'Solutions', badge: 'Case Study', icon: '🎯', url: '/lead-list-building' },
    { id: 'act-pricing', title: 'Pricing & Retainer Models', category: 'Navigation', badge: 'Rates', icon: '💳', url: '/pricing' },
    { id: 'act-sample', title: 'Get a Free Engineering Sample', category: 'Navigation', badge: 'Free', icon: '🎁', url: '/free-sample' },
    { id: 'act-contact', title: 'Contact & Direct Consultation', category: 'Navigation', badge: 'Message', icon: '✉️', url: '/contact' },
    { id: 'act-privacy', title: 'Privacy Policy', category: 'Legal', badge: 'Legal', icon: '🔒', url: '/privacy' },
    { id: 'act-terms', title: 'Terms of Service', category: 'Legal', badge: 'Legal', icon: '📄', url: '/terms' },

    // --- Developer Tools ---
    { id: 'tool-img-comp', title: 'Image Compressor (Lossless & Lossy)', category: 'Tools', badge: 'Image', icon: '🖼️', url: '/image-compressor' },
    { id: 'tool-img-conv', title: 'Image Converter (WebP, PNG, JPG)', category: 'Tools', badge: 'Image', icon: '🔄', url: '/image-converter' },
    { id: 'tool-img-resize', title: 'Image Resizer (Pixel & % scale)', category: 'Tools', badge: 'Image', icon: '📐', url: '/image-resizer' },
    { id: 'tool-img-pdf', title: 'Image to PDF Converter', category: 'Tools', badge: 'PDF', icon: '📄', url: '/image-to-pdf' },
    { id: 'tool-pdf-img', title: 'PDF to Image Converter', category: 'Tools', badge: 'PDF', icon: '🖼️', url: '/pdf-to-image' },
    { id: 'tool-exif', title: 'Image Metadata & EXIF Remover', category: 'Tools', badge: 'Privacy', icon: '🛡️', url: '/image-metadata-remover' },
    { id: 'tool-crop', title: 'Image Cropper', category: 'Tools', badge: 'Image', icon: '✂️', url: '/image-cropper' },
    { id: 'tool-rot', title: 'Image Rotator', category: 'Tools', badge: 'Image', icon: '🔃', url: '/image-rotator' },
    { id: 'tool-wm', title: 'Image Watermark Tool', category: 'Tools', badge: 'Image', icon: '💧', url: '/image-watermark' },
    { id: 'tool-meme', title: 'Meme Generator', category: 'Tools', badge: 'Fun', icon: '🎭', url: '/meme-generator' },
    { id: 'tool-pdf-merge', title: 'Merge PDF Files', category: 'Tools', badge: 'PDF', icon: '📑', url: '/merge-pdf' },
    { id: 'tool-pdf-split', title: 'Split PDF Pages', category: 'Tools', badge: 'PDF', icon: '✂️', url: '/split-pdf' },
    { id: 'tool-pdf-comp', title: 'Compress PDF Files', category: 'Tools', badge: 'PDF', icon: '🗜️', url: '/compress-pdf' },
    { id: 'tool-pdf-ocr', title: 'Extract Text from PDF & OCR', category: 'Tools', badge: 'PDF', icon: '📝', url: '/extract-text-from-pdf' },
    { id: 'tool-pdf-org', title: 'Organize & Reorder PDF Pages', category: 'Tools', badge: 'PDF', icon: '📋', url: '/pdf-organizer' },
    { id: 'tool-pdf-wm', title: 'Watermark PDF Documents', category: 'Tools', badge: 'PDF', icon: '🔏', url: '/watermark-pdf' },
    { id: 'tool-pdf-num', title: 'Add Page Numbers to PDF', category: 'Tools', badge: 'PDF', icon: '🔢', url: '/pdf-page-numbers' },
    { id: 'tool-pdf-rot', title: 'Rotate PDF Pages', category: 'Tools', badge: 'PDF', icon: '🔃', url: '/rotate-pdf' },
    { id: 'tool-qr', title: 'QR Code Generator', category: 'Tools', badge: 'Utility', icon: '📱', url: '/qr-code-generator' },
    { id: 'tool-json', title: 'JSON Formatter & Validator', category: 'Tools', badge: 'Developer', icon: '💻', url: '/json-formatter' },
    { id: 'tool-word', title: 'Word & Character Counter', category: 'Tools', badge: 'Writing', icon: '📊', url: '/word-counter' },
    { id: 'tool-pwd', title: 'Password Generator (High Entropy)', category: 'Tools', badge: 'Security', icon: '🔑', url: '/password-generator' },
    { id: 'tool-rag', title: 'AI Chatbot & RAG Architecture Blueprint', category: 'Solutions', badge: 'AI', icon: '🤖', url: '/ai-chatbot-rag' }
  ];

  var articleItems = [];
  var isArticlesLoaded = false;
  var selectedIndex = 0;
  var currentFiltered = [];

  var backdropEl = null;
  var boxEl = null;
  var inputEl = null;
  var listEl = null;

  function mapAndStorePosts(posts) {
    if (!posts || !Array.isArray(posts)) return;
    articleItems = posts.map(function (p) {
      return {
        id: 'art-' + p.slug,
        title: p.title,
        category: 'Engineering Articles',
        badge: (p.read_minutes || 5) + ' min',
        icon: p.category_icon || '📄',
        url: '/post?slug=' + encodeURIComponent(p.slug),
        tags: p.tags || []
      };
    });
    isArticlesLoaded = true;
    try {
      sessionStorage.setItem('zebmalik_cached_articles_palette', JSON.stringify({
        timestamp: Date.now(),
        items: articleItems
      }));
    } catch (_) {}
  }

  async function loadArticles() {
    if (isArticlesLoaded && articleItems.length) return;
    try {
      // 1. Instant sessionStorage cache check (0ms)
      try {
        var rawCache = sessionStorage.getItem('zebmalik_cached_articles_palette');
        if (rawCache) {
          var parsed = JSON.parse(rawCache);
          if (parsed && Array.isArray(parsed.items) && (Date.now() - parsed.timestamp < 15 * 60 * 1000)) {
            articleItems = parsed.items;
            isArticlesLoaded = true;
            return;
          }
        }
      } catch (_) {}

      // 2. Try ZebBlog client if present on page
      if (typeof ZebBlog !== 'undefined' && ZebBlog.fetchPublishedPosts) {
        var posts = await ZebBlog.fetchPublishedPosts(60);
        mapAndStorePosts(posts);
        return;
      }

      // 3. Fallback direct fetch via Supabase REST API (works across all non-blog pages)
      var sbUrl = 'https://qfsmwivvcfpkutqszlhd.supabase.co/rest/v1/posts?select=id,title,slug,excerpt,tags,view_count,published_at&status=eq.published&order=published_at.desc&limit=40';
      var anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmc213aXZ2Y2Zwa3V0cXN6bGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjI5NTUsImV4cCI6MjEwNTgzODk1NX0.rWln2NStaO3DNTNZzrJOk_F7FkG4hqijwPvm1aP199M';
      var res = await fetch(sbUrl, {
        headers: {
          'apikey': anonKey,
          'Authorization': 'Bearer ' + anonKey
        }
      });
      if (res.ok) {
        var data = await res.json();
        mapAndStorePosts(data);
      }
    } catch (_) {}
  }

  function injectStyles() {
    if (document.getElementById('cmd-palette-injected-styles')) return;
    var style = document.createElement('style');
    style.id = 'cmd-palette-injected-styles';
    style.textContent = 
      '#cmd-palette-backdrop{' +
        'position:fixed;inset:0;background:rgba(18,19,22,0.72);' +
        'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
        'z-index:10005;display:none;align-items:flex-start;justify-content:center;' +
        'padding-top:12vh;padding-left:16px;padding-right:16px;box-sizing:border-box;' +
      '}' +
      '#cmd-palette-box{' +
        'background:var(--paper,#fff);border:1px solid var(--line,#e2e4e8);' +
        'border-radius:12px;width:100%;max-width:600px;' +
        'box-shadow:0 24px 60px rgba(0,0,0,0.35);overflow:hidden;' +
        'display:flex;flex-direction:column;max-height:70vh;box-sizing:border-box;' +
      '}' +
      '[data-theme="dark"] #cmd-palette-box{' +
        'background:#181a1f;border-color:#2e323b;box-shadow:0 24px 60px rgba(0,0,0,0.65);' +
      '}' +
      '.cmd-input-wrap{' +
        'display:flex;align-items:center;padding:0 18px;border-bottom:1px solid var(--line,#e2e4e8);' +
        'gap:12px;background:transparent;' +
      '}' +
      '[data-theme="dark"] .cmd-input-wrap{border-bottom-color:#2e323b;}' +
      '.cmd-input-wrap svg{color:var(--ink-3,#8a919e);flex-shrink:0;}' +
      '#cmd-search-input{' +
        'flex:1;border:none;outline:none;background:transparent;' +
        'font-family:inherit;font-size:15.5px;color:var(--ink,#121316);padding:16px 0;' +
      '}' +
      '[data-theme="dark"] #cmd-search-input{color:#f0f2f5;}' +
      '#cmd-search-input::placeholder{color:var(--ink-3,#8a919e);}' +
      '.cmd-results-list{' +
        'overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:3px;' +
        'max-height:calc(70vh - 110px);' +
      '}' +
      '.cmd-group-title{' +
        'font-family:var(--mono,monospace);font-size:11px;text-transform:uppercase;' +
        'letter-spacing:0.08em;color:var(--ink-3,#8a919e);padding:8px 12px 4px 12px;' +
      '}' +
      '.cmd-item{' +
        'display:flex;align-items:center;justify-content:space-between;padding:9px 12px;' +
        'border-radius:6px;color:var(--ink,#121316);text-decoration:none;font-size:14px;' +
        'cursor:pointer;transition:background 0.1s ease;' +
      '}' +
      '[data-theme="dark"] .cmd-item{color:#e4e7eb;}' +
      '.cmd-item:hover,.cmd-item.is-selected{background:var(--paper-2,#f5f6f8);}' +
      '[data-theme="dark"] .cmd-item:hover,[data-theme="dark"] .cmd-item.is-selected{background:#232730;}' +
      '.cmd-item-left{display:flex;align-items:center;gap:10px;min-width:0;}' +
      '.cmd-item-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.cmd-item-badge{' +
        'font-family:var(--mono,monospace);font-size:11px;color:var(--ink-3,#8a919e);' +
        'background:var(--paper-3,#ebedf0);padding:1px 6px;border-radius:3px;flex-shrink:0;' +
      '}' +
      '[data-theme="dark"] .cmd-item-badge{background:#2b303c;color:#9ba3b0;}' +
      '.cmd-footer{' +
        'display:flex;align-items:center;justify-content:space-between;padding:8px 16px;' +
        'background:var(--paper-2,#f8f9fa);border-top:1px solid var(--line,#e2e4e8);' +
        'font-size:11.5px;color:var(--ink-3,#8a919e);font-family:var(--mono,monospace);' +
      '}' +
      '[data-theme="dark"] .cmd-footer{background:#14161a;border-top-color:#2e323b;}' +
      '.cmd-footer kbd{' +
        'background:var(--paper,#fff);border:1px solid var(--line,#e2e4e8);' +
        'padding:1px 5px;border-radius:3px;font-size:10px;color:var(--ink-2,#555c68);' +
      '}' +
      '[data-theme="dark"] .cmd-footer kbd{background:#232730;border-color:#3b404d;color:#adb5c2;}' +
      '@media(max-width:640px){' +
        '#cmd-palette-backdrop{padding-top:6vh;padding-left:10px;padding-right:10px;}' +
      '}';
    document.head.appendChild(style);
  }

  function createModal() {
    injectStyles();
    backdropEl = document.getElementById('cmd-palette-backdrop');
    if (!backdropEl) {
      backdropEl = document.createElement('div');
      backdropEl.id = 'cmd-palette-backdrop';
      backdropEl.style.cssText = 'position:fixed;inset:0;display:none;z-index:10005;';
      backdropEl.setAttribute('role', 'dialog');
      backdropEl.setAttribute('aria-modal', 'true');
      backdropEl.setAttribute('aria-label', 'Command Palette');

      backdropEl.innerHTML = 
        '<div id="cmd-palette-box">' +
          '<div class="cmd-input-wrap">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
            '<input type="text" id="cmd-search-input" placeholder="Type a command or search articles, tools... (Esc to close)" autocomplete="off" spellcheck="false">' +
          '</div>' +
          '<div id="cmd-results-list" class="cmd-results-list"></div>' +
          '<div class="cmd-footer">' +
            '<span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>' +
            '<span><kbd>↵</kbd> Select</span>' +
            '<span><kbd>Esc</kbd> Close</span>' +
          '</div>' +
        '</div>';

      document.body.appendChild(backdropEl);
    } else {
      backdropEl.style.display = 'none';
    }

    boxEl = document.getElementById('cmd-palette-box');
    inputEl = document.getElementById('cmd-search-input');
    listEl = document.getElementById('cmd-results-list');

    // Backdrop click outside to close
    backdropEl.addEventListener('click', function (e) {
      if (e.target === backdropEl) {
        closePalette();
      }
    });

    // Input events
    inputEl.addEventListener('input', function () {
      renderResults(inputEl.value.trim());
    });

    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSelection();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
      }
    });
  }

  function getAllItems() {
    return STATIC_ITEMS.concat(articleItems);
  }

  function searchFilter(query) {
    var all = getAllItems();
    if (!query) {
      // Return top priority items by default
      return STATIC_ITEMS.slice(0, 10).concat(articleItems.slice(0, 6));
    }

    var q = query.toLowerCase();
    var results = [];

    for (var i = 0; i < all.length; i++) {
      var item = all[i];
      var title = item.title.toLowerCase();
      var cat = item.category.toLowerCase();
      var tagMatch = false;
      if (item.tags && item.tags.length) {
        tagMatch = item.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; });
      }

      var score = -1;
      if (title.indexOf(q) === 0) {
        score = 100; // Starts with
      } else if (title.indexOf(q) !== -1) {
        score = 50; // Substring
      } else if (tagMatch) {
        score = 30; // Tag match
      } else if (cat.indexOf(q) !== -1) {
        score = 20; // Category match
      }

      if (score > 0) {
        results.push({ item: item, score: score });
      }
    }

    results.sort(function (a, b) { return b.score - a.score; });
    return results.map(function (r) { return r.item; });
  }

  function renderResults(query) {
    currentFiltered = searchFilter(query);
    listEl.innerHTML = '';
    selectedIndex = 0;

    if (!currentFiltered.length) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding: 24px; text-align: center; color: var(--ink-3); font-size: 13.5px;';
      empty.textContent = 'No matching actions, tools, or articles found.';
      listEl.appendChild(empty);
      return;
    }

    var lastCategory = '';
    currentFiltered.forEach(function (item, idx) {
      if (item.category !== lastCategory) {
        var group = document.createElement('div');
        group.className = 'cmd-group-title';
        group.textContent = item.category;
        listEl.appendChild(group);
        lastCategory = item.category;
      }

      var el = document.createElement('div');
      el.className = 'cmd-item' + (idx === 0 ? ' is-selected' : '');
      el.dataset.index = idx;
      el.innerHTML = 
        '<div class="cmd-item-left">' +
          '<span style="font-size:16px;line-height:1">' + (item.icon || '•') + '</span>' +
          '<span class="cmd-item-title">' + item.title + '</span>' +
        '</div>' +
        '<span class="cmd-item-badge">' + (item.badge || 'Go') + '</span>';

      el.addEventListener('mouseenter', function () {
        setSelectedIndex(parseInt(this.dataset.index, 10));
      });

      el.addEventListener('click', function () {
        executeItem(item);
      });

      listEl.appendChild(el);
    });
  }

  function setSelectedIndex(idx) {
    if (idx < 0 || idx >= currentFiltered.length) return;
    selectedIndex = idx;
    var items = listEl.querySelectorAll('.cmd-item');
    items.forEach(function (el) {
      if (parseInt(el.dataset.index, 10) === selectedIndex) {
        el.classList.add('is-selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('is-selected');
      }
    });
  }

  function moveSelection(direction) {
    if (!currentFiltered.length) return;
    var next = selectedIndex + direction;
    if (next < 0) next = currentFiltered.length - 1;
    if (next >= currentFiltered.length) next = 0;
    setSelectedIndex(next);
  }

  function executeItem(item) {
    closePalette();
    if (!item) return;
    if (typeof item.action === 'function') {
      item.action();
    } else if (item.url) {
      window.location.href = item.url;
    }
  }

  function executeSelection() {
    if (currentFiltered[selectedIndex]) {
      executeItem(currentFiltered[selectedIndex]);
    }
  }

  function openPalette() {
    if (!backdropEl) createModal();
    loadArticles().then(function () {
      renderResults(inputEl.value.trim());
    });
    backdropEl.style.display = 'flex';
    inputEl.value = '';
    renderResults('');
    setTimeout(function () {
      inputEl.focus();
    }, 20);
  }

  function closePalette() {
    if (backdropEl) {
      backdropEl.style.display = 'none';
    }
  }

  function togglePalette() {
    if (backdropEl && backdropEl.style.display === 'flex') {
      closePalette();
    } else {
      openPalette();
    }
  }

  // Keyboard Shortcuts Listener
  window.addEventListener('keydown', function (e) {
    var isK = (e.key === 'k' || e.key === 'K');
    var isJ = (e.key === 'j' || e.key === 'J');
    var isCtrlOrCmd = e.metaKey || e.ctrlKey;

    if (isCtrlOrCmd && isK) {
      e.preventDefault();
      togglePalette();
    } else if (isCtrlOrCmd && isJ) {
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      // Theme toggle shortcut
      var themeItem = STATIC_ITEMS[0];
      if (themeItem && themeItem.action) themeItem.action();
    }
  });

  // Attach to trigger buttons with .cmd-trigger-btn
  function wireButtons() {
    document.querySelectorAll('.cmd-trigger-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openPalette();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      createModal();
      wireButtons();
      loadArticles();
    });
  } else {
    createModal();
    wireButtons();
    loadArticles();
  }

  // Expose global methods
  window.openCmdPalette = openPalette;
  window.closeCmdPalette = closePalette;
  window.toggleCmdPalette = togglePalette;
})();
