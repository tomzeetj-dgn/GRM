/* ============================================================
   GRM — i18n engine (Phase 1: architecture + switcher)

   - One codebase, one DOM. Switching language rewrites text and
     attributes in place — no reload, no route change, no scroll or
     carousel reset, and it never triggers the page transitions.
   - English is the canonical default; the markup itself is the
     English fallback, so with JS off the site reads as English.
   - Missing keys fall back per-key: current lang → en → authored
     DOM text (never undefined / blank / raw key names).
   - Persistence: localStorage["grm-language"].
   - <html lang> is kept in sync ("en" / "sr-Latn").

   Hooks (all optional per node):
     data-i18n="key"            → text (or meta/… content)
     data-i18n-aria-label="key" → aria-label
     data-i18n-alt="key"        → alt
     data-i18n-title="key"      → title
     data-i18n-placeholder="key"→ placeholder
     data-i18n-content="key"    → content
     data-i18n-value="key"      → value
   Switcher: elements with [data-lang="en|sr"].
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "grm-language";
  var DEFAULT_LANG = "en";
  var SUPPORTED = ["en", "sr"];
  var LANG_TAG = { en: "en", sr: "sr-Latn" };
  var DICT = window.GRM_TRANSLATIONS || { en: {}, sr: {} };

  var ATTR_HOOKS = [
    ["data-i18n-aria-label", "aria-label"],
    ["data-i18n-alt", "alt"],
    ["data-i18n-title", "title"],
    ["data-i18n-placeholder", "placeholder"],
    ["data-i18n-content", "content"],
    ["data-i18n-value", "value"]
  ];
  var SELECTOR = "[data-i18n]," + ATTR_HOOKS.map(function (h) { return "[" + h[0] + "]"; }).join(",");

  function normalize(lang) {
    return SUPPORTED.indexOf(lang) > -1 ? lang : DEFAULT_LANG;
  }

  function stored() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.indexOf(value) > -1 ? value : null;
    } catch (e) { return null; }
  }

  var current = normalize(stored() || DEFAULT_LANG);

  /* current lang → en → null (caller keeps authored DOM text on null) */
  function lookup(lang, key) {
    if (key == null) return null;
    var dict = DICT[lang];
    if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
      var value = dict[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    if (lang !== DEFAULT_LANG) return lookup(DEFAULT_LANG, key);
    return null;
  }

  /* Public translate. Supports {token} interpolation. */
  function t(key, params) {
    var value = lookup(current, key);
    if (value === undefined || value === null) return key;
    if (params && typeof value === "string") {
      value = value.replace(/\{(\w+)\}/g, function (match, token) {
        return Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : match;
      });
    }
    return value;
  }

  /* Word-split nodes own their child spans (liveroom ghost-materialise);
     rewriting them would flatten the animation, so never touch them. */
  function ownsSplitWords(el) {
    return !!(el.querySelector && el.querySelector(".lr-word"));
  }

  function apply(root) {
    root = root || document;
    var nodes = root.querySelectorAll(SELECTOR);
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.getAttribute("data-i18n-skip") !== null) return;

      var textKey = el.getAttribute("data-i18n");
      if (textKey !== null && !ownsSplitWords(el)) {
        var textValue = lookup(current, textKey);
        if (textValue !== null) {
          if (el.tagName === "META") el.setAttribute("content", String(textValue));
          else el.textContent = String(textValue);
        }
      }

      for (var i = 0; i < ATTR_HOOKS.length; i++) {
        var hook = ATTR_HOOKS[i];
        var key = el.getAttribute(hook[0]);
        if (key === null) continue;
        var value = lookup(current, key);
        if (value !== null) el.setAttribute(hook[1], String(value));
      }
    });
  }

  function paintSwitchers() {
    var buttons = document.querySelectorAll("[data-lang]");
    Array.prototype.forEach.call(buttons, function (button) {
      var active = normalize(button.getAttribute("data-lang")) === current;
      if (active) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
      button.classList.toggle("is-active", active);
    });
  }

  function setLang(lang) {
    var next = normalize(lang);
    current = next;
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    document.documentElement.lang = LANG_TAG[next] || next;
    apply(document);
    paintSwitchers();
    try {
      document.dispatchEvent(new CustomEvent("grm:languagechange", { detail: { lang: next } }));
    } catch (e) {}
  }

  function refresh() {
    apply(document);
    paintSwitchers();
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  /* Reflect the stored language on <html> as early as possible. */
  document.documentElement.lang = LANG_TAG[current] || current;

  /* One delegated listener serves every switcher, including the ones
     injected later into the header and the mobile Home overlay. */
  document.addEventListener("click", function (event) {
    var target = event.target;
    var button = target && target.closest ? target.closest("[data-lang]") : null;
    if (!button) return;
    event.preventDefault();
    setLang(button.getAttribute("data-lang"));
  });

  onReady(refresh);

  window.GRMi18n = {
    get lang() { return current; },
    t: t,
    setLang: setLang,
    apply: apply,
    refresh: refresh
  };
})();
