/* GRM LABEL — DESIGN PLAYGROUND (dev only)
   Scoped to body.lbx on /label-experiments/. Never runs on the
   production site (production pages don't carry body.lbx and the
   script is only included from this route). */
(function () {
  "use strict";

  if (!document.body.classList.contains("lbx")) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var doc = document.documentElement;

  /* ---------- reveal engine (concepts 01 + 02) ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- concept 02 — exhibition ---------- */
  var exRooms = Array.prototype.slice.call(document.querySelectorAll("[data-exhibit]"));
  var railTicks = Array.prototype.slice.call(document.querySelectorAll(".ex-rail__tick"));

  function setRail(current) {
    if (typeof current !== "number") current = -1;
    railTicks.forEach(function (tick, i) {
      tick.classList.toggle("is-active", i === current);
    });
  }

  // prev / next wander the room list
  exRooms.forEach(function (room, i) {
    var prev = room.querySelector(".ex-nav__prev");
    var next = room.querySelector(".ex-nav__next");
    function go(dir) {
      var target = exRooms[(i + dir + exRooms.length) % exRooms.length];
      target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    }
    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });
  });

  // rail follows the room nearest the viewport centre
  if (exRooms.length) {
    var ticking = false;
    function refreshRail() {
      ticking = false;
      var mid = window.innerHeight / 2;
      var best = -1, bestDist = Infinity;
      exRooms.forEach(function (room, i) {
        var r = room.getBoundingClientRect();
        var roomMid = r.top + r.height / 2;
        var dist = Math.abs(roomMid - mid);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      setRail(best);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(refreshRail);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    refreshRail();
  } else {
    setRail(0);
  }

  // discover-more drawers
  Array.prototype.forEach.call(document.querySelectorAll(".ex-more__btn"), function (btn) {
    btn.addEventListener("click", function () {
      var detail = document.getElementById(btn.getAttribute("aria-controls"));
      if (!detail) return;
      var open = detail.hidden;
      detail.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ---------- concept 03 — record sleeve ---------- */
  var gate = document.getElementById("rs-gate");
  var unfold = document.querySelector(".rs-unfold");
  if (gate && unfold) {
    unfold.addEventListener("click", function () {
      var open = gate.classList.toggle("is-open");
      unfold.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) gate.classList.add("was-unfolded");
    });
  }

  /* ---------- concept 04 — contact sheet ---------- */
  var codeEl = document.getElementById("cs-readout-code");
  var nameEl = document.getElementById("cs-readout-name");
  var metaEl = document.getElementById("cs-readout-meta");
  var captEl = document.getElementById("cs-readout-capt");
  var clearBtn = document.getElementById("cs-readout-clear");

  if (codeEl && nameEl && metaEl && captEl && clearBtn) {
    function esc(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function vitLower(s) {
      return esc(s).replace(/vitić/g, '<span class="lbx-lower">vitić</span>');
    }
    function readout(f) {
      var c = document.querySelector(".cs-frame.is-active");
      if (c) c.classList.remove("is-active");
      f.classList.add("is-active");
      codeEl.textContent = f.getAttribute("data-code") || "";
      nameEl.innerHTML = vitLower(f.getAttribute("data-artist") + " — " + f.getAttribute("data-title"));
      metaEl.innerHTML = vitLower((f.getAttribute("data-kind") || "") +
        (f.getAttribute("data-related") ? "  ·  " + f.getAttribute("data-related") : ""));
      captEl.textContent = f.getAttribute("data-capt") || "";
      clearBtn.hidden = false;
    }
    function clearReadout() {
      var c = document.querySelector(".cs-frame.is-active");
      if (c) c.classList.remove("is-active");
      codeEl.textContent = "A-00";
      nameEl.textContent = "Point at a frame";
      metaEl.textContent = "";
      captEl.textContent = "";
      clearBtn.hidden = true;
    }
    Array.prototype.forEach.call(document.querySelectorAll(".cs-frame"), function (frame) {
      frame.addEventListener("mouseenter", function () { readout(frame); });
      frame.addEventListener("focus", function () { readout(frame); });
      frame.addEventListener("click", function () { readout(frame); });
    });
    clearBtn.addEventListener("click", clearReadout);
  }
})();
/* ---------- concept 05 — the music comes first ----------
   One reusable expanded-release view. Scoped to #concept-05.
   Additive: the four earlier concepts and production are untouched. */
(function () {
  "use strict";

  var scope = document.getElementById("concept-05");
  if (!scope) return;

  var overlay = scope.querySelector(".c5-release");
  var panel = overlay && overlay.querySelector(".c5-release__panel");
  var closeBtn = overlay && overlay.querySelector(".c5-release__close");
  var art = document.getElementById("c5-dialog-art");
  var kickerEl = document.getElementById("c5-dialog-kicker");
  var titleEl = document.getElementById("c5-dialog-title");
  var artistEl = document.getElementById("c5-dialog-artist");
  var descEl = document.getElementById("c5-dialog-desc");
  var typeEl = document.getElementById("c5-dialog-type");
  var yearEl = document.getElementById("c5-dialog-year");
  var linksEl = document.getElementById("c5-dialog-links");
  if (!overlay || !panel || !closeBtn || !art || !kickerEl || !titleEl || !artistEl || !descEl || !typeEl || !yearEl || !linksEl) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var lastSource = null;
  var keyHandler = null;

  function scriptTag(attr) { return /^\s*\[/.test(attr || ""); }

  function buildLinks(csv) {
    linksEl.textContent = "";
    var srcs = String(csv || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    if (!srcs.length) {
      var ph = document.createElement("span");
      ph.className = "ph";
      ph.textContent = "[ listening links — placeholder ]";
      linksEl.appendChild(ph);
      return;
    }
    srcs.forEach(function (href) {
      var a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      var arrow = document.createElement("span");
      arrow.className = "c5-arrow";
      arrow.textContent = "↗";
      a.appendChild(document.createTextNode(/open\.spotify\.com/.test(href) ? "Spotify" : "Listen"));
      a.appendChild(arrow);
      linksEl.appendChild(a);
    });
  }

  function openRelease(source, card) {
    lastSource = source;
    var t = card.getAttribute("data-title") || "";
    var a = card.getAttribute("data-artist") || "";
    var typ = card.getAttribute("data-type") || "[ type — placeholder ]";
    var yr = card.getAttribute("data-year") || "[ year — placeholder ]";
    art.src = card.getAttribute("data-img") || "";
    art.alt = t + " — " + a + " (cover)";
    kickerEl.textContent = typ + " · " + yr;
    titleEl.textContent = t;
    artistEl.textContent = a;
    descEl.textContent = card.getAttribute("data-desc") || "";
    descEl.classList.toggle("ph", scriptTag(descEl.textContent));
    typeEl.textContent = typ;
    yearEl.textContent = yr;
    buildLinks(card.getAttribute("data-listen"));
overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("c5-locked");
    closeBtn.focus({ preventScroll: true });
      if (!keyHandler) {
        keyHandler = function (e) {
          if (e.key === "Escape") { closeRelease(); return; }
          if (e.key !== "Tab") return;
          var focusables = overlay.querySelectorAll('a[href], button:not([disabled])');
          if (!focusables.length) return;
          var first = focusables[0];
          var last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        window.addEventListener("keydown", keyHandler);
      }
  }

  function closeRelease() {
    if (!overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("c5-locked");
    if (keyHandler) { window.removeEventListener("keydown", keyHandler); keyHandler = null; }
    if (lastSource && lastSource.focus) lastSource.focus({ preventScroll: true });
    lastSource = null;
  }

  // cards open themselves
  Array.prototype.forEach.call(scope.querySelectorAll(".c5-card"), function (card) {
    card.addEventListener("click", function () { openRelease(card, card); });
  });

  // artist "open" affordances reuse the same component
  Array.prototype.forEach.call(scope.querySelectorAll("[data-open]"), function (btn) {
    btn.addEventListener("click", function () {
      var card = scope.querySelector('.c5-card[data-id="' + btn.getAttribute("data-open") + '"]');
      if (card) openRelease(btn, card);
    });
  });

  closeBtn.addEventListener("click", closeRelease);

  // backdrop click closes
  overlay.addEventListener("click", function (e) {
    if (!e.target.closest(".c5-release__panel")) closeRelease();
  });
})();
