/* ============================================================
   GRM — interactions
   Vanilla JS, no dependencies.

   - header surface state on scroll
   - scroll progress hairline
   - mobile menu (toggle / escape / focus)
   - scroll reveals
   - Home hero: three-panel division index (hover / keyboard / touch),
     mobile stacked selector, logo takeovers
   - division arrivals + division <-> division logo handoff
   - Liveroom schedule, ghost-materialise reveal, bento hover
   - Production showreel aperture + release-plaque carousel
   All motion respects prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  var HOME_INTRO_DEBUG_REPLAY = true;

  /* Destination-logo rect cache key. Bumped whenever the destination hero
     geometry changes, so a stale pre-change rect can never survive as the
     morph target. Home (reader) and the division pages (writer) MUST agree
     on this version — currently the mobile-centred hero + height-aware
     mid-range scale. */
  var DEST_LOGO_KEY = "grm-dest-logo:v4";

  /* ---------- SHARED DESTINATION-LOGO RECT RESOLVER ----------
     One system for every Home -> division path (desktop accordion + mobile
     stacked) and one writer on the division side. The destination's rendered
     logo rect is the single source of truth: each division page publishes its
     own getBoundingClientRect here, and Home reads it back so the committed
     logo lands exactly on the destination.

     The destination logo box is CSS-driven (vw/svh clamps + fixed offsets), so
     it is deterministic for a given viewport and can be measured offscreen
     before that page is ever visited. On a cold first visit (nothing published
     yet) we render the real division page in an offscreen same-origin frame at
     the exact same viewport and read its hero logo rect the instant the
     stylesheet has laid it out. The frame is removed immediately, cancelling
     in-flight artwork, so the cost is one small HTML fetch.

     Cached per viewport (key includes innerWidth x innerHeight): a resize,
     orientation change or breakpoint change simply changes the key and misses,
     forcing a fresh measurement — a stale rect can never survive. */
  var DEST_PAGES = ["studio", "label", "liveroom"];
  var destRectCache = {};
  var destRectPending = {};
  var destPrefetched = false;

  function destRectKey(page) {
    return DEST_LOGO_KEY + ":" + page + ":" + window.innerWidth + "x" + window.innerHeight;
  }

  function measureDestLogoRect(page) {
    return new Promise(function (resolve) {
      var frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      frame.style.cssText = "position:fixed;left:-10000px;top:0;width:" +
        window.innerWidth + "px;height:" + window.innerHeight + "px;border:0;visibility:hidden;";

      var settled = false;
      function finish(rect) {
        if (settled) return;
        settled = true;
        if (frame.parentNode) frame.parentNode.removeChild(frame);
        resolve(rect);
      }

      var tries = 0;
      function poll() {
        if (settled) return;
        try {
          var d = frame.contentDocument;
          if (d && d.readyState && d.readyState !== "uninitialized") {
            var el = d.querySelector(".studio-minimal-hero__logo, .division-minimal-hero__logo");
            if (el) {
              var r = el.getBoundingClientRect();
              if (r.width > 1 && r.height > 1) {
                return finish({ left: r.left, top: r.top, width: r.width, height: r.height });
              }
            }
          }
        } catch (e) { /* cross-doc not ready yet */ }
        if (++tries > 240) return finish(null); // ~6s ceiling
        setTimeout(poll, 25);
      }

      frame.src = new URL(page + "/index.html", window.location.href).href;
      document.body.appendChild(frame);
      poll();
    });
  }

  function getDestLogoRect(page) {
    var key = destRectKey(page);
    if (destRectCache[key]) return Promise.resolve(destRectCache[key]);
    if (destRectPending[key]) return destRectPending[key];
    var stored = null;
    try { stored = JSON.parse(sessionStorage.getItem(key) || "null"); } catch (e) {}
    if (stored && stored.width) {
      destRectCache[key] = stored;
      return Promise.resolve(stored);
    }
    destRectPending[key] = measureDestLogoRect(page).then(function (rect) {
      delete destRectPending[key];
      if (rect) {
        destRectCache[key] = rect;
        try { sessionStorage.setItem(key, JSON.stringify(rect)); } catch (e) {}
      }
      return rect;
    }, function () { delete destRectPending[key]; return null; });
    return destRectPending[key];
  }

  /* Warm all three destination rects once, quietly, off the critical path. */
  function prefetchDestLogos() {
    if (destPrefetched) return;
    destPrefetched = true;
    var i = 0;
    (function next() {
      if (i >= DEST_PAGES.length) return;
      getDestLogoRect(DEST_PAGES[i++]).then(function () { setTimeout(next, 80); },
                                             function () { setTimeout(next, 80); });
    })();
  }

  document.documentElement.classList.add("js");

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var isMobileMenuOpen = false;
  var lastFocused = null;

  var RAF = window.requestAnimationFrame ||
            function (cb) { return setTimeout(cb, 16); };

  /* Reads a string from the shared i18n dictionary (js/translations.js via
     js/i18n.js), falling back to the authored English when the engine or the
     key is unavailable — so dynamic copy localizes without ever going blank. */
  function tr(key, fallback) {
    var value = (window.GRMi18n && window.GRMi18n.t) ? window.GRMi18n.t(key) : key;
    return (value === key && fallback != null) ? fallback : value;
  }

  function langSwitchMarkup(extra) {
    return '<div class="lang-switch' + (extra ? " " + extra : "") + '"' +
             ' role="group" aria-label="Language" data-i18n-aria-label="a11y.language">' +
             '<button type="button" class="lang-switch__option" data-lang="en">EN</button>' +
             '<span class="lang-switch__sep" aria-hidden="true">/</span>' +
             '<button type="button" class="lang-switch__option" data-lang="sr">SR</button>' +
           "</div>";
  }

  /* ---------- SOCIAL LINKS (Instagram · YouTube · TikTok) ----------
     One reusable, icon-only component rendered in three places: the
     destination header, the mobile menu and the footer. Order is always
     Instagram → YouTube → TikTok. The SVG is decorative (aria-hidden) and the
     anchor carries the localized accessible name.

     Canonical URLs are NOT supplied anywhere in the project yet, so each link
     renders as an inert placeholder (data-pending-social) — the same convention
     already used for the pending YouTube link on the studio page. Fill in
     SOCIAL_LINKS below and the links go live (target=_blank,
     rel=noopener noreferrer) with no other change. */
  var SOCIAL_LINKS = {
    instagram: "https://www.instagram.com/grmhouse/",
    youtube: "https://www.youtube.com/@grmproductionstudio",
    tiktok: "https://www.tiktok.com/@grm.wav"
  };

  var SOCIAL_ICONS = {
    instagram:
      '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.149 4.77 1.69 4.919 4.92.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.07 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.012-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.265-.057 1.644-.069 4.849-.069zM12 0C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.98-6.98.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.667-.072-4.947-.198-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>',
    youtube:
      '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
    tiktok:
      '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>'
  };

  function socialLinksMarkup(extra) {
    var order = [
      { key: "instagram", name: "Instagram", label: "a11y.social.instagram" },
      { key: "youtube", name: "YouTube", label: "a11y.social.youtube" },
      { key: "tiktok", name: "TikTok", label: "a11y.social.tiktok" }
    ];
    var items = order.map(function (item) {
      var url = SOCIAL_LINKS[item.key];
      var attrs = url
        ? ' href="' + url + '" target="_blank" rel="noopener noreferrer"'
        : ' href="#" data-pending-social="' + item.key + '"';
      return '<a class="social-links__item"' + attrs +
               ' aria-label="' + tr(item.label, "GRM on " + item.name) + '"' +
               ' data-i18n-aria-label="' + item.label + '">' +
               '<span class="social-links__icon" aria-hidden="true">' +
                 '<svg viewBox="0 0 24 24" focusable="false">' + SOCIAL_ICONS[item.key] + "</svg>" +
               "</span>" +
             "</a>";
    }).join("");
    return '<div class="social-links' + (extra ? " " + extra : "") + '"' +
             ' role="group" aria-label="' + tr("a11y.social", "Social links") + '"' +
             ' data-i18n-aria-label="a11y.social">' + items + "</div>";
  }

  /* ---------- SHARED CHROME (header / mobile menu / footer) ----------
     One source of truth for the site chrome, injected into
     #headerMount / #footerMount on every page. data-root on the mount
     resolves relative links from any route depth ("" on home, "../" on
     division pages). data-page on <body> marks the active nav item. */
  function injectSiteChrome() {
    var headerMount = document.getElementById("headerMount");
    var footerMount = document.getElementById("footerMount");
    var root = headerMount ? (headerMount.getAttribute("data-root") || "") : "";
    var page = document.body.getAttribute("data-page") || "";

    var navItems = [
      { key: "home", label: "Home", i18n: "nav.home", href: root + "index.html" },
      { key: "studio", label: "Production", i18n: "nav.production", href: root + "studio/" },
      { key: "label", label: "Label", i18n: "nav.label", href: root + "label/" },
      { key: "liveroom", label: "Liveroom", i18n: "nav.liveroom", href: root + "liveroom/" }
    ];

    function navLinks(cls) {
      return navItems.map(function (item) {
        var current = item.key === page ? ' aria-current="true"' : "";
        return '<a href="' + item.href + '" class="' + cls + '"' + current +
               ' data-i18n="' + item.i18n + '">' + item.label + "</a>";
      }).join("");
    }

    /* The hero landing page keeps the header free of navigation — the three
       division panels are the navigation there. Division pages get the
       full chrome. */
    var isHome = (page === "home" || page === "");

    if (headerMount) {
      headerMount.innerHTML =
        '<header class="site-header" id="siteHeader">' +
            '<div class="site-header__inner">' +
            '<a href="' + root + 'index.html" class="site-header__brand" aria-label="GRM — back to top" data-i18n-aria-label="a11y.headerBrand">' +
              '<img src="' + root + 'assets/img/grm-mark.png" alt="" width="38" height="38" class="site-header__mark">' +
              '<img src="' + root + 'assets/img/GRM 4K 1x1_Transparent.png" alt="" aria-hidden="true" class="site-header__mark-glow">' +
              '<span class="site-header__word" data-i18n="brand.home">GRM HOUSE</span>' +
            "</a>" +
            (isHome ? "" :
              '<nav class="site-nav" aria-label="Primary" data-i18n-aria-label="a11y.primaryNav">' + navLinks("site-nav__link") + "</nav>" +
              '<div class="site-header__actions">' +
                socialLinksMarkup("site-header__social") +
                langSwitchMarkup("") +
                '<button class="site-nav-toggle" id="navToggle" aria-expanded="false" aria-controls="mobileMenu" aria-label="Open menu" data-i18n-aria-label="nav.openMenu">' +
                  '<span class="site-nav-toggle__line"></span>' +
                  '<span class="site-nav-toggle__line"></span>' +
                "</button>" +
              "</div>") +
          "</div>" +
        "</header>" +
        (isHome ? "" :
          '<div class="mobile-menu" id="mobileMenu" aria-hidden="true">' +
            '<nav class="mobile-menu__nav" aria-label="Mobile" data-i18n-aria-label="a11y.mobileNav">' + navLinks("mobile-menu__link") + "</nav>" +
            '<div class="mobile-menu__foot">' +
              '<span data-i18n="footer.city">Belgrade, Serbia</span>' +
              socialLinksMarkup("mobile-menu__social") +
              '<a href="mailto:info@grmstudio.music" class="is-mail">info@grmstudio.music</a>' +
            "</div>" +
          "</div>");
    }

    /* Home is a headerless, immersive division selector at EVERY size — no
       brand, no nav, no hamburger, and no header wrapper taking space (CSS
       hides the injected header). Its only utility UI is the standalone
       .lang-switch--home overlay, which is the single language control there. */
    if (isHome) {
      document.body.insertAdjacentHTML("beforeend", langSwitchMarkup("lang-switch--home"));
    }

    if (footerMount) {
      footerMount.innerHTML =
        '<footer class="site-footer" id="siteFooter">' +
          '<img class="site-footer__watermark" src="' + root + 'assets/img/GRM 4K 1x1_Transparent.png"' +
               ' alt="" loading="lazy" width="2160" height="2160">' +
          '<div class="container">' +
            '<div class="site-footer__top">' +
              '<a href="' + root + 'index.html" class="site-footer__brand" aria-label="GRM — back to top" data-i18n-aria-label="a11y.headerBrand">' +
                '<img src="' + root + 'assets/img/grm-mark.png" alt="" width="46" height="46">' +
                '<span data-i18n="brand.footer">GRM</span>' +
              "</a>" +
              '<p class="site-footer__lede" data-i18n="footer.lede">' +
                "An umbrella house in Belgrade — recording &amp; production, a record label, and a live rehearsal room under one GRM." +
              "</p>" +
              '<div class="site-footer__nav">' +
                '<span class="site-footer__col-label" data-i18n="footer.col.grm">GRM</span>' +
                '<a href="' + root + 'index.html" data-i18n="nav.home">Home</a>' +
                '<a href="' + root + 'studio/" data-i18n="nav.production">Production</a>' +
                '<a href="' + root + 'label/" data-i18n="nav.label">Label</a>' +
                '<a href="' + root + 'liveroom/" data-i18n="nav.liveroom">Liveroom</a>' +
              "</div>" +
              '<div class="site-footer__contact">' +
                '<span class="site-footer__col-label" data-i18n="footer.col.contact">Contact</span>' +
                '<p data-i18n="footer.city">Belgrade, Serbia</p>' +
                '<a href="mailto:info@grmstudio.music">info@grmstudio.music</a>' +
              "</div>" +
              '<div class="site-footer__social">' +
                '<span class="site-footer__col-label" data-i18n="footer.col.follow">Follow</span>' +
                socialLinksMarkup("") +
              "</div>" +
            "</div>" +
            '<div class="site-footer__bottom">' +
              '<p>© <span id="year">2026</span> <span data-i18n="footer.rights">GRM — All rights reserved</span></p>' +
              '<a href="#top" class="site-footer__top-link" data-i18n="footer.backToTop">Back to top</a>' +
            "</div>" +
          "</div>" +
        "</footer>";
    }

    /* Localize the freshly injected chrome (i18n.js loads first, so the
       engine is ready; its own DOMContentLoaded pass will re-run anyway). */
    if (window.GRMi18n) window.GRMi18n.refresh();
  }

  injectSiteChrome();

  /* Social links are inert placeholders until the canonical URLs are supplied
     in SOCIAL_LINKS: keep the empty href="#" links from jumping to the top. */
  document.addEventListener("click", function (e) {
    var link = e.target && e.target.closest ? e.target.closest("[data-pending-social]") : null;
    if (link) { e.preventDefault(); e.stopPropagation(); }
  });

  /* One-time Home entrance presentation using the real hero layers. */
  (function () {
    if (document.body.getAttribute("data-page") !== "home") return;
    // The entrance animation composes the desktop accordion's layered marks.
    // On the mobile stacked-destination hero there is nothing to compose, so
    // skip it entirely — but always clear the pre-paint hold it set in <head>.
    if (window.matchMedia("(max-width: 767px), (pointer: coarse) and (max-height: 560px)").matches) {
      document.documentElement.classList.remove("home-intro-pending");
      return;
    }
    var reduce = reduced();
    var seen = false;
    try { seen = sessionStorage.getItem("grm-home-intro-seen") === "1"; } catch (e) {}
    if ((!HOME_INTRO_DEBUG_REPLAY && seen) || reduce) {
      document.documentElement.classList.remove("home-intro-pending");
      return;
    }
    try { sessionStorage.setItem("grm-home-intro-seen", "1"); } catch (e) {}
    var home = document.querySelector(".hero");
    var header = document.querySelector(".site-header");
    var dividers = Array.prototype.slice.call(document.querySelectorAll(".panel + .panel"));
    var portions = [
      document.querySelector("#panelProduction .panel__logo-window"),
      document.querySelector("#panelHouse .panel__logo-window"),
      document.querySelector("#panelLive .panel__logo-window")
    ];
    var pulseTargets = [
      document.querySelector("#panelHouse .panel__logo--glow"),
      document.querySelector("#panelProduction .panel__logo--glow"),
      document.querySelector("#panelLive .panel__logo--glow")
    ];
    function pulseGlow(element) {
      if (!element) return;
      element.classList.remove("home-intro-pulse");
      void element.offsetWidth;
      element.addEventListener("animationend", function cleanup(event) {
        if (event.animationName !== "home-intro-glow-pulse") return;
        element.classList.remove("home-intro-pulse");
        element.removeEventListener("animationend", cleanup);
      });
      element.classList.add("home-intro-pulse");
    }
    if (!home || !header || dividers.length !== 2 || portions.some(function (item) { return !item; })) {
      document.documentElement.classList.remove("home-intro-pending");
      return;
    }
    document.body.classList.add("home-intro-running");
    ["panelHouse", "panelLive"].forEach(function (id, index) {
      var panel = document.getElementById(id);
      if (!panel) return;
      var line = document.createElement("i");
      line.className = "home-intro-divider home-intro-divider--" + (index ? "right" : "left");
      panel.appendChild(line);
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        setTimeout(function () {
          document.body.classList.add("home-intro-lines");
        }, 450);
        setTimeout(function () { document.body.classList.add("home-intro-label"); pulseGlow(pulseTargets[0]); }, 1450);
        setTimeout(function () { document.body.classList.add("home-intro-studio"); pulseGlow(pulseTargets[1]); }, 1850);
        setTimeout(function () { document.body.classList.add("home-intro-liveroom"); pulseGlow(pulseTargets[2]); }, 2250);
        setTimeout(function () {
          document.body.classList.add("home-intro-header-visible");
        }, 3200);
        setTimeout(function () {
          document.body.classList.remove("home-intro-running", "home-intro-lines", "home-intro-label", "home-intro-studio", "home-intro-liveroom", "home-intro-header-visible");
          document.documentElement.classList.remove("home-intro-pending");
        }, 3650);
      });
    });
  }());

  /* Studio -> Label only: identity dissolve, separate from Home arrivals. */
  (function () {
    if (document.body.getAttribute("data-page") !== "studio" || reduced()) return;
    var busy = false;
    document.addEventListener("click", function (event) {
      var link = event.target.closest('.site-nav a[href$="label/"]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || busy) return;
      event.preventDefault();
      busy = true;
      var logo = document.querySelector(".studio-minimal-hero__logo");
      var rect = logo && logo.getBoundingClientRect();
      if (rect) {
        sessionStorage.setItem("grm-morph-arrival", "label");
        sessionStorage.setItem("grm-morph-start", JSON.stringify({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
      }
      document.body.classList.add("is-division-morph-exit");
      setTimeout(function () { window.location.href = link.href; }, 520);
    });
  }());

  /* Liveroom -> Label only: isolated copy of the Liveroom source handoff. */
  (function () {
    if (document.body.getAttribute("data-page") !== "liveroom" || reduced()) return;
    var busy = false;
    document.addEventListener("click", function (event) {
      var link = event.target.closest('.site-nav a[href$="label/"]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || busy) return;
      event.preventDefault();
      busy = true;
      var logo = document.querySelector(".division-minimal-hero__logo");
      var rect = logo && logo.getBoundingClientRect();
      if (rect) {
        sessionStorage.setItem("grm-morph-arrival", "label");
        sessionStorage.setItem("grm-morph-start", JSON.stringify({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
      }
      document.body.classList.add("is-division-page-morph-exit");
      setTimeout(function () { window.location.href = link.href; }, 520);
    });
  }());

  /* Liveroom -> Studio only: isolated copy of the Label source handoff. */
  (function () {
    if (document.body.getAttribute("data-page") !== "liveroom" || reduced()) return;
    var busy = false;
    document.addEventListener("click", function (event) {
      var link = event.target.closest('.site-nav a[href$="studio/"]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || busy) return;
      event.preventDefault();
      busy = true;
      var logo = document.querySelector(".division-minimal-hero__logo");
      var rect = logo && logo.getBoundingClientRect();
      if (rect) {
        sessionStorage.setItem("grm-morph-arrival", "studio");
        sessionStorage.setItem("grm-morph-start", JSON.stringify({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
      }
      setTimeout(function () { window.location.href = link.href; }, 520);
    });
  }());

  /* Label -> Liveroom only: isolated copy of the Label source handoff. */
  (function () {
    if (document.body.getAttribute("data-page") !== "label" || reduced()) return;
    var busy = false;
    document.addEventListener("click", function (event) {
      var link = event.target.closest('.site-nav a[href$="liveroom/"]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || busy) return;
      event.preventDefault();
      busy = true;
      var logo = document.querySelector(".division-minimal-hero__logo");
      var rect = logo && logo.getBoundingClientRect();
      if (rect) {
        sessionStorage.setItem("grm-morph-arrival", "liveroom");
        sessionStorage.setItem("grm-morph-start", JSON.stringify({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
      }
      document.body.classList.add("is-division-page-morph-exit");
      setTimeout(function () { window.location.href = link.href; }, 520);
    });
  }());

  /* Studio -> Liveroom only: isolated copy of the Studio source handoff. */
  (function () {
    if (document.body.getAttribute("data-page") !== "studio" || reduced()) return;
    var busy = false;
    document.addEventListener("click", function (event) {
      var link = event.target.closest('.site-nav a[href$="liveroom/"]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || busy) return;
      event.preventDefault();
      busy = true;
      var logo = document.querySelector(".studio-minimal-hero__logo");
      var rect = logo && logo.getBoundingClientRect();
      if (rect) {
        sessionStorage.setItem("grm-morph-arrival", "liveroom");
        sessionStorage.setItem("grm-morph-start", JSON.stringify({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
      }
      document.body.classList.add("is-division-morph-exit");
      setTimeout(function () { window.location.href = link.href; }, 520);
    });
  }());

  /* Label -> Studio only: use the approved division identity handoff. */
  (function () {
    if (document.body.getAttribute("data-page") !== "label" || reduced()) return;
    var busy = false;
    document.addEventListener("click", function (event) {
      var link = event.target.closest('.site-nav a[href$="studio/"]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || busy) return;
      event.preventDefault();
      busy = true;
      var logo = document.querySelector(".division-minimal-hero__logo");
      var rect = logo && logo.getBoundingClientRect();
      if (rect) {
        sessionStorage.setItem("grm-morph-arrival", "studio");
        sessionStorage.setItem("grm-morph-start", JSON.stringify({ left: rect.left, top: rect.top, width: rect.width, height: rect.height }));
      }
      setTimeout(function () { window.location.href = link.href; }, 520);
    });
  }());

  /* ---------- SHARED HELPERS ---------- */
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function reduced() { return prefersReduced.matches; }

  /* ---------- FOOTER YEAR ---------- */
  onReady(function () {
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
  });

  /* ---------- HEADER + PROGRESS ---------- */
  onReady(function () {
    var header = document.getElementById("siteHeader");
    var progress = document.getElementById("progress");
    if (!header) return;

    var ticking = false;

    function tick() {
      var y = window.scrollY || 0;
      var vh = window.innerHeight || document.documentElement.clientHeight;

      header.classList.toggle("is-scrolled", y > 60);

      if (progress) {
        var doc = Math.max(
          document.documentElement.scrollHeight,
          document.body ? document.body.scrollHeight : 0
        );
        var max = Math.max(0, doc - vh);
        progress.style.transform = "scaleX(" + (max ? y / max : 0) + ")";
      }

      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      RAF(tick);
    }

    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  });

  /* ---------- MOBILE MENU ---------- */
  onReady(function () {
    var toggle = document.getElementById("navToggle");
    var menu = document.getElementById("mobileMenu");
    if (!toggle || !menu) return;

    function open(force) {
      isMobileMenuOpen = !!force;
      document.body.classList.toggle("menu-open", force);
      toggle.setAttribute("aria-expanded", String(force));
      toggle.setAttribute("aria-label", force ? tr("nav.closeMenu", "Close menu") : tr("nav.openMenu", "Open menu"));
      menu.setAttribute("aria-hidden", String(!force));

      if (force) {
        lastFocused = document.activeElement;
        var first = menu.querySelector("a");
        if (first) first.focus();
      } else if (lastFocused) {
        lastFocused.focus();
      }
    }

    toggle.addEventListener("click", function () {
      open(!isMobileMenuOpen);
    });

    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) open(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isMobileMenuOpen) open(false);
    });
  });

  /* ---------- REVEALS ---------- */
  onReady(function () {
    var targets = document.querySelectorAll(".reveal");
    if (!targets.length) return;

    if (reduced() || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("in-view"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    targets.forEach(function (el) { io.observe(el); });
  });

  /* ---------- HERO PANELS: three GRM worlds ----------
     Hover and focus preview a world. The panels are real links, so
     click/tap remains navigation rather than an accordion toggle. */
  onReady(function () {
    var root = document.getElementById("heroPanels");
    if (!root) return;

    var panels = Array.prototype.slice.call(root.querySelectorAll(".panel"));
    var hero = document.getElementById("top");
    var logoFrame = 0;

    /* Route-transition lock (§13/14/29): a takeover seam that sits ON TOP
       of the locked hero accordion. While it is set, mouseleave must NOT
       collapse the selected panel — the panel owns the animation until the
       real link navigation commits. The hero's own hover/show/hide behavior
       is NEVER touched; this flag only short-circuits `settle()` during an
       explicit user-initiated navigation. */
    var isTransitioning = false;

    function syncLogoWindows() {
      var heroRect = hero.getBoundingClientRect();
      panels.forEach(function (panel) {
        var rect = panel.getBoundingClientRect();
        panel.style.setProperty("--panel-left", (rect.left - heroRect.left) + "px");
        panel.style.setProperty("--panel-top", (rect.top - heroRect.top) + "px");
      });
      cancelAnimationFrame(logoFrame);
      logoFrame = requestAnimationFrame(syncLogoWindows);
    }

    function setExpanded(panel, expanded, opts) {
      opts = opts || {};
      var was = panel.classList.contains("is-expanded");
      if (was === expanded) return;

      panel.classList.toggle("is-expanded", expanded);
      panel.setAttribute("aria-expanded", String(expanded));
      syncLogoWindows();

      // keep only one panel open at a time (accordion semantics)
      if (expanded) {
        panels.forEach(function (p) {
          if (p !== panel && p.classList.contains("is-expanded")) {
            p.classList.remove("is-expanded");
            p.setAttribute("aria-expanded", "false");
          }
        });
      }

    }

    function expand(panel) { setExpanded(panel, true); }
    function collapse(panel) { setExpanded(panel, false); }

    function settle() {
      if (isTransitioning) return; /* §14/13: takeover owns the motion */
      panels.forEach(function (p) {
        if (p.classList.contains("is-expanded") &&
            document.activeElement !== p &&
            !p.contains(document.activeElement)) {
          collapse(p);
        }
      });
    }

    // pointer
    root.addEventListener("mouseleave", function () {
      settle();
    });
    panels.forEach(function (panel) {
      panel.addEventListener("mouseenter", function () {
        expand(panel);
      });
    });
    window.addEventListener("resize", syncLogoWindows);
    syncLogoWindows();

    /* Warm the three destination rects so the committed logo always has its
       real target before the user can click — the same prefetch the mobile
       path runs. Never on reduced motion (that path navigates instantly). */
    if (!prefersReduced.matches) {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(function () { prefetchDestLogos(); }, { timeout: 1500 });
      }
      setTimeout(prefetchDestLogos, 1500);
    }

    // route-transition seam (§4/5 · §13/14 · §29): click is the natural
    // final stage of the accordion — it does NOT reset to neutral first (§3).
    // The selected panel owns the motion: we take the same accordion path the
    // hover already started, let it keep expanding (flex-grow continuation,
    // no resize, no neutral detour), and ONLY when the takeover timing has
    // passed do we commit the real link navigation.
    root.addEventListener("click", function (e) {
      var panel = e.target.closest(".panel");
      if (!panel) return; // not a panel — leave default alone

      // §24 reduced motion: no sweeping takeover, navigate immediately
      if (prefersReduced.matches) return;
      // §13/14 double-click / repeat guard while the takeover owns motion
      if (isTransitioning) { e.preventDefault(); return; }

      e.preventDefault(); // we time the real navigation below
      isTransitioning = true;
      if (panel.id === "panelHouse") {
        panel.classList.add("is-label-takeover-selected");
      }
      if (panel.id === "panelLive") {
        panel.classList.add("is-liveroom-takeover-selected");
      }
      hero.classList.add("is-takeover");

      // continue from the CURRENT accordion state — if this panel is already
      // expanded (hovered), expand() is a no-op, so there is NO reset; if it
      // is not yet active, this is the same expand the hover would have
      // produced, so the accordion still owns the motion.
      expand(panel);

      // takeover continues to full ownership, then a short logo hold, then
      // commit the destination (real <a> href, real history — Pages-safe)
      setTimeout(function () {
        // §8/11 destination-arrival flag: remember which division the takeover
        // is committing to, so the Studio page (and only Studio) can reveal
        // around its mark on arrival. Reduced motion never reaches this line
        // (§24 navigates immediately above), and it is cleared on read, so
        // direct load / refresh / back never replay the arrival (§23).
        var destination = panel.getAttribute("href");
        var destPage = destination.replace(/\/$/, "");
        var sourceLogo = panel.querySelector(".panel__logo--glow");
        var logoWindow = panel.querySelector(".panel__logo-window");
        function retarget(aimRect) {
          if (!aimRect || !sourceLogo || !logoWindow) return;
          var box = logoWindow.getBoundingClientRect();
          sourceLogo.getBoundingClientRect(); // flush, so the transition is armed
          sourceLogo.style.width = aimRect.width + "px";
          sourceLogo.style.height = aimRect.height + "px";
          sourceLogo.style.left = (aimRect.left - box.left + aimRect.width / 2) + "px";
          sourceLogo.style.top = (aimRect.top - box.top + aimRect.height / 2) + "px";
        }
        function commit(aimRect) {
          var sourceRect = sourceLogo && sourceLogo.getBoundingClientRect();
          if (destination === "studio/") {
            sessionStorage.setItem("grm-arrival", "studio");
            if (sourceLogo) {
              panel.classList.add("is-studio-logo-committed");
              sourceLogo.classList.add("is-studio-logo-committed");
              retarget(aimRect);
            }
            setTimeout(function () {
              window.location.href = destination;
            }, 820);
            return;
          }
          if (destination === "label/") {
            sessionStorage.setItem("grm-arrival", "label");
            if (sourceRect) {
              sessionStorage.setItem("grm-label-start-rect", JSON.stringify({
                left: sourceRect.left,
                top: sourceRect.top,
                width: sourceRect.width,
                height: sourceRect.height
              }));
            }
            if (sourceLogo) {
              panel.classList.add("is-label-logo-committed");
              sourceLogo.classList.add("is-label-logo-committed");
              retarget(aimRect);
            }
            setTimeout(function () {
              if (sourceLogo) {
                var committedRect = sourceLogo.getBoundingClientRect();
                sessionStorage.setItem("grm-label-start-rect", JSON.stringify({
                  left: committedRect.left,
                  top: committedRect.top,
                  width: committedRect.width,
                  height: committedRect.height
                }));
              }
              window.location.href = destination;
            }, 820);
            return;
          }
          if (destination === "liveroom/") {
            sessionStorage.setItem("grm-arrival", "liveroom");
            if (sourceRect) sessionStorage.setItem("grm-liveroom-start-rect", JSON.stringify({
              left: sourceRect.left,
              top: sourceRect.top,
              width: sourceRect.width,
              height: sourceRect.height
            }));
            if (sourceLogo) {
              panel.classList.add("is-liveroom-logo-committed");
              sourceLogo.classList.add("is-liveroom-logo-committed");
              retarget(aimRect);
            }
            setTimeout(function () {
              if (sourceLogo) {
                var committedRect = sourceLogo.getBoundingClientRect();
                sessionStorage.setItem("grm-liveroom-start-rect", JSON.stringify({
                  left: committedRect.left,
                  top: committedRect.top,
                  width: committedRect.width,
                  height: committedRect.height
                }));
              }
              window.location.href = destination;
            }, 820);
            return;
          }
          window.location.href = destination;
        }
        // The destination's own rendered logo rect is the single source of
        // truth. It is written by that division page, and prefetched/measured
        // offscreen here on a cold visit — so the committed logo always lands
        // exactly on it instead of a guessed 38% fallback. Warm or prefetched,
        // the promise resolves in a microtask and the approved timing is
        // unchanged; a cold measurement only delays the logo-only hold.
        getDestLogoRect(destPage).then(function (aimRect) {
          setTimeout(function () { commit(aimRect); }, 820);
        });
      }, 820); // ~650ms continuation + ~170ms logo-only hold (§11)

    });

    // keyboard
    root.addEventListener("keydown", function (e) {
      var panel = e.target.closest(".panel");
      if (!panel) return;

      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        var i = panels.indexOf(panel);
        var next = panels[i + (e.key === "ArrowRight" ? 1 : -1)];
        if (!next) next = panels[i + (e.key === "ArrowRight" ? -1 : 1)];
        if (next) {
          next.focus();
          expand(next);
        }
      }
    });

    // focus out of the whole section settles it
    document.addEventListener("focusin", function (e) {
      if (!root.contains(e.target)) settle();
    });
  });

  /* ---------- HOME · MOBILE STACKED DESTINATION SELECTOR ----------
     Phone-only companion to the locked desktop accordion (§ above). It
     activates at the mobile hero breakpoint and, for phones in landscape,
     on the capability query (pointer: coarse + short viewport) — so a
     touch-only landscape phone never gets the hover accordion. It drives
     the stacked three-destination home. Tap choreography is two clean,
     non-overlapping phases:

        PHASE 1 · ISOLATE (~180ms)
          → everything on the Home hero except the selected division mark
            fades to the black stage; the selected mark does NOT move or
            scale — it sits exactly on its resting box

        PHASE 2 · MORPH (560ms)
          → only once the stage is clear, that single mark becomes a fixed
            transition object and scales/morphs to the destination page's
            REAL rendered logo rect
          → the approved destination arrival choreography takes over

     The desktop accordion's own click path never runs here: this handler
     sits in the capture phase and stops the event before it reaches it.
     Reduced motion skips the whole handoff and lets the browser navigate
     instantly (the default link behaviour). */
  onReady(function () {
    if (document.body.getAttribute("data-page") !== "home") return;

    var root = document.getElementById("heroPanels");
    var hero = document.getElementById("top");
    if (!root || !hero) return;

    var mqMobile = window.matchMedia("(max-width: 767px), (pointer: coarse) and (max-height: 560px)");

    /* Mobile accessible names, applied only while the stacked layout is
       active; the desktop accordion's authored names are captured and
       restored verbatim, so desktop semantics are untouched. */
    var A11Y_FALLBACK = { studio: "GRM Studio", label: "GRM Label", liveroom: "GRM Liveroom" };
    var baseLabels = {};
    Array.prototype.forEach.call(root.querySelectorAll(".panel"), function (panel) {
      baseLabels[panel.id] = panel.getAttribute("aria-label") || "";
    });
    function syncPanelNames() {
      var mobile = mqMobile.matches;
      Array.prototype.forEach.call(root.querySelectorAll(".panel"), function (panel) {
        var pg = (panel.getAttribute("href") || "").replace(/\/+$/, "");
        if (mobile && A11Y_FALLBACK[pg]) {
          panel.setAttribute("aria-label", tr("a11y.panel." + pg, A11Y_FALLBACK[pg]));
        } else {
          var key = panel.getAttribute("data-i18n-aria-label");
          if (key) panel.setAttribute("aria-label", tr(key, baseLabels[panel.id]));
          else if (baseLabels[panel.id]) panel.setAttribute("aria-label", baseLabels[panel.id]);
        }
      });
    }
    syncPanelNames();
    if (mqMobile.addEventListener) mqMobile.addEventListener("change", syncPanelNames);
    else if (mqMobile.addListener) mqMobile.addListener(syncPanelNames);
    document.addEventListener("grm:languagechange", syncPanelNames);

    var transitioning = false;

    function makeOverlay(src, rect) {
      var img = document.createElement("img");
      img.className = "grm-mobile-transition-logo";
      img.alt = "";
      img.setAttribute("aria-hidden", "true");
      img.src = src;
      img.style.left = rect.left + "px";
      img.style.top = rect.top + "px";
      img.style.width = rect.width + "px";
      img.style.height = rect.height + "px";
      img.style.opacity = "0";
      document.body.appendChild(img);
      return img;
    }

    /* Two-phase choreography: PHASE 1 isolates the selected mark (~180ms,
       everything else on the hero fades to black); PHASE 2 morphs that single
       mark (560ms) to the destination logo rect. Never overlapped. */
    var ISOLATE_MS = 180;
    var MORPH_MS = 560;
    var MORPH_AT = ISOLATE_MS;               // morph begins as isolation ends

    function runTakeover(panel) {
      var dest = panel.getAttribute("href");
      var page = dest.replace(/\/+$/, "");
      var source = panel.querySelector(".panel__mobile-logo") ||
                   panel.querySelector(".panel__logo--glow");
      if (!source) { window.location.href = dest; return; }

      var startRect = source.getBoundingClientRect();

      // PHASE 1 — the selected mark becomes a fixed object sitting on its
      // exact resting box (pixel-identical to the in-flow logo, so it does not
      // move), the in-flow one is hidden, and the whole hero fades around it.
      var overlay = makeOverlay(source.currentSrc || source.src, startRect);
      overlay.style.opacity = "1";
      panel.classList.add("is-selected-panel", "is-panel-active");
      hero.classList.add("is-mobile-isolating");

      var navigated = false;
      function commit() {
        if (navigated) return;
        navigated = true;
        window.location.href = dest;
      }

      var t0 = performance.now();
      var since = function () { return performance.now() - t0; };

      getDestLogoRect(page).then(function (aim) {
        // PHASE 2 begins only after the Home content has cleared — or as soon
        // as the destination rect is ready, if a cold measurement is slower.
        var morphDelay = Math.max(0, MORPH_AT - since());

        setTimeout(function () {
          if (aim) {
            overlay.getBoundingClientRect(); // flush, so the morph is armed
            overlay.style.transition =
              "left " + MORPH_MS + "ms cubic-bezier(0.22, 1, 0.36, 1)," +
              "top " + MORPH_MS + "ms cubic-bezier(0.22, 1, 0.36, 1)," +
              "width " + MORPH_MS + "ms cubic-bezier(0.22, 1, 0.36, 1)," +
              "height " + MORPH_MS + "ms cubic-bezier(0.22, 1, 0.36, 1)";
            overlay.style.left = aim.left + "px";
            overlay.style.top = aim.top + "px";
            overlay.style.width = aim.width + "px";
            overlay.style.height = aim.height + "px";
          }
        }, morphDelay);

        // hand the finished rect to the approved destination arrival, then
        // commit — only AFTER the morph has actually completed, so the
        // overlay is always sitting exactly on the destination logo rect
        // when the arrival takes over (nothing to jump)
        setTimeout(function () {
          if (aim) {
            try {
              sessionStorage.setItem("grm-arrival", page);
              if (page === "label") sessionStorage.setItem("grm-label-start-rect", JSON.stringify(aim));
              if (page === "liveroom") sessionStorage.setItem("grm-liveroom-start-rect", JSON.stringify(aim));
            } catch (e) {}
          }
          commit();
        }, morphDelay + (aim ? MORPH_MS + 40 : 40));
      });
    }

    /* Capture-phase tap: takes over from the desktop click handler on
       mobile, and leaves the default link behaviour completely alone on
       reduced motion. Modifier-clicks (open in new tab) fall through. */
    root.addEventListener("click", function (e) {
      if (!mqMobile.matches) return;
      if (prefersReduced.matches) return;
      var panel = e.target.closest && e.target.closest(".panel");
      if (!panel || !root.contains(panel)) return;
      if (e.button && e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      e.preventDefault();
      e.stopPropagation();               // never reach the desktop handler
      if (transitioning) return;         // double-tap / repeat guard
      transitioning = true;
      runTakeover(panel);
    }, true);

    /* While a handoff owns the motion, swallow the accordion's leave reset
       (forwarded from an ancestor capture so it always runs first). */
    function holdDuringTakeover(e) {
      if (transitioning) e.stopImmediatePropagation();
    }
    document.addEventListener("mouseleave", holdDuringTakeover, true);
    document.addEventListener("pointerleave", holdDuringTakeover, true);
    document.addEventListener("pointercancel", holdDuringTakeover, true);

    // lock is per navigation; a bfcache return re-arms it AND must restore the
    // home (never leave the isolation state applied, §14)
    window.addEventListener("pageshow", function () {
      transitioning = false;
      hero.classList.remove("is-mobile-isolating");
      Array.prototype.forEach.call(root.querySelectorAll(".panel"), function (p) {
        p.classList.remove("is-selected-panel", "is-panel-active");
      });
      Array.prototype.forEach.call(document.querySelectorAll(".grm-mobile-transition-logo"), function (o) {
        if (o.parentNode) o.parentNode.removeChild(o);
      });
    });

    if (mqMobile.matches && !prefersReduced.matches) {
      // intent: the instant a finger lands on a panel, start measuring that
      // destination, so the morph has its target well before the tap's click
      function warmIntent(e) {
        var panel = e.target.closest && e.target.closest(".panel");
        if (!panel || !root.contains(panel)) return;
        var href = panel.getAttribute("href");
        if (href) getDestLogoRect(href.replace(/\/+$/, ""));
      }
      root.addEventListener("pointerdown", warmIntent, true);
      root.addEventListener("touchstart", warmIntent, { capture: true, passive: true });

      // and warm all three quietly in the background (idle, with a hard
      // fallback so it is never left un-scheduled)
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(function () { prefetchDestLogos(); }, { timeout: 1500 });
      }
      setTimeout(prefetchDestLogos, 1500);
    }
  });

  /* ---------- HOME -> DIVISION HANDOFF GEOMETRY ----------
The Home takeover used to aim its committed logo at a hardcoded 38% of the
Home panel, which does not line up with where the destination page actually
renders its hero logo: the two disagreed by 13-150px of y depending on the
viewport. Each division page publishes its own hero logo rect here — measured
with getBoundingClientRect() once its own layout has settled, so the rendered
destination logo is the source of truth — and the Home takeover reads it back
to land the committed logo exactly on the destination. Keyed by viewport, so a
resize simply misses and falls back to the previous aim point. */
(function () {
  var page = document.body.getAttribute("data-page");
  if (page !== "label" && page !== "liveroom" && page !== "studio") return;
  var logo = document.querySelector(page === "studio" ? ".studio-minimal-hero__logo" : ".division-minimal-hero__logo");
  if (!logo) return;
  function publish() {
    var r = logo.getBoundingClientRect();
    if (!r.width || !r.height) return;
    try {
      sessionStorage.setItem(DEST_LOGO_KEY + ":" + page + ":" + innerWidth + "x" + innerHeight,
        JSON.stringify({ left: r.left, top: r.top, width: r.width, height: r.height }));
    } catch (e) {}
  }
  function settled() {
    requestAnimationFrame(function () { requestAnimationFrame(publish); });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settled);
  else settled();
  window.addEventListener("resize", settled);
})();

/* ---------- STUDIO-ONLY · §8/9/11 destination-arrival reveal ----------
     The home takeover remembers the division it commits to (grm-arrival,
     set ONLY on the takeover path, cleared on read). This block — and it
     alone — is Studio-scoped: when Studio actually arrives out of that
     takeover (and NOT reduced motion, §24, meaning the flag was never set),
     the hero reveals AROUND its mark: the mark stays put, the inner content
     staggers in around it. Direct load, refresh, back-forward and reduced
     motion all stay instant: the flag is consumed on read and it does not
     survive those (§23/24/§29). */

  /* Division -> division arrivals begin at the top. html{scroll-behavior:smooth}
     would otherwise animate the reset and reveal it, so force an instant jump
     (the transition layer owns the screen at this point). */
  function resetDivisionScrollTop() {
    if (!window.scrollY) return;
    var root = document.documentElement;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = "";
  }

  onReady(function () {
    if (document.body.getAttribute("data-page") === "label" && sessionStorage.getItem("grm-morph-arrival") === "label") {
      if (window.__grmStudioLabelMorph) return;
      window.__grmStudioLabelMorph = true;
      sessionStorage.removeItem("grm-morph-arrival");
      var source = JSON.parse(sessionStorage.getItem("grm-morph-start") || "null");
      sessionStorage.removeItem("grm-morph-start");
      var target = document.querySelector(".division-minimal-hero__logo");
      if (!source || !target) return;
      resetDivisionScrollTop();
      document.fonts.ready.then(function () {
        requestAnimationFrame(function () {
          var end = target.getBoundingClientRect();
          target.style.visibility = "hidden";
          var morph = document.createElement("img");
          morph.className = "division-morph-logo";
          morph.src = "../assets/img/GRM Label Glow.png";
          morph.alt = "";
          morph.setAttribute("aria-hidden", "true");
          morph.style.left = end.left + "px";
          morph.style.top = end.top + "px";
          morph.style.width = end.width + "px";
          morph.style.height = end.height + "px";
          document.body.appendChild(morph);
          void morph.getBoundingClientRect();
          morph.style.transition = "opacity 700ms ease";
          morph.style.opacity = "0";
          target.style.visibility = "visible";
           morph.addEventListener("transitionend", function () {
             morph.remove();
             document.documentElement.classList.remove("division-morph-pending");
             setTimeout(function () { document.body.classList.add("is-division-enter-title"); }, 480);
             setTimeout(function () { document.body.classList.add("is-division-enter-descriptor"); }, 820);
             setTimeout(function () {
             document.body.classList.add("is-division-enter-scroll");
             var scrollIndicator = document.querySelector(".division-minimal-hero__scroll");
             if (scrollIndicator) {
               scrollIndicator.addEventListener("transitionend", function (event) {
                 if (event.propertyName === "opacity") {
                   document.documentElement.classList.remove("division-morph-ui-pending");
                 }
               }, { once: true });
             }
             }, 1160);
           }, { once: true });
          void end;
        });
      });
    }
    if (document.body.getAttribute("data-page") === "liveroom" && sessionStorage.getItem("grm-morph-arrival") === "liveroom") {
      if (window.__grmStudioLiveroomMorph) return;
      window.__grmStudioLiveroomMorph = true;
      sessionStorage.removeItem("grm-morph-arrival");
      var source = JSON.parse(sessionStorage.getItem("grm-morph-start") || "null");
      sessionStorage.removeItem("grm-morph-start");
      var target = document.querySelector(".division-minimal-hero__logo");
      if (!source || !target) return;
      resetDivisionScrollTop();
      document.fonts.ready.then(function () {
        requestAnimationFrame(function () {
          var end = target.getBoundingClientRect();
          target.style.visibility = "hidden";
          var morph = document.createElement("img");
          morph.className = "division-morph-logo";
          morph.src = "../assets/img/GRM LiveRoom Glow.png";
          morph.alt = "";
          morph.setAttribute("aria-hidden", "true");
          morph.style.left = end.left + "px";
          morph.style.top = end.top + "px";
          morph.style.width = end.width + "px";
          morph.style.height = end.height + "px";
          document.body.appendChild(morph);
          void morph.getBoundingClientRect();
          morph.style.transition = "opacity 700ms ease";
          morph.style.opacity = "0";
          target.style.visibility = "visible";
           morph.addEventListener("transitionend", function () {
             morph.remove();
             document.documentElement.classList.remove("division-morph-pending");
             setTimeout(function () { document.body.classList.add("is-division-enter-title"); }, 480);
             setTimeout(function () { document.body.classList.add("is-division-enter-descriptor"); }, 820);
             setTimeout(function () {
             document.body.classList.add("is-division-enter-scroll");
             var scrollIndicator = document.querySelector(".division-minimal-hero__scroll");
             if (scrollIndicator) {
               scrollIndicator.addEventListener("transitionend", function (event) {
                 if (event.propertyName === "opacity") {
                   document.documentElement.classList.remove("division-morph-ui-pending");
                 }
               }, { once: true });
             }
             }, 1160);
           }, { once: true });
          void end;
        });
      });
    }

    if (document.body.getAttribute("data-page") === "studio" && sessionStorage.getItem("grm-morph-arrival") === "studio") {
      if (window.__grmDivisionStudioMorph) return;
      window.__grmDivisionStudioMorph = true;
      sessionStorage.removeItem("grm-morph-arrival");
      var source = JSON.parse(sessionStorage.getItem("grm-morph-start") || "null");
      sessionStorage.removeItem("grm-morph-start");
      var target = document.querySelector(".studio-minimal-hero__logo");
      if (!source || !target) return;
      resetDivisionScrollTop();
      document.fonts.ready.then(function () {
        requestAnimationFrame(function () {
          var end = target.getBoundingClientRect();
          target.style.visibility = "hidden";
          var morph = document.createElement("img");
          morph.className = "studio-morph-logo";
          morph.src = "../assets/img/GRM Studio Glow.png";
          morph.alt = "";
          morph.setAttribute("aria-hidden", "true");
          morph.style.left = end.left + "px";
          morph.style.top = end.top + "px";
          morph.style.width = end.width + "px";
          morph.style.height = end.height + "px";
          document.body.appendChild(morph);
          void morph.getBoundingClientRect();
          morph.style.transition = "opacity 700ms ease";
          morph.style.opacity = "0";
          target.style.visibility = "visible";
           morph.addEventListener("transitionend", function () {
             morph.remove();
             document.documentElement.classList.remove("studio-morph-pending");
             setTimeout(function () { document.body.classList.add("is-studio-enter-title"); }, 480);
             setTimeout(function () { document.body.classList.add("is-studio-enter-descriptor"); }, 820);
             setTimeout(function () {
             document.body.classList.add("is-studio-enter-scroll");
             var scrollIndicator = document.querySelector(".studio-minimal-hero__scroll");
             if (scrollIndicator) {
               scrollIndicator.addEventListener("transitionend", function (event) {
                 if (event.propertyName === "opacity") {
                   document.documentElement.classList.remove("studio-morph-ui-pending");
                 }
               }, { once: true });
             }
             }, 1160);
           }, { once: true });
          void end;
        });
      });
    }

    if (document.body.getAttribute("data-page") === "label") {
      if (window.__grmLabelArrivalStarted) return;
      window.__grmLabelArrivalStarted = true;
      var labelArrival = sessionStorage.getItem("grm-arrival");
      if (labelArrival !== "label") return;
      sessionStorage.removeItem("grm-arrival");
      document.documentElement.classList.add("division-arrival-pending");
      document.body.classList.add("is-division-entering");
      var labelLogo = document.querySelector(".division-minimal-hero__logo");
      if (!labelLogo) return;
      var startRect = JSON.parse(sessionStorage.getItem("grm-label-start-rect") || "null");
      sessionStorage.removeItem("grm-label-start-rect");
      labelLogo.style.visibility = "hidden";
      var overlay = document.getElementById("labelTransitionLogo");
      if (!overlay) return;
      overlay.style.transition = "none";
      overlay.getBoundingClientRect();
      document.fonts.ready.then(function () {
        requestAnimationFrame(function () {
          var endRect = labelLogo.getBoundingClientRect();
          overlay.style.transition = "none";
          overlay.style.left = endRect.left + "px";
          overlay.style.top = endRect.top + "px";
          overlay.style.width = endRect.width + "px";
          overlay.style.height = endRect.height + "px";
          requestAnimationFrame(function () {
            labelLogo.style.visibility = "visible";
            overlay.remove();
            document.documentElement.classList.remove("division-arrival-pending");
            setTimeout(function () { document.body.classList.add("is-division-enter-header"); }, 140);
            setTimeout(function () { document.body.classList.add("is-division-enter-title"); }, 480);
            setTimeout(function () { document.body.classList.add("is-division-enter-descriptor"); }, 820);
            setTimeout(function () {
              document.body.classList.add("is-division-enter-scroll");
              document.body.classList.remove("is-division-entering");
            }, 1160);
          });
        });
      });
      return;
    }
    if (document.body.getAttribute("data-page") === "liveroom") {
      if (window.__grmLiveroomArrivalStarted) return;
      window.__grmLiveroomArrivalStarted = true;
      var liveroomArrival = sessionStorage.getItem("grm-arrival");
      if (liveroomArrival !== "liveroom") return;
      sessionStorage.removeItem("grm-arrival");
      document.documentElement.classList.add("division-arrival-pending");
      document.body.classList.add("is-division-entering");
      var liveroomLogo = document.querySelector(".division-minimal-hero__logo");
      if (!liveroomLogo) return;
      var startRect = JSON.parse(sessionStorage.getItem("grm-liveroom-start-rect") || "null");
      sessionStorage.removeItem("grm-liveroom-start-rect");
      liveroomLogo.style.visibility = "hidden";
      var overlay = document.getElementById("liveroomTransitionLogo");
      if (!overlay) return;
      document.fonts.ready.then(function () {
        requestAnimationFrame(function () {
          var endRect = liveroomLogo.getBoundingClientRect();
          overlay.style.transition = "none";
          overlay.style.left = endRect.left + "px";
          overlay.style.top = endRect.top + "px";
          overlay.style.width = endRect.width + "px";
          overlay.style.height = endRect.height + "px";
          requestAnimationFrame(function () {
            liveroomLogo.style.visibility = "visible";
            overlay.remove();
            document.documentElement.classList.remove("division-arrival-pending");
            setTimeout(function () { document.body.classList.add("is-division-enter-header"); }, 140);
            setTimeout(function () { document.body.classList.add("is-division-enter-title"); }, 480);
            setTimeout(function () { document.body.classList.add("is-division-enter-descriptor"); }, 820);
            setTimeout(function () {
              document.body.classList.add("is-division-enter-scroll");
              document.body.classList.remove("is-division-entering");
            }, 1160);
          });
        });
      });
      return;
    }
    if (document.body.getAttribute("data-page") !== "studio") return;
    var hero = document.querySelector(".studio-minimal-hero");
    var arrival = sessionStorage.getItem("grm-arrival");
    if (arrival) sessionStorage.removeItem("grm-arrival");
    if (arrival !== "studio" || reduced() || !hero) return;
    document.documentElement.classList.remove("studio-arrival-pending");

    document.body.classList.add("is-studio-arriving");
    document.body.classList.add("is-studio-entering");
    var logo = hero.querySelector(".studio-minimal-hero__logo");
    if (!logo) return;

    document.body.classList.add("is-shared-logo-pending");
    document.fonts.ready.then(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          document.body.classList.remove("is-shared-logo-pending");
          document.body.classList.remove("is-studio-arriving");
          setTimeout(function () { document.body.classList.add("is-studio-enter-header"); }, 140);
          setTimeout(function () { document.body.classList.add("is-studio-enter-title"); }, 480);
          setTimeout(function () { document.body.classList.add("is-studio-enter-descriptor"); }, 820);
          setTimeout(function () { document.body.classList.add("is-studio-enter-scroll"); }, 1160);
        });
      });
    });
  });

  /* ---------- LIVEROOM SCHEDULE: week navigation ----------
     One week state shared by every schedule instance. Only the heading
     word and date range transition; timetable geometry is untouched.
     The authored "THIS WEEK" (Mon 21 SEP 2026) is the zero anchor. */
  onReady(function () {
    if (document.body.getAttribute("data-page") !== "liveroom") return;
    var sections = Array.prototype.slice.call(document.querySelectorAll(".liveroom-availability"));
    if (!sections.length) return;

    var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    var NUMBER_WORDS = ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN"];
    var CURRENT = new Date(2026, 8, 21); /* Mon 21 SEP 2026 */
    var offset = 0;
    var busy = false;
    var duration = 320;

    function pad(n) { return n < 10 ? "0" + n : String(n); }

    function weekStart() {
      return new Date(CURRENT.getFullYear(), CURRENT.getMonth(), CURRENT.getDate() + offset * 7);
    }

    function monthNames() {
      var value = (window.GRMi18n && window.GRMi18n.t) ? window.GRMi18n.t("schedule.months") : null;
      return Array.isArray(value) ? value : MONTHS;
    }

    function headingLabel() {
      var span = Math.abs(offset);
      if (offset === 0) return tr("schedule.thisWeek", "THIS WEEK");
      if (offset === 1) return tr("schedule.nextWeek", "NEXT WEEK");
      if (offset === -1) return tr("schedule.lastWeek", "LAST WEEK");
      if (offset > 1) return tr("schedule.inWeeks", "IN {n} WEEKS").replace("{n}", String(NUMBER_WORDS[span] || span));
      return tr("schedule.weeksAgo", "{n} WEEKS AGO").replace("{n}", String(NUMBER_WORDS[span] || span));
    }

    function rangeLabel() {
      var start = weekStart();
      var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      var months = monthNames();
      if (start.getMonth() === end.getMonth()) {
        return pad(start.getDate()) + "–" + pad(end.getDate()) + " " + months[start.getMonth()];
      }
      return pad(start.getDate()) + " " + months[start.getMonth()] + "–" + pad(end.getDate()) + " " + months[end.getMonth()];
    }

    function swapText() {
      sections.forEach(function (section) {
        var label = section.querySelector("[data-week-label]");
        var range = section.querySelector("[data-week-range]");
        if (label) label.textContent = headingLabel();
        if (range) range.textContent = rangeLabel();
        section.classList.toggle("is-off-current", offset !== 0);
      });
    }

    function change(dir) {
      if (busy) return;
      if (reduced()) {
        offset += dir;
        swapText();
        return;
      }
      busy = true;
      var leave = dir > 0 ? "is-leaving-fwd" : "is-leaving-back";
      var enter = dir > 0 ? "is-entering-fwd" : "is-entering-back";
      sections.forEach(function (section) {
        var unit = section.querySelector(".liveroom-availability__title-unit");
        if (unit) unit.classList.add(leave);
      });
      setTimeout(function () {
        offset += dir;
        swapText();
        sections.forEach(function (section) {
          var unit = section.querySelector(".liveroom-availability__title-unit");
          if (!unit) return;
          unit.classList.remove(leave);
          unit.classList.add(enter);
        });
        sections[0].offsetWidth; /* commit the incoming start state */
        RAF(function () {
          sections.forEach(function (section) {
            var unit = section.querySelector(".liveroom-availability__title-unit");
            if (unit) unit.classList.remove(enter);
          });
          busy = false;
        });
      }, duration);
    }

    sections.forEach(function (section) {
      var prev = section.querySelector(".liveroom-availability__title-arrow--prev");
      var next = section.querySelector(".liveroom-availability__title-arrow--next");
      if (prev) prev.addEventListener("click", function () { change(-1); });
      if (next) next.addEventListener("click", function () { change(1); });
    });

    /* Re-render the visible week label/range when the language changes. */
    document.addEventListener("grm:languagechange", swapText);
  });

  /* ---------- LIVEROOM "The room": ghost materialise ----------
     Words haze in one-by-one (80 ms stagger) inside a block that
     settles from a soft defocus. Re-ghosts on every arrival. Mirrors
     the Manifesto reveal on ghost-pitcher.com. */
  onReady(function () {
    var room = document.getElementById("liveroom-room");
    var sched = document.querySelector(".liveroom-availability");

    var triggers = Array.prototype.slice.call(room ? room.querySelectorAll(".lr-room") : []);
    if (sched) {
      triggers = triggers.concat(Array.prototype.slice.call(sched.querySelectorAll(".lr-room")));
    }
    if (!triggers.length) return;

    function splitWords(el) {
      if (el.dataset.split) return;
      el.dataset.split = "1";
      var walk = function (node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
          if (ch.nodeType === 3) {
            var frag = document.createDocumentFragment();
            ch.textContent.split(/(\s+)/).forEach(function (tok) {
              if (/^\s*$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
              var s = document.createElement("span");
              s.className = "lr-word";
              s.textContent = tok;
              frag.appendChild(s);
            });
            node.replaceChild(frag, ch);
          } else if (ch.nodeType === 1 && ch.tagName !== "BR") {
            walk(ch);
          }
        });
      };
      walk(el);
      var words = el.querySelectorAll(".lr-word");
      var i = 0;
      words.forEach(function (s) { s.style.transitionDelay = (i++ * 80) + "ms"; });
    }

    if (reduced() || !("IntersectionObserver" in window)) {
      triggers.forEach(function (el) { el.classList.add("in"); });
      return;
    }

    triggers.forEach(function (el) {
      if (el.classList.contains("lr-split")) splitWords(el);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target.classList.contains("lr-re")) {
          entry.target.classList.toggle("in", entry.isIntersecting);
        } else if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    triggers.forEach(function (el) { io.observe(el); });
  });
})();

/* ---------- LIVEROOM "The room": bento gallery hover reflow ----------
   Hovering a tile expands it; neighbours physically yield space via
   animated grid-track redistribution (mouse-only). Moves are gated by
   a 14px hysteresis so reflowing boundaries can never flicker.
   Self-contained; touches nothing outside #liveroom-room. */
(function () {
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }
  onReady(function () {
    var room = document.getElementById("liveroom-room");
    if (!room) return;
    var media = room.querySelector(".liveroom-room__media");
    if (!media || !("elementFromPoint" in document)) return;
    var tiles = Array.prototype.slice.call(media.querySelectorAll(".liveroom-room__img"));
    if (!tiles.length) return;

    var applied = 0;
    var inside = false;
    var lx = 0, ly = 0, moved = 0;

    function indexOf(el) {
      for (var i = 0; i < tiles.length; i++) if (tiles[i] === el) return i + 1;
      return 0;
    }
    function hit(x, y) {
      var el = document.elementFromPoint(x, y);
      if (!el) return 0;
      var t = el.closest ? el.closest(".liveroom-room__img") : null;
      return t ? indexOf(t) : 0;
    }
    function setState(i) {
      if (i === applied) return;
      applied = i;
      media.classList.remove("is-hover-1", "is-hover-2", "is-hover-3", "is-hover-4");
      if (i) media.classList.add("is-hover-" + i);
    }
    media.addEventListener("pointerenter", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      inside = true;
      moved = 0;
      lx = e.clientX; ly = e.clientY;
      setState(hit(lx, ly));
    });
    media.addEventListener("pointermove", function (e) {
      if (!inside || (e.pointerType && e.pointerType !== "mouse")) return;
      moved += Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly);
      lx = e.clientX; ly = e.clientY;
      if (moved < 14) return;
      moved = 0;
      var t = hit(e.clientX, e.clientY);
      if (t) setState(t);
    });
    media.addEventListener("pointerleave", function (e) {
      if (e.relatedTarget && media.contains(e.relatedTarget)) return;
      inside = false;
      moved = 0;
      setState(0);
    });
  });
})();

/* ---------- GRM PRODUCTION · VISUAL: aperture reveal drive ----------
   Scroll-triggered, time-based aperture. Scrolling only triggers the
   reveal: when the showreel's top crosses ~68% of the viewport height
   (IntersectionObserver, rootMargin bottom -32%), the two black masks
   part vertically in a single ~1400ms ease-in-out-cubic animation.
   The reveal runs once per load (closed -> playing -> open), is driven
   purely by elapsed time, and cannot be reversed, replayed, slowed, or
   interrupted by scrolling. The showreel object NEVER moves or scales:
   it sits in normal document flow at its final size; the masks are the
   only animated geometry (GPU-safe transforms).

   Reduced motion / no JS: the CSS suppresses the masks and the figure
   renders fully revealed in flow, so this module stops here.

   The media plate inside is temporary; the driver only moves the masks,
   so swapping in the real showreel video does not touch this code. */
(function () {
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    if (document.body.getAttribute("data-page") !== "studio") return;

    var aperture = document.querySelector("[data-showreel-aperture]");
    if (!aperture) return;

    var stage = aperture.querySelector(".showreel-aperture__stage");
    var maskTop = aperture.querySelector("[data-showreel-mask-top]");
    var maskBottom = aperture.querySelector("[data-showreel-mask-bottom]");
    if (!stage || !maskTop || !maskBottom) return;

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    var HALF_HAIRLINE = 1.5;  /* ~3px seam in the closed aperture */
    var DURATION = 1400;      /* ms for the full aperture opening */
    var TRIGGER_STOP = 0.32;  /* viewport fraction: trigger at ~68vh */
    var state = "closed";     /* closed -> playing -> open */
    var half = 1;             /* half the stage (figure) height, px */

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function setMasks(topTr, bottomTr) {
      maskTop.style.transform = "translate3d(0," + topTr + "px,0)";
      maskBottom.style.transform = "translate3d(0," + bottomTr + "px,0)";
    }

    function measure() {
      /* The showreel frame is sized entirely in CSS (full-bleed width,
         100svh height) so it always takes the shape of the viewport; the
         aperture only needs the stage height in order to translate each
         mask by half of the frame. No frame width is measured or set. */
      half = Math.max(1, stage.clientHeight / 2);
    }

    function open() {
      if (state !== "closed") return;
      state = "playing";
      var target = half;   /* captured: a resize cannot jump the reveal */
      var t0 = performance.now();

      (function frame(now) {
        var t = Math.min(1, (now - t0) / DURATION);
        var o = easeInOutCubic(t);
        setMasks(
          -(HALF_HAIRLINE + (target - HALF_HAIRLINE) * o),
          HALF_HAIRLINE + (target - HALF_HAIRLINE) * o
        );
        if (t < 1) requestAnimationFrame(frame);
        else state = "open";
      })(performance.now());
    }

    function onLayout() {
      measure();
      /* Keep resting geometry honest after a resize without resetting
         reveal state; a running reveal keeps its captured half. */
      if (state === "open") setMasks(-half, half);
      else if (state === "closed") setMasks(-HALF_HAIRLINE, HALF_HAIRLINE);
    }

    /* Trigger once: the showreel top crossing ~68% of the viewport. */
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && state === "closed") {
            observer.disconnect();
            open();
          }
        });
      }, { rootMargin: "0px 0px -" + (TRIGGER_STOP * 100) + "% 0px", threshold: 0 });
      observer.observe(aperture);
    } else {
      /* Fallback: open once the trigger line is actually crossed. */
      function onFirstScroll() {
        if (state !== "closed") return;
        var top = aperture.getBoundingClientRect().top;
        if (top <= (window.innerHeight || 0) * (1 - TRIGGER_STOP)) open();
      }
      window.addEventListener("scroll", onFirstScroll, { passive: true });
      onFirstScroll();
    }

    window.addEventListener("resize", onLayout, { passive: true });
    /* Orientation change / any layout change that alters the frame height
       re-measures `half` without polling. The resize listener stays as a
       fallback for browsers without ResizeObserver. */
    if ("ResizeObserver" in window) {
      new ResizeObserver(onLayout).observe(stage);
    }
    measure();
    setMasks(-HALF_HAIRLINE, HALF_HAIRLINE);
  });
})();

