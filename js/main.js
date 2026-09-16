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

  /* ---------- HERO PANELS: division index ----------
     One mechanism (the .is-expanded class) drives pointer, touch
     and keyboard states. Clicking or Enter/Space toggles a panel;
     Arrow keys move focus between panels; leaving the section
     (mouse or focus) settles back to the equal "three doors"
     layout. */
  onReady(function () {
    var root = document.getElementById("heroPanels");
    if (!root) return;

    var panels = Array.prototype.slice.call(root.querySelectorAll(".panel"));
    var delayTimer = null;

    function setExpanded(panel, expanded, opts) {
      opts = opts || {};
      var was = panel.classList.contains("is-expanded");
      if (was === expanded) return;

      panel.classList.toggle("is-expanded", expanded);
      panel.setAttribute("aria-expanded", String(expanded));

      // keep only one panel open at a time (accordion semantics)
      if (expanded) {
        panels.forEach(function (p) {
          if (p !== panel && p.classList.contains("is-expanded")) {
            p.classList.remove("is-expanded");
            p.setAttribute("aria-expanded", "false");
          }
        });
      }

      var time = reduced() ? 0 : 12;
      clearTimeout(delayTimer);
      if (expanded && opts.focusFirst) {
        delayTimer = setTimeout(function () {
          var link = panel.querySelector(".panel__cta");
          if (link) link.focus({ preventScroll: true });
        }, time);
      }
    }

    function expand(panel) { setExpanded(panel, true); }
    function collapse(panel) { setExpanded(panel, false); }

    function settle() {
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

    // click toggles (collapse an active panel back to the equal state)
    root.addEventListener("click", function (e) {
      var panel = e.target.closest(".panel");
      if (!panel) return;
      if (e.target.closest("a")) return;
      setExpanded(panel, !panel.classList.contains("is-expanded"));
    });

    // keyboard
    root.addEventListener("keydown", function (e) {
      var panel = e.target.closest(".panel");
      if (!panel) return;

      if (e.key === "Enter" || e.key === " ") {
        // let the CTA link do its thing when it has focus
        if (e.target.closest("a")) return;
        e.preventDefault();
        setExpanded(panel, !panel.classList.contains("is-expanded"));
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
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
})();