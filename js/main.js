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
      { key: "studio", label: "Studio", href: root + "studio/" },
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
                '<a href="' + root + 'studio/">Studio</a>' +
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
        if (destination === "studio/") {
          sessionStorage.setItem("grm-arrival", "studio");
          if (sourceRect) {
            sessionStorage.setItem("grm-studio-home-logo-width", String(sourceRect.width));
          }
          if (sourceLogo) {
            panel.classList.add("is-studio-logo-committed");
            sourceLogo.classList.add("is-studio-logo-committed");
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
        var destination = logo.getBoundingClientRect();
        document.documentElement.style.setProperty("--studio-logo-final-width", destination.width + "px");
        document.documentElement.style.setProperty("--studio-logo-final-height", destination.height + "px");
        document.documentElement.style.setProperty("--studio-logo-final-left", destination.left + "px");
        document.documentElement.style.setProperty("--studio-logo-final-top", destination.top + "px");
        requestAnimationFrame(function () {
          logo.classList.add("is-studio-logo-landed");
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
})();
