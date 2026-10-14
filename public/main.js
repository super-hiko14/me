/* ==========================================================================
   main.js — Blog / Diary / 記事ページの動き（依存ライブラリなし）

   ここでやること
     1. 絵（.home-sprite）を押したとき、0.1秒でぴょんと跳ねる
     2. ブログ一覧 … 検索とカテゴリの絞り込み（?category=○○ にも対応）
     3. 日記       … 画像の開閉・ライトボックス・「今日」の目印
     4. ブログ記事 … 見出しの # リンク・目次・コピーボタン・読書バー

   ページに要素があるときだけ動くので、どのページに読み込んでも大丈夫です。
   ========================================================================== */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  /* ---------- 1. 絵のぴょん ---------- */
  function initSprite() {
    document.querySelectorAll('.home-sprite').forEach(function (el) {
      el.addEventListener('click', function () {
        el.classList.remove('is-hop');
        void el.offsetWidth;            // アニメーションを最初からやり直す
        el.classList.add('is-hop');
      });
    });
  }

  /* ---------- 2. ブログ一覧：検索とカテゴリ ---------- */
  function initBlogList() {
    var list = document.getElementById('blog-list');
    if (!list) return;
    var searchInput = document.getElementById('blog-search');
    var noResults = document.getElementById('no-results');
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.filter-btn'));
    var entries = Array.prototype.slice.call(list.querySelectorAll('.blog-entry'));

    var category = 'All';
    var fromUrl = new URLSearchParams(location.search).get('category');
    if (fromUrl && buttons.some(function (b) { return b.dataset.category === fromUrl; })) category = fromUrl;

    function setButtons() {
      buttons.forEach(function (b) {
        var on = b.dataset.category === category;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }

    function apply() {
      var q = searchInput ? searchInput.value.trim().toLowerCase() : '';
      var visible = 0;
      entries.forEach(function (entry) {
        var okCat = category === 'All' || (entry.dataset.category || '') === category;
        var okText = q === '' || (entry.dataset.title || '').toLowerCase().indexOf(q) !== -1;
        var show = okCat && okText;
        entry.hidden = !show;            // 出てくるときに、ぽんっとアニメーションする
        if (show) visible++;
      });
      if (noResults) noResults.style.display = visible === 0 ? '' : 'none';
    }

    function syncUrl() {
      var url = new URL(location.href);
      if (category === 'All') url.searchParams.delete('category');
      else url.searchParams.set('category', category);
      history.replaceState({}, '', url);
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        category = b.dataset.category || 'All';
        setButtons(); syncUrl(); apply();
      });
    });
    if (searchInput) searchInput.addEventListener('input', apply);

    setButtons();
    apply();
  }

  /* ---------- 3. 日記 ---------- */
  function initDiary() {
    if (!document.querySelector('.diary-entries')) return;
    markToday();
    initDiaryMedia();
  }

  // 今日の日付の一行に目印(.diary-today)を付ける
  function markToday() {
    var now = new Date();
    var label = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0');
    var day = now.getDate();
    document.querySelectorAll('.diary-month-group').forEach(function (group) {
      var l = group.querySelector('.diary-month-label');
      if (!l || l.textContent.trim() !== label) return;
      group.querySelectorAll('.diary-entry').forEach(function (entry) {
        var d = entry.querySelector('.diary-date');
        if (d && parseInt(d.textContent.trim(), 10) === day) entry.classList.add('diary-today');
      });
    });
  }

  // 画像の開閉とライトボックス（スワイプ・ドラッグ・矢印キー対応）
  function initDiaryMedia() {
    const mediaToggles = document.querySelectorAll('.diary-media-toggle');
    const lightbox = document.getElementById('diaryLightbox');
    if (!lightbox) return;
    const lightboxImage = lightbox.querySelector('.diary-lightbox-image');
    const lightboxCounter = lightbox.querySelector('.diary-lightbox-counter');
    const lightboxPrev = lightbox.querySelector('.diary-lightbox-prev');
    const lightboxNext = lightbox.querySelector('.diary-lightbox-next');
    const lightboxClose = lightbox.querySelector('.diary-lightbox-close');
    const lightboxOverlay = lightbox.querySelector('.diary-lightbox-overlay');

    const DRAG_DISTANCE_X = 64;
    const DRAG_DISTANCE_Y = 96;
    const DRAG_AXIS_GAP = 12;
    const DRAG_FADE_X = 350;
    const DRAG_FADE_Y = 300;
    const SWIPE_EXIT_MS = 210;
    const SWIPE_ENTER_MS = 260;
    const MOMENTUM_MULTIPLIER_X = 140;
    const MOMENTUM_MULTIPLIER_Y = 170;

    let currentImages = [];
    let currentIndex = 0;
    let dragState = null;
    let isAnimating = false;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const goPrev = () => {
      animateHorizontalSwitch(-1, { startDeltaX: 0, velocityX: 0 });
    };

    const goNext = () => {
      animateHorizontalSwitch(1, { startDeltaX: 0, velocityX: 0 });
    };

    const clearMotionStyles = () => {
      lightboxImage.style.transition = '';
      lightboxImage.style.transform = '';
      lightboxImage.style.opacity = '';
      lightboxOverlay.style.transition = '';
      lightboxOverlay.style.opacity = '';
    };

    const resetDragVisual = () => {
      lightboxImage.classList.remove('is-dragging');
      clearMotionStyles();
    };

    const animateSnapBack = () => {
      lightboxImage.classList.remove('is-dragging');
      lightboxImage.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
      lightboxOverlay.style.transition = 'opacity 220ms ease';
      lightboxImage.style.transform = 'translate3d(0, 0, 0)';
      lightboxOverlay.style.opacity = '0.9';
      window.setTimeout(() => {
        clearMotionStyles();
      }, SWIPE_ENTER_MS + 30);
    };

    const animateHorizontalSwitch = (direction, motion = {}) => {
      if (isAnimating || lightbox.hidden) {
        return;
      }

      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= currentImages.length) {
        animateSnapBack();
        return;
      }

      isAnimating = true;
      lightboxImage.classList.remove('is-dragging');

      const startDeltaX = Number(motion.startDeltaX || 0);
      const velocityX = Number(motion.velocityX || 0);
      const imageWidth = Math.max(220, lightboxImage.getBoundingClientRect().width || 220);
      const exitX = -direction * Math.round(imageWidth * 0.72);
      const enterX = direction * Math.round(imageWidth * 0.42);
      const remainDistance = Math.abs(exitX - startDeltaX);
      const exitMs = clamp(Math.round(120 + remainDistance * 0.28 - Math.abs(velocityX) * 90), 110, 250);

      lightboxImage.style.transition = 'none';
      lightboxImage.style.transform = 'translate3d(' + startDeltaX + 'px, 0, 0)';
      void lightboxImage.offsetWidth;

      lightboxImage.style.transition = 'transform ' + exitMs + 'ms cubic-bezier(0.22, 1, 0.36, 1), opacity ' + exitMs + 'ms ease';
      lightboxOverlay.style.transition = 'opacity ' + exitMs + 'ms ease';
      lightboxImage.style.transform = 'translate3d(' + exitX + 'px, 0, 0)';
      lightboxImage.style.opacity = '0.78';
      lightboxOverlay.style.opacity = '0.62';

      window.setTimeout(() => {
        currentIndex = targetIndex;
        showImage();

        lightboxImage.style.transition = 'none';
        lightboxImage.style.transform = 'translate3d(' + enterX + 'px, 0, 0)';
        lightboxOverlay.style.opacity = '0.62';

        // Force style flush, then animate the new image into center.
        void lightboxImage.offsetWidth;

        lightboxImage.style.transition = 'transform ' + SWIPE_ENTER_MS + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
        lightboxOverlay.style.transition = 'opacity ' + SWIPE_ENTER_MS + 'ms ease';
        lightboxImage.style.transform = 'translate3d(0, 0, 0)';
        lightboxImage.style.opacity = '1';
        lightboxOverlay.style.opacity = '0.9';

        window.setTimeout(() => {
          clearMotionStyles();
          isAnimating = false;
        }, SWIPE_ENTER_MS + 30);
      }, exitMs);
    };

    const animateCloseBySwipe = (motion = {}) => {
      if (isAnimating || lightbox.hidden) {
        return;
      }

      isAnimating = true;
      lightboxImage.classList.remove('is-dragging');
      const startDeltaY = Number(motion.startDeltaY || 0);
      const velocityY = Number(motion.velocityY || 0);
      const exitY = Math.max(140, startDeltaY + 140);
      const remainDistance = Math.abs(exitY - startDeltaY);
      const closeMs = clamp(Math.round(130 + remainDistance * 0.45 - Math.max(0, velocityY) * 100), 120, 240);

      lightboxImage.style.transition = 'none';
      lightboxImage.style.transform = 'translate3d(0, ' + startDeltaY + 'px, 0)';
      void lightboxImage.offsetWidth;

      lightboxImage.style.transition = 'transform ' + closeMs + 'ms cubic-bezier(0.22, 1, 0.36, 1), opacity ' + closeMs + 'ms ease';
      lightboxOverlay.style.transition = 'opacity ' + closeMs + 'ms ease';
      lightboxImage.style.transform = 'translate3d(0, ' + exitY + 'px, 0)';
      lightboxImage.style.opacity = '0';
      lightboxOverlay.style.opacity = '0';

      window.setTimeout(() => {
        clearMotionStyles();
        closeLightbox();
        isAnimating = false;
      }, closeMs + 5);
    };

    const openLightbox = (imgElement) => {
      const panel = imgElement.closest('.diary-media-panel');
      currentImages = Array.from(panel.querySelectorAll('img'));
      currentIndex = currentImages.indexOf(imgElement);
      isAnimating = false;

      lightbox.hidden = false;
      showImage();
      document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
      resetDragVisual();
      dragState = null;
      isAnimating = false;
      lightbox.hidden = true;
      document.body.style.overflow = '';
    };

    const showImage = () => {
      const img = currentImages[currentIndex];
      lightboxImage.src = img.src;
      lightboxImage.alt = img.alt;
      lightboxCounter.textContent = (currentIndex + 1) + ' / ' + currentImages.length;
      lightboxPrev.hidden = currentImages.length <= 1;
      lightboxNext.hidden = currentImages.length <= 1;
    };

    const lockDragAxis = (deltaX, deltaY) => {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absX < DRAG_AXIS_GAP && absY < DRAG_AXIS_GAP) {
        return null;
      }
      return absX >= absY ? 'x' : 'y';
    };

    const handleDragStart = (e) => {
      if (lightbox.hidden) {
        return;
      }
      dragState = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        axis: null,
        lastX: e.clientX,
        lastY: e.clientY,
        lastTime: e.timeStamp,
        velocityX: 0,
        velocityY: 0
      };
      lightboxImage.classList.add('is-dragging');
      lightboxImage.setPointerCapture(e.pointerId);
    };

    const handleDragMove = (e) => {
      if (!dragState || dragState.pointerId !== e.pointerId) {
        return;
      }

      const dt = Math.max(1, e.timeStamp - dragState.lastTime);
      const velocityX = (e.clientX - dragState.lastX) / dt;
      const velocityY = (e.clientY - dragState.lastY) / dt;
      dragState.velocityX = dragState.velocityX * 0.65 + velocityX * 0.35;
      dragState.velocityY = dragState.velocityY * 0.65 + velocityY * 0.35;
      dragState.lastX = e.clientX;
      dragState.lastY = e.clientY;
      dragState.lastTime = e.timeStamp;

      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;

      if (!dragState.axis) {
        dragState.axis = lockDragAxis(deltaX, deltaY);
      }

      if (!dragState.axis) {
        return;
      }

      if (dragState.axis === 'x') {
        lightboxImage.style.transform = 'translate3d(' + deltaX + 'px, 0, 0)';
        lightboxOverlay.style.opacity = String(Math.max(0.55, 0.9 - Math.min(Math.abs(deltaX) / DRAG_FADE_X, 0.3)));
      } else {
        lightboxImage.style.transform = 'translate3d(0, ' + deltaY + 'px, 0)';
        lightboxOverlay.style.opacity = String(Math.max(0.45, 0.9 - Math.min(Math.abs(deltaY) / DRAG_FADE_Y, 0.45)));
      }
    };

    const handleDragEnd = (e) => {
      if (!dragState || dragState.pointerId !== e.pointerId) {
        return;
      }

      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;
      const axis = dragState.axis;
      const velocityX = dragState.velocityX;
      const velocityY = dragState.velocityY;
      const projectedX = deltaX + velocityX * MOMENTUM_MULTIPLIER_X;
      const projectedY = deltaY + Math.max(0, velocityY) * MOMENTUM_MULTIPLIER_Y;
      dragState = null;

      if (axis === 'x' && Math.abs(projectedX) >= DRAG_DISTANCE_X) {
        animateHorizontalSwitch(projectedX > 0 ? -1 : 1, { startDeltaX: deltaX, velocityX });
        return;
      }

      if (axis === 'y' && projectedY >= DRAG_DISTANCE_Y) {
        animateCloseBySwipe({ startDeltaY: deltaY, velocityY });
        return;
      }

      animateSnapBack();
    };

    // Panel image click
    document.addEventListener('click', (e) => {
      if (e.target.closest('.diary-media-panel img')) {
        openLightbox(e.target);
      }
    });

    // Prevent native image drag ghost from interfering with swipe
    document.querySelectorAll('.diary-media-panel img, .diary-lightbox-image').forEach((img) => {
      img.setAttribute('draggable', 'false');
      img.addEventListener('dragstart', (e) => e.preventDefault());
    });

    lightboxImage.addEventListener('pointerdown', handleDragStart);
    lightboxImage.addEventListener('pointermove', handleDragMove);
    lightboxImage.addEventListener('pointerup', handleDragEnd);
    lightboxImage.addEventListener('pointercancel', handleDragEnd);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxOverlay.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', goPrev);
    lightboxNext.addEventListener('click', goNext);

    // Toggle panels
    mediaToggles.forEach((toggle) => {
      const panel = toggle.nextElementSibling;
      if (!panel || !panel.classList.contains('diary-media-panel')) {
        return;
      }

      toggle.addEventListener('click', () => {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!isExpanded));
        toggle.classList.toggle('is-open', !isExpanded);
        panel.hidden = isExpanded;
        panel.classList.toggle('is-open', !isExpanded);
      });
    });
  }

  /* ---------- 4. ブログ記事 ---------- */
  function initPost() {
    var content = document.getElementById('blog-content');
    if (!content) return;

    // ---- 1. 見出し収集 ----
    const headings = Array.from(
      content.querySelectorAll('h1, h2, h3, h4')
    );

    const ICON_HASH = '#';
    const ICON_CHECK = 'ok';

    headings.forEach((h, i) => {
      if (!h.id) h.id = `toc-h-${i}`;

      // # アンカーリンク（ホバーで表示・クリックでURLコピー）
      const anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = `#${h.id}`;
      anchor.innerHTML = ICON_HASH;
      anchor.setAttribute('aria-hidden', 'true');
      anchor.setAttribute('tabindex', '-1');
      anchor.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = `${location.origin}${location.pathname}#${h.id}`;
        try {
          await navigator.clipboard.writeText(url);
          anchor.classList.add('is-copied');
          setTimeout(() => {
            anchor.classList.remove('is-copied');
          }, 1500);
        } catch {}
      });
      h.insertBefore(anchor, h.firstChild);
    });

    // ---- 2. ToC リンク生成 ----
    function buildLinks(listEl, onItemClick) {
      headings.forEach((h) => {
        const level = parseInt(h.tagName[1]); // 1〜4
        const li = document.createElement('li');
        li.className = 'toc-item';

        const a = document.createElement('a');
        a.className = 'toc-link';
        a.href = `#${h.id}`;
        a.dataset.id = h.id;
        a.dataset.level = String(level);

        // テキスト（アンカー要素を除いた見出しテキストを取得）
        const span = document.createElement('span');
        const anchorEl = h.querySelector('.heading-anchor');
        const cloned = h.cloneNode(true);
        cloned.querySelector('.heading-anchor')?.remove();
        span.textContent = cloned.textContent?.trim() ?? '';
        a.appendChild(span);

        // スマホパネル用：矢印アイコンを追加
        if (listEl.id === 'toc-list-mobile') {
          const arrow = document.createElement('span');
          arrow.className = 'toc-link-arrow';
          arrow.setAttribute('aria-hidden', 'true');
          arrow.textContent = '›';
          a.appendChild(arrow);
        }

        a.addEventListener('click', (e) => {
          e.preventDefault();
          document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          onItemClick?.();
        });

        li.appendChild(a);
        listEl.appendChild(li);
      });
    }

    buildLinks(document.getElementById('toc-list-pc'));
    buildLinks(document.getElementById('toc-list-mobile'), () => closePanel());

    // ---- 3. 見出し＋本文が画面に映っているセクションをアクティブにする ----
    const allLinks = document.querySelectorAll('.toc-link');

    function updateActiveToC() {
      const scrollY = window.scrollY;
      const viewportBottom = scrollY + window.innerHeight;

      const activeIds = new Set();

      for (let i = 0; i < headings.length; i++) {
        const headingAbsTop = headings[i].getBoundingClientRect().top + scrollY;
        const nextAbsTop =
          i + 1 < headings.length
            ? headings[i + 1].getBoundingClientRect().top + scrollY
            : document.documentElement.scrollHeight;

        if (headingAbsTop < viewportBottom && nextAbsTop > scrollY) {
          activeIds.add(headings[i].id);
        }
      }

      if (activeIds.size === 0 && headings.length > 0) {
        activeIds.add(headings[0].id);
      }

      allLinks.forEach((link) => {
        if (link.dataset.id && activeIds.has(link.dataset.id)) {
          link.classList.add('is-active');
        } else {
          link.classList.remove('is-active');
        }
      });
    }

    window.addEventListener('scroll', updateActiveToC, { passive: true });
    window.addEventListener('resize', updateActiveToC, { passive: true });
    updateActiveToC();

    // ---- 4. スマホ パネル開閉 ----
    const mobileBtn = document.getElementById('toc-mobile-btn');
    const panel     = document.getElementById('toc-panel');
    const scrim     = document.getElementById('toc-scrim');
    const closeBtn  = document.getElementById('toc-panel-close');

    function openPanel() {
      scrim.style.display = 'block';
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panel.classList.add('is-open');
          scrim.classList.add('is-visible');
        });
      });
    }

    function closePanel() {
      panel.classList.remove('is-open');
      scrim.classList.remove('is-visible');
      document.body.style.overflow = '';
      panel.addEventListener('transitionend', () => {
        scrim.style.display = '';
      }, { once: true });
    }

    mobileBtn.addEventListener('click', openPanel);
    closeBtn.addEventListener('click', closePanel);
    scrim.addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePanel();
    });

    // ---- 5. コードブロック コピーボタン ----
    const ICON_COPY = 'copy';

    content.querySelectorAll('pre').forEach((pre) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy-btn';
      btn.setAttribute('aria-label', 'コードをコピー');
      btn.innerHTML = ICON_COPY;
      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code');
        try {
          await navigator.clipboard.writeText((code ?? pre).innerText.replace(/\n$/, ''));
          btn.innerHTML = ICON_CHECK;
          btn.classList.add('is-copied');
          setTimeout(() => {
            btn.innerHTML = ICON_COPY;
            btn.classList.remove('is-copied');
          }, 1500);
        } catch {}
      });
      pre.appendChild(btn);
    });

    // ---- 6. 読書プログレスバー ----
    const progressBar = document.getElementById('blog-reading-progress');
    if (progressBar) {
      function updateProgress() {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        progressBar.style.width = Math.min(100, pct) + '%';
      }
      window.addEventListener('scroll', updateProgress, { passive: true });
      updateProgress();
    }

  }

  ready(function () {
    initSprite();
    initBlogList();
    initDiary();
    initPost();
  });
})();