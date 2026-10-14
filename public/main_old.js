// Theme management directly as early as possible to avoid flash
(function() {
  let theme = 'light';
  try {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      theme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark';
    }
  } catch (_) {
    theme = 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();

// Page transition progress bar
(function() {
  var SK = 'navProgress';

  function createBar() {
    var bar = document.createElement('div');
    bar.id = 'nav-progress';
    document.body.insertBefore(bar, document.body.firstChild);
    return bar;
  }

  // ページA: リンククリック時にフラグを立てる
  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a');
      if (!link) return;
      if (link.target === '_blank') return;
      if (link.hasAttribute('download')) return;
      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

      // サブドメイン間移動対応: クッキーにフラグを立てる（ドメイン全体で共有）
      document.cookie = SK + "=1; path=/; domain=super-hiko14.com; max-age=10";

      try { sessionStorage.setItem(SK, '1'); } catch(_) {}
    });

    // ページB: 到着時にフラグを確認してアニメーション
    var pending = false;
    try {
      if (sessionStorage.getItem(SK) === '1') {
        pending = true;
        sessionStorage.removeItem(SK);
      } else {
        // クッキーを確認
        var match = document.cookie.match(new RegExp('(^| )' + SK + '=([^;]+)'));
        if (match && match[2] === '1') {
          pending = true;
          // 使用後は削除（期限切れにする）
          document.cookie = SK + "=; path=/; domain=super-hiko14.com; max-age=0";
        }
      }
    } catch(_) {}

    if (pending) {
      var bar = createBar();
      // 山形: 長い右上がりから 100% までスゾッと引き、その後フェード
      bar.classList.add('nav-progress-arrive-start');
      // リフロー寧
      void bar.offsetWidth;
      bar.classList.remove('nav-progress-arrive-start');
      bar.classList.add('nav-progress-arrive');
      setTimeout(function() {
        bar.classList.add('nav-progress-arrive-done');
        setTimeout(function() { bar.remove(); }, 600);
      }, 380);
    }
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('js-animate');

  // Theme management initialize buttons
  initTheme();

  // Site-wide hamburger navigation
  initSiteNav();

  // Scroll to top functionality
  initScrollToTop();

  const observerOptions = {
    root: null,
    rootMargin: "0px 0px -15% 0px",
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // 他の要素よりも早く表示させるための遅延解消（オプション）
      }
    });
  }, observerOptions);

  document.querySelectorAll('.box').forEach(el => {
    observer.observe(el);
  });

  // 初回チェック: ページ読み込み時にすでに表示範囲内にある要素を即座に表示
  // 少し遅らせることで、js-animateクラス付与直後の状態からアニメーションを開始させる
  setTimeout(() => {
    document.querySelectorAll('.box').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) {
        el.classList.add('is-visible');
      }
    });
  }, 100);

  // Replace arrow characters with SVG
  initArrowReplacer();
});

function initTheme() {
  // Theme toggle button
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      if (window._refreshGitHubCalendar) {
        window._refreshGitHubCalendar();
      }
      try {
        localStorage.setItem('theme', newTheme);
      } catch (_) {
      }
    });
  }
}

