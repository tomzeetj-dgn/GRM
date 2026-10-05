/* ============================================================
   GRM — interactions
   Vanilla JS, no dependencies.

   - header surface state on scroll
   - scroll progress hairline
   - active-section navigation state
   - mobile menu (toggle / escape / focus)
   - scroll reveals
   - work rail: drag-to-scroll + arrow keys
   - studio gallery: perspective horizontal scrub
   - hero: three-panel division index (hover / keyboard / touch)
   All motion respects prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  var HOME_INTRO_DEBUG_REPLAY = true;

  document.documentElement.classList.add("js");

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var isMobileMenuOpen = false;
  var lastFocused = null;

  var RAF = window.requestAnimationFrame ||
            function (cb) { return setTimeout(cb, 16); };

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
      { key: "home", label: "Home", href: root + "index.html" },
      { key: "studio", label: "Production", href: root + "studio/" },
      { key: "label", label: "Label", href: root + "label/" },
      { key: "liveroom", label: "Liveroom", href: root + "liveroom/" }
    ];

    function navLinks(cls) {
      return navItems.map(function (item) {
        var current = item.key === page ? ' aria-current="true"' : "";
        return '<a href="' + item.href + '" class="' + cls + '"' + current + '>' + item.label + "</a>";
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
            '<a href="' + root + 'index.html" class="site-header__brand" aria-label="GRM — back to top">' +
              '<img src="' + root + 'assets/img/grm-mark.png" alt="" width="38" height="38" class="site-header__mark">' +
              '<img src="' + root + 'assets/img/GRM 4K 1x1_Transparent.png" alt="" aria-hidden="true" class="site-header__mark-glow">' +
              '<span class="site-header__word">GRM HOUSE</span>' +
            "</a>" +
            (isHome ? "" :
              '<nav class="site-nav" aria-label="Primary">' + navLinks("site-nav__link") + "</nav>" +
              '<button class="site-nav-toggle" id="navToggle" aria-expanded="false" aria-controls="mobileMenu" aria-label="Open menu">' +
                '<span class="site-nav-toggle__line"></span>' +
                '<span class="site-nav-toggle__line"></span>' +
              "</button>") +
          "</div>" +
        "</header>" +
        (isHome ? "" :
          '<div class="mobile-menu" id="mobileMenu" aria-hidden="true">' +
            '<nav class="mobile-menu__nav" aria-label="Mobile">' + navLinks("mobile-menu__link") + "</nav>" +
            '<div class="mobile-menu__foot">' +
              "<span>Belgrade, Serbia</span>" +
              '<div class="mobile-menu__social">' +
                '<a href="#contact" rel="noopener">Instagram</a>' +
                '<a href="#contact" rel="noopener">YouTube</a>' +
              "</div>" +
              '<a href="mailto:info@grmstudio.music" class="is-mail">info@grmstudio.music</a>' +
            "</div>" +
          "</div>");
    }

    if (footerMount) {
      footerMount.innerHTML =
        '<footer class="site-footer" id="siteFooter">' +
          '<img class="site-footer__watermark" src="' + root + 'assets/img/GRM 4K 1x1_Transparent.png"' +
               ' alt="" loading="lazy" width="2160" height="2160">' +
          '<div class="container">' +
            '<div class="site-footer__top">' +
              '<a href="' + root + 'index.html" class="site-footer__brand" aria-label="GRM — back to top">' +
                '<img src="' + root + 'assets/img/grm-mark.png" alt="" width="46" height="46">' +
                "<span>GRM</span>" +
              "</a>" +
              '<p class="site-footer__lede">' +
                "An umbrella house in Belgrade — recording &amp; production, a record label, and a live rehearsal room under one GRM." +
              "</p>" +
              '<div class="site-footer__nav">' +
                '<span class="site-footer__col-label">GRM</span>' +
                '<a href="' + root + 'index.html">Home</a>' +
                '<a href="' + root + 'studio/">Production</a>' +
                '<a href="' + root + 'label/">Label</a>' +
                '<a href="' + root + 'liveroom/">Liveroom</a>' +
              "</div>" +
              '<div class="site-footer__contact">' +
                '<span class="site-footer__col-label">Contact</span>' +
                "<p>Belgrade, Serbia</p>" +
                '<a href="mailto:info@grmstudio.music">info@grmstudio.music</a>' +
              "</div>" +
              '<div class="site-footer__social">' +
                '<span class="site-footer__col-label">Follow</span>' +
                '<a href="#contact" rel="noopener">Instagram</a>' +
                '<a href="#contact" rel="noopener">YouTube</a>' +
              "</div>" +
            "</div>" +
            '<div class="site-footer__bottom">' +
              '<p>© <span id="year">2026</span> GRM — All rights reserved</p>' +
              '<a href="#top" class="site-footer__top-link">Back to top</a>' +
            "</div>" +
          "</div>" +
        "</footer>";
    }
  }

  injectSiteChrome();

  /* One-time Home entrance presentation using the real hero layers. */
  (function () {
    if (document.body.getAttribute("data-page") !== "home") return;
    var introLog = function (label) { console.log("[GRM INTRO] " + label, performance.now().toFixed(1), document.body.className); };
    var logState = function (label) {
      ["#panelProduction .panel__logo-window", "#panelHouse .panel__logo-window", "#panelLive .panel__logo-window", ".site-header"].forEach(function (selector) {
        var element = document.querySelector(selector);
        var style = element && getComputedStyle(element);
        console.log("[GRM INTRO] state", label, selector, style && { opacity: style.opacity, visibility: style.visibility, display: style.display });
      });
    };
    introLog("init");
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
    introLog("running class added");
    logState("after running class");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        introLog("first paint armed");
        logState("second frame");
        setTimeout(function () {
          document.body.classList.add("home-intro-lines");
          introLog("dividers start");
        }, 450);
        setTimeout(function () { document.body.classList.add("home-intro-label"); pulseGlow(pulseTargets[0]); introLog("label flash"); }, 1450);
        setTimeout(function () { document.body.classList.add("home-intro-studio"); pulseGlow(pulseTargets[1]); introLog("studio flash"); }, 1850);
        setTimeout(function () { document.body.classList.add("home-intro-liveroom"); pulseGlow(pulseTargets[2]); introLog("liveroom flash"); }, 2250);
        setTimeout(function () {
          document.body.classList.add("home-intro-header-visible");
          introLog("header reveal");
        }, 3200);
        setTimeout(function () {
          document.body.classList.remove("home-intro-running", "home-intro-lines", "home-intro-label", "home-intro-studio", "home-intro-liveroom", "home-intro-header-visible");
          document.documentElement.classList.remove("home-intro-pending");
          introLog("complete");
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

  /* Label/Liveroom division-to-division routes only. Studio -> Label above
     remains isolated as the approved reference transition. */
  (function () {
    var page = document.body.getAttribute("data-page");
    if (reduced() || (page !== "label" && page !== "liveroom")) return;

    var busy = false;
    var logo = document.querySelector(".division-minimal-hero__logo");

    document.addEventListener("click", function (event) {
      var link = event.target.closest('.site-nav a[href$="label/"]');
      if (page !== "label") return;
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || busy) return;

      var destination = link.getAttribute("href").replace(/^.*\/|\/$/g, "");
      if (destination === page) return;

      event.preventDefault();
      busy = true;
      var rect = logo && logo.getBoundingClientRect();
      if (rect) {
        sessionStorage.setItem("grm-morph-arrival", destination);
        sessionStorage.setItem("grm-morph-start", JSON.stringify({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        }));
      }
      document.body.classList.add("is-division-page-morph-exit");
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
      toggle.setAttribute("aria-label", force ? "Close menu" : "Open menu");
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

  /* ---------- ACTIVE NAVIGATION STATE ---------- */
  onReady(function () {
    var links = document.querySelectorAll('.site-nav a[href^="#"]');
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = {};
    links.forEach(function (l) { map[l.getAttribute("href").slice(1)] = l; });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }, {
      rootMargin: "-35% 0px -55% 0px",
      threshold: 0
    });

    ["services", "work", "studio", "equipment", "contact"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
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
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(function (el) { io.observe(el); });
  });

  /* ---------- WORK RAIL: drag + keys ---------- */
  onReady(function () {
    var rail = document.getElementById("workRail");
    if (!rail) return;

    var down = false, startX = 0, startScroll = 0, moved = false;

    rail.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      down = true;
      moved = false;
      startX = e.clientX;
      startScroll = rail.scrollLeft;
      rail.setPointerCapture(e.pointerId);
    });
    rail.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      rail.scrollLeft = startScroll - dx;
    });
    rail.addEventListener("pointerup", function () { down = false; });
    rail.addEventListener("pointercancel", function () { down = false; });

    // don't follow a link right after a drag gesture
    rail.addEventListener("click", function (e) {
      if (moved && e.target.closest("a")) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    rail.addEventListener("keydown", function (e) {
      var inc = 320;
      if (e.key === "ArrowRight") { rail.scrollLeft += inc; e.preventDefault(); }
      else if (e.key === "ArrowLeft") { rail.scrollLeft -= inc; e.preventDefault(); }
    });
  });

  /* ---------- STUDIO GALLERY: perspective scrub ---------- */
  onReady(function () {
    var stage = document.getElementById("galleryStage");
    if (!stage) return;

    var sticky = stage.querySelector(".gallery-sticky");
    var gallery = sticky.querySelector(".gallery");
    var cols = gallery.querySelectorAll(".gallery__col");
    var speeds = {};
    cols.forEach(function (c) { speeds[c.dataset.speed] = parseFloat(c.dataset.speed) || 1; });

    function maxShift() {
      return Math.max(0, gallery.getBoundingClientRect().width - window.innerWidth);
    }

    function enabled() {
      if (reduced()) return false;
      return window.innerWidth > 1000;
    }

    var inited = false;

    function init() {
      if (inited) return;
      inited = true;

      function tick() {
        var rect = stage.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var travel = Math.max(0, rect.height - vh);
        var p = travel ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;

        var shift = p * maxShift();

        // strip slides left; faster columns move further = depth
        gallery.style.transform = "translate3d(" + (-shift) + "px, 0, 0)";
        cols.forEach(function (col) {
          var s = speeds[col.dataset.speed] || 1;
          col.style.transform = "translate3d(" + (-(shift * (s - 1))) + "px, 0, 0)";
        });
      }

      var ticking = false;
      function onScroll() {
        if (ticking) return;
        ticking = true;
        RAF(function () {
          tick();
          ticking = false;
        });
      }

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      tick();
    }

    init();
    window.addEventListener("resize", function () { if (enabled()) init(); });
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
        var sourceLogo = panel.querySelector(".panel__logo--glow");
        var sourceRect = sourceLogo && sourceLogo.getBoundingClientRect();
        // aim the committed logo at the destination page's own rendered logo
        // rect (published by that division page, measured there with
        // getBoundingClientRect). width/height/top/left are all already
        // transitioned by the committed class, so only the aim point moves —
        // duration, easing and the centering transform are untouched.
        var aimRect = null;
        try {
          aimRect = JSON.parse(sessionStorage.getItem(
            "grm-dest-logo:" + destination.replace(/\/$/, "") + ":" + innerWidth + "x" + innerHeight
          ) || "null");
        } catch (e) {}
        var logoWindow = panel.querySelector(".panel__logo-window");
        function retarget() {
          if (!aimRect || !sourceLogo || !logoWindow) return;
          var box = logoWindow.getBoundingClientRect();
          sourceLogo.getBoundingClientRect(); // flush, so the transition is armed
          sourceLogo.style.width = aimRect.width + "px";
          sourceLogo.style.height = aimRect.height + "px";
          sourceLogo.style.left = (aimRect.left - box.left + aimRect.width / 2) + "px";
          sourceLogo.style.top = (aimRect.top - box.top + aimRect.height / 2) + "px";
        }
        if (destination === "studio/") {
          sessionStorage.setItem("grm-arrival", "studio");
          if (sourceRect) {
            sessionStorage.setItem("grm-studio-home-logo-width", String(sourceRect.width));
          }
          if (sourceLogo) {
            panel.classList.add("is-studio-logo-committed");
            sourceLogo.classList.add("is-studio-logo-committed");
            retarget();
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
            retarget();
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
            retarget();
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
      sessionStorage.setItem("grm-dest-logo:" + page + ":" + innerWidth + "x" + innerHeight,
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
  onReady(function () {
    if (document.body.getAttribute("data-page") === "label" && sessionStorage.getItem("grm-morph-arrival") === "label") {
      if (window.__grmStudioLabelMorph) return;
      window.__grmStudioLabelMorph = true;
      sessionStorage.removeItem("grm-morph-arrival");
      var source = JSON.parse(sessionStorage.getItem("grm-morph-start") || "null");
      sessionStorage.removeItem("grm-morph-start");
      var target = document.querySelector(".division-minimal-hero__logo");
      if (!source || !target) return;
      target.style.visibility = "hidden";
      var morph = document.createElement("img");
      morph.className = "division-morph-logo";
      morph.src = "../assets/img/GRM Label Glow.png";
      morph.alt = "";
      morph.setAttribute("aria-hidden", "true");
      morph.style.left = source.left + "px";
      morph.style.top = source.top + "px";
      morph.style.width = source.width + "px";
      morph.style.height = source.height + "px";
      document.body.appendChild(morph);
      document.fonts.ready.then(function () {
        requestAnimationFrame(function () {
          var end = target.getBoundingClientRect();
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
      target.style.visibility = "hidden";
      var morph = document.createElement("img");
      morph.className = "division-morph-logo";
      morph.src = "../assets/img/GRM LiveRoom Glow.png";
      morph.alt = "";
      morph.setAttribute("aria-hidden", "true");
      morph.style.left = source.left + "px";
      morph.style.top = source.top + "px";
      morph.style.width = source.width + "px";
      morph.style.height = source.height + "px";
      document.body.appendChild(morph);
      document.fonts.ready.then(function () {
        requestAnimationFrame(function () {
          var end = target.getBoundingClientRect();
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
      target.style.visibility = "hidden";
      var morph = document.createElement("img");
      morph.className = "studio-morph-logo";
      morph.src = "../assets/img/GRM Studio Glow.png";
      morph.alt = "";
      morph.setAttribute("aria-hidden", "true");
      morph.style.left = source.left + "px";
      morph.style.top = source.top + "px";
      morph.style.width = source.width + "px";
      morph.style.height = source.height + "px";
      document.body.appendChild(morph);
      document.fonts.ready.then(function () {
        requestAnimationFrame(function () {
          var end = target.getBoundingClientRect();
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

    function headingLabel() {
      var span = Math.abs(offset);
      if (offset === 0) return "THIS WEEK";
      if (offset === 1) return "NEXT WEEK";
      if (offset === -1) return "LAST WEEK";
      if (offset > 1) return "IN " + (NUMBER_WORDS[span] || span) + " WEEKS";
      return (NUMBER_WORDS[span] || span) + " WEEKS AGO";
    }

    function rangeLabel() {
      var start = weekStart();
      var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      if (start.getMonth() === end.getMonth()) {
        return pad(start.getDate()) + "–" + pad(end.getDate()) + " " + MONTHS[start.getMonth()];
      }
      return pad(start.getDate()) + " " + MONTHS[start.getMonth()] + "–" + pad(end.getDate()) + " " + MONTHS[end.getMonth()];
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

    /* The pending VIEW OUR WORK link is inert until the real YouTube URL
       is supplied: keep it from jumping the page to the top. */
    document.addEventListener("click", function (e) {
      var link = e.target && e.target.closest ? e.target.closest("[data-pending-youtube]") : null;
      if (link) { e.preventDefault(); e.stopPropagation(); }
    });

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
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var vw = window.innerWidth || document.documentElement.clientWidth;

      /* 92vw target on desktop, height-capped so the showreel (16:9)
         plus its metadata bar keeps the approved viewport fit. */
      var frameW = Math.min(vw * 0.92, vh * 0.88 * (16 / 9));
      stage.style.setProperty("--showreel-frame-w", frameW + "px");

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