/* ============================================================
   GRM Sound — single interactive release wall.
   One logical collection (the V4 plaque for IGLA — Prvi
   Aristokrat), duplicated only as invisible clones to form a
   seamless looping track. One authoritative rAF controller
   drives a continuous slow drift; pointer press+drag moves the
   wall 1:1, release hands the pointer's momentum back so the
   carousel glides and converges smoothly onto the ambient
   autoplay velocity (never stopping). Reduced-motion turns the
   autoplay off but keeps manual drag/swipe intact.
   ============================================================ */
(function () {
  "use strict";
  var row = document.querySelector(".grm-sound__row[data-grm-sound-row]");
  if (!row) return;

  var section = row.closest(".grm-sound");
  var track = row.querySelector(".grm-sound__track[data-grm-sound-track]");
  var base = track ? track.firstElementChild : null;
  if (!section || !track || !base) return;

  section.classList.add("grm-sound--js");

  var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  var setWidth = 0;
  var scale = 0;
  var vel = 0;
  var autoplayDir = 1;
  var velMax = 0;
  var sampleVel = 0;
  var lastSampleX = null;
  var lastSampleT = 0;
  var VEL_TAU = 600;
  var pos = 0;
  var clones = [];

  function measure() {
    setWidth = base.offsetWidth;
  }

  function wrap(delta) {
    delta = delta % setWidth;
    if (delta < 0) delta += setWidth;
    return delta;
  }

  function paint() {
    track.style.transform = "translate3d(" + (-pos) + "px,0,0)";
  }

  function fill() {
    clones.forEach(function (node) { node.parentNode.removeChild(node); });
    clones = [];

    measure();
    var viewport = row.clientWidth || window.innerWidth;
    var extra = Math.ceil(viewport / Math.max(setWidth, 1)) + 1;
    scale = setWidth / 120;
    velMax = Math.max(480, setWidth * 0.3);
    vel = scale * autoplayDir;

    var frag = document.createDocumentFragment();
    for (var i = 0; i < extra; i++) {
      var copy = base.cloneNode(true);
      copy.setAttribute("aria-hidden", "true");
      var links = copy.querySelectorAll("a");
      for (var k = 0; k < links.length; k++) {
        links[k].setAttribute("tabindex", "-1");
      }
      clones.push(copy);
      frag.appendChild(copy);
    }
    track.appendChild(frag);

    pos = wrap(pos);
    paint();
  }

  var last = null;
  var enabled = !reduceQuery.matches;
  var dragging = false;
  var engaged = false;
  var startX = 0;
  var startY = 0;
  var startPos = 0;
  var suppressClick = false;
  var suppressTimer = null;
  var engagedId = -1;

  function clampVel(v) {
    if (v > velMax) return velMax;
    if (v < -velMax) return -velMax;
    return v;
  }

  function loop(now) {
    if (last === null) last = now;
    var dt = now - last;
    last = now;
    if (dt > 64) dt = 64;

    if (enabled && !dragging && !engaged && setWidth > 0) {
      var target = scale * autoplayDir;
      if (vel !== target) {
        vel = target + (vel - target) * Math.exp(-dt / VEL_TAU);
        if (Math.abs(vel - target) < 0.01) vel = target;
      }
      pos = wrap(pos + (vel * dt) / 1000);
      paint();
    }
    window.requestAnimationFrame(loop);
  }

  function onDown(e) {
    clearTimeout(suppressTimer);
    suppressClick = false;
    startX = e.clientX;
    startY = e.clientY;
    startPos = pos;
    engaged = true;
    engagedId = e.pointerId;
    dragging = false;
    sampleVel = 0;
    lastSampleX = null;
    lastSampleT = 0;
  }

  function onMove(e) {
    if (!engaged) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if (!dragging) {
      if (Math.abs(dx) < 6 || Math.abs(dy) > Math.abs(dx)) return;
      dragging = true;
      suppressClick = true;
      row.classList.add("grm-sound__row--dragging");
      try { row.setPointerCapture(e.pointerId); } catch (err) {}
      lastSampleX = null;
      lastSampleT = 0;
      sampleVel = 0;
    }
    if (e.cancelable) e.preventDefault();
    pos = wrap(startPos - dx);
    paint();

    var t = e.timeStamp;
    if (lastSampleX !== null) {
      var dtms = t - lastSampleT;
      if (dtms > 1 && dtms < 200) {
        var inst = (-(e.clientX - lastSampleX) * 1000) / dtms;
        var alpha = Math.min(1, dtms / 90);
        sampleVel = sampleVel * (1 - alpha) + inst * alpha;
      }
    }
    lastSampleX = e.clientX;
    lastSampleT = t;
  }

  function onUp(e) {
    if (!engaged || e.pointerId !== engagedId) return;
    engaged = false;
    engagedId = -1;
    if (dragging) {
      dragging = false;
      row.classList.remove("grm-sound__row--dragging");
      suppressClick = true;
      suppressTimer = setTimeout(function () { suppressClick = false; }, 400);
      vel = clampVel(sampleVel);
      autoplayDir = e.clientX > startX ? -1 : 1;
    }
    try { if (row.hasPointerCapture(e.pointerId)) row.releasePointerCapture(e.pointerId); } catch (err) {}
  }

  function onCancel(e) {
    if (!engaged || e.pointerId !== engagedId) return;
    engaged = false;
    engagedId = -1;
    dragging = false;
    suppressClick = true;
    row.classList.remove("grm-sound__row--dragging");
    if (suppressTimer) clearTimeout(suppressTimer);
    suppressTimer = setTimeout(function () { suppressClick = false; }, 400);
  }

  row.addEventListener("pointerdown", onDown);
  row.addEventListener("pointermove", onMove);
  row.addEventListener("pointerup", onUp);
  row.addEventListener("pointercancel", onCancel);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  row.addEventListener("dragstart", function (e) {
    if (engaged || dragging) e.preventDefault();
  });
  row.addEventListener("click", function (e) {
    if (suppressClick && e.detail > 0) {
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
    }
  }, true);

  function syncReduce() {
    enabled = !reduceQuery.matches;
  }
  if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", syncReduce);
  else if (reduceQuery.addListener) reduceQuery.addListener(syncReduce);

  var resizeTimer = null;
  function onResize() {
    if (resizeTimer) return;
    resizeTimer = setTimeout(function () {
      resizeTimer = null;
      fill();
    }, 150);
  }
  window.addEventListener("resize", onResize, { passive: true });

  function start() {
    fill();
    window.requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