function initScrollToTop() {
  const scrollBtn = document.querySelector('.scroll-to-top');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

// Site-wide hamburger navigation
function initSiteNav() {
  const nav    = document.querySelector('.site-nav');
  const toggle = document.querySelector('.site-nav-toggle');
  const drawer = document.querySelector('.site-nav-drawer');
  if (!toggle || !drawer || !nav) return;
  let lockedScrollY = 0;

  const NAV_ITEMS = [
    {
      title: 'ホーム',
      url: 'https://super-hiko14.com/',
    },
    { title: 'お問い合わせ',
      url: 'https://super-hiko14.com/contact/'
    },
    {
      title: '物置',
      url: 'https://super-hiko14.com/monooki/',
    },
    {
      title: '高級ジェネ™',
      url: 'https://kokyujene.super-hiko14.com/',
      submenu: [
        { label: 'HOME', url: 'https://kokyujene.super-hiko14.com/' },
        { label: 'MEMBERS', url: 'https://kokyujene.super-hiko14.com/members' },
        { label: 'RULES', url: 'https://kokyujene.super-hiko14.com/rules' },
        { label: 'NEWS', url: 'https://kokyujene.super-hiko14.com/news' }
      ]
    },
    {
      title: '日記',
      url: 'https://super-hiko14.me/diary/',
    },
    {
      title: '法務',
      url: 'https://legal.super-hiko14.com/',
      submenu: [
        { label: 'プライバシーポリシー', url: 'https://legal.super-hiko14.com/privacypolicy/' },
        { label: '利用規約', url: 'https://legal.super-hiko14.com/terms/' },
      ]
    }
  ];

  function buildNavItem(item) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = item.url;

    const textWrap = document.createElement('span');
    textWrap.className = 'site-nav-item-text';

    const title = document.createElement('span');
    title.className = 'site-nav-item-title';
    title.textContent = item.title;

    const arrow = document.createElement('span');
    arrow.className = 'site-nav-item-arrow';
    arrow.textContent = '→';

    textWrap.appendChild(title);
    link.appendChild(textWrap);
    link.appendChild(arrow);
    li.appendChild(link);

    if (Array.isArray(item.submenu) && item.submenu.length > 0) {
      const submenuEl = document.createElement('ul');
      submenuEl.className = 'site-nav-submenu';
      submenuEl.setAttribute('aria-hidden', 'true');
      item.submenu.forEach((sub) => {
        const subLi = document.createElement('li');
        const subLink = document.createElement('a');
        subLink.href = sub.url;
        subLink.textContent = sub.label;
        subLi.appendChild(subLink);
        submenuEl.appendChild(subLi);
      });
      li.appendChild(submenuEl);
    }
    return li;
  }

  const navList = drawer.querySelector('ul') || drawer.appendChild(document.createElement('ul'));
  navList.innerHTML = '';
  NAV_ITEMS.forEach((item) => {
    navList.appendChild(buildNavItem(item));
  });

  /* ---------- inject backdrop ---------- */
  const backdrop = document.createElement('div');
  backdrop.className = 'site-nav-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(backdrop);

  // SVG arrow definitions
  const downArrowSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14"><path d="M 6 9 L 12 15 L 18 9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const rightArrowSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14"><path d="M 9 6 L 15 12 L 9 18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Convert arrow text to SVG: submenu がある場合は下向き矢印、無ければ横向き矢印
  const arrows = drawer.querySelectorAll('.site-nav-item-arrow');
  arrows.forEach((arrowEl) => {
    if (!arrowEl) return;
    const li = arrowEl.closest('li');
    const hasSub = li && li.querySelector('.site-nav-submenu');
    arrowEl.innerHTML = hasSub ? downArrowSvg : rightArrowSvg;
    arrowEl.style.display = 'inline-flex';
  });

  /* ---------- open / close ---------- */
  function openNav() {
    toggle.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('is-visible');
    if (window.innerWidth <= 680) {
      lockedScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.classList.add('site-nav-open');
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + lockedScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }
    // フォーカスを最初のリンクへ（少し遅延）
    setTimeout(() => {
      const first = drawer.querySelector('a[href]');
      if (first) first.focus({ preventScroll: true });
    }, 120);
  }

  function closeNav() {
    const wasOpen = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('is-visible');
    drawer.querySelectorAll('.site-nav-submenu.is-open').forEach(submenuEl => {
      submenuEl.classList.remove('is-open');
      submenuEl.setAttribute('aria-hidden', 'true');
    });
    drawer.querySelectorAll('.site-nav-item-arrow.is-open').forEach(arrowEl => {
      arrowEl.classList.remove('is-open');
    });
    if (window.innerWidth <= 680 && wasOpen) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, lockedScrollY);
    }
    document.body.classList.remove('site-nav-open');
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    isOpen ? closeNav() : openNav();
  });

  // バックドロップクリックで閉じる
  backdrop.addEventListener('click', () => {
    closeNav();
    toggle.focus();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.site-nav')) closeNav();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNav();
      toggle.focus();
    }
  });

  /* ---------- フォーカストラップ ---------- */
  drawer.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (drawer.getAttribute('aria-hidden') === 'true') return;
    const focusables = Array.from(
      drawer.querySelectorAll('a[href], [tabindex]:not([tabindex="-1"])')
    ).filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- current page highlight & accordion setup ---------- */
  try {
    const currentHost = location.hostname;
    const normalizePath = (path) => path.replace(/\/+$/, '') || '/';
    const currentPath = normalizePath(location.pathname);

    drawer.querySelectorAll('a[href]').forEach(link => {
      try {
        const linkUrl = new URL(link.href);
        const linkLi = link.closest('li');
        const arrowEl = link.querySelector('.site-nav-item-arrow');

        // Check if this link points to the current page (same domain AND same path)
        const isCurrentDomain = linkUrl.hostname === currentHost && normalizePath(linkUrl.pathname) === currentPath;

        if (isCurrentDomain) {
          link.setAttribute('aria-current', 'page');
          // Change arrow to down arrow for current page
          if (arrowEl) {
            arrowEl.innerHTML = downArrowSvg;
            arrowEl.classList.add('is-current-page');
          }
        } else {
          link.removeAttribute('aria-current');
        }

        // Setup accordion for links with submenu
        const submenuEl = linkLi ? linkLi.querySelector('.site-nav-submenu') : null;
        if (submenuEl && arrowEl) {
          arrowEl.innerHTML = downArrowSvg;
          arrowEl.style.display = 'inline-flex';
          arrowEl.style.cursor = 'pointer';
          arrowEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = submenuEl.classList.contains('is-open');
            if (!isOpen) {
              submenuEl.classList.add('is-open');
              submenuEl.setAttribute('aria-hidden', 'false');
              arrowEl.classList.add('is-open');
            } else {
              submenuEl.classList.remove('is-open');
              submenuEl.setAttribute('aria-hidden', 'true');
              arrowEl.classList.remove('is-open');
            }
          });
        } else if (isCurrentDomain && linkLi && arrowEl) {
          // Current page without submenu: use right arrow
          arrowEl.innerHTML = rightArrowSvg;
          arrowEl.style.display = 'inline-flex';
          arrowEl.style.cursor = 'pointer';
          arrowEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            closeNav();
          });
        }
      } catch (_) {}
    });
  } catch (_) {}

  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => closeNav());
  });

  /* ---------- box-tracking position ---------- */
  const boxes = Array.from(document.querySelectorAll('.box'));
  if (!boxes.length) return;

  let lastBoxIdx = -1;
  let rafId = null;
  let transitionTimer = null;

  function findActiveBoxIndex() {
    let idx = -1;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      // 非表示（タブの非アクティブ面など）を除外
      if (box.offsetParent === null) continue;
      // フッターを含むboxは除外
      if (box.querySelector('.footer')) continue;
      const rect = box.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.75) idx = i;
    }
    // 有効なboxが見つからなければ先頭の可視boxを返す
    if (idx === -1) {
      for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].offsetParent !== null) { idx = i; break; }
      }
    }
    return Math.max(0, idx);
  }

  function applyNavPosition() {
    // スマホは CSS 固定に任せる
    if (window.innerWidth <= 680) {
      nav.style.top = '';
      lastBoxIdx = -1;
      clearTimeout(transitionTimer);
      return;
    }

    const idx  = findActiveBoxIndex();
    const rect = boxes[idx].getBoundingClientRect();
    const minTop = 12;
    const maxTop = window.innerHeight * 0.38; // 画面の38%より下には行かない
    const targetTop = Math.min(maxTop, Math.max(minTop, rect.top - 60));

    if (idx !== lastBoxIdx) {
      nav.style.transition = 'top 0.38s cubic-bezier(0.4, 0, 0.2, 1)';
      clearTimeout(transitionTimer);
      transitionTimer = setTimeout(() => {
        nav.style.transition = 'none';
      }, 420);
      lastBoxIdx = idx;
    }

    nav.style.top = targetTop + 'px';
  }

  function onScroll() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      applyNavPosition();
      rafId = null;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    lastBoxIdx = -1;
    applyNavPosition();
  });

  // 初回位置設定（ページロード時に下からスライドイン）
  nav.style.transition = 'top 0.55s cubic-bezier(0.4, 0, 0.2, 1)';
  applyNavPosition();
  setTimeout(() => { nav.style.transition = 'none'; }, 580);
}

function initArrowReplacer() {
  const svgRight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" style="vertical-align: middle; display: inline-block; width: 1.3em; height: 1.3em;"><path d="M426-342v-276l138 138-138 138Z"/></svg>`;
  const svgLeft  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" style="vertical-align: middle; display: inline-block; width: 1.3em; height: 1.3em;"><path d="M534-342 396-480l138-138v276Z"/></svg>`;

  function replaceInNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;

      if (text.includes('→') || text.includes('←')) {
        const parent = node.parentNode;
        if (!parent) return;

        const ignoreTags = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'PRE', 'CODE', 'SVG'];
        if (ignoreTags.includes(parent.tagName) || parent.closest('.replaced-arrow-wrapper')) {
          return;
        }

        const segments = text.split(/(→|←)/);
        const fragment = document.createDocumentFragment();

        segments.forEach((segment, idx) => {
          if (!segment) return;

          if (segment === '→' || segment === '←') {
            // 矢印単体ではなく、その周囲を包むラッパーを作る
            const wrapper = document.createElement('span');
            wrapper.className = 'replaced-arrow-wrapper';
            wrapper.style.whiteSpace = 'nowrap'; // ラッパー内（矢印＋直後の文字）の改行を禁止
            wrapper.style.display = 'inline-flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.verticalAlign = 'middle';

            // SVG用のspan
            const arrowSpan = document.createElement('span');
            arrowSpan.style.display = 'inline-block';
            arrowSpan.style.lineHeight = '1';
            arrowSpan.innerHTML = (segment === '→') ? svgRight : svgLeft;
            wrapper.appendChild(arrowSpan);

            // 【ポイント】もし直後にテキスト（例：「戻る」）があれば、
            // その最初の単語や文字がはぐれないよう、一部（または全部）をラッパーに巻き込む
            const nextSegment = segments[idx + 1];
            if (nextSegment && nextSegment !== '→' && nextSegment !== '←') {
              // 直後のテキストの「最初の1文字（または単語）」を切り出してラッパーに入れる
              // ここではシンプルに直後のテキストすべてを巻き込んで1行にします
              wrapper.appendChild(document.createTextNode(nextSegment));
              segments[idx + 1] = ''; // 巻き込んだ分、次のループ処理をスキップさせる
            }

            fragment.appendChild(wrapper);
          } else {
            fragment.appendChild(document.createTextNode(segment));
          }
        });

        parent.replaceChild(fragment, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const ignoreTags = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'PRE', 'CODE', 'SVG'];
      if (ignoreTags.includes(node.tagName) || node.classList.contains('replaced-arrow-wrapper')) {
        return;
      }
      const childNodes = Array.from(node.childNodes);
      for (const child of childNodes) {
        replaceInNode(child);
      }
    }
  }

  // 初回実行
  replaceInNode(document.body);

  // MutationObserverで動的追加されるノードを監視
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        replaceInNode(node);
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
