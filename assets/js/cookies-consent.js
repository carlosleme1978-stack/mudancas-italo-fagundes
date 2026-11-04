/*
 * Consentimento de cookies — Fagundes Transportes (FAG-ADS-04B, FAG-ADS-05A)
 * Sem dependências externas. Regista a escolha do visitante e expõe o estado
 * (incluindo o mapeamento para o Consent Mode v2). A medição Google Analytics
 * e Google Ads (/assets/js/analytics.js) só é carregada DEPOIS de o visitante autorizar
 * "Análise" e/ou "Publicidade" (Consent Mode v2, modo básico). Antes disso não há pedidos à Google.
 */
(function () {
  'use strict';

  var VERSION = 3;                         // v3 (09A): a categoria Publicidade passou a carregar o Google Ads; as escolhas v2 deixam de valer
  var COOKIE_NAME = 'fp_consent';
  var MAX_AGE = 60 * 60 * 24 * 180;        // 6 meses (validade a confirmar pela agência)
  var ROOT_DOMAIN = 'fagundestransportes.pt';
  var POLICY_URL = '/cookies/';
  var ANALYTICS_SRC = '/assets/js/analytics.js';
  var STORAGE_KEY = 'fp_consent';          // só usado se os cookies estiverem bloqueados

  var root = document.documentElement;
  var state = null;                        // null = ainda sem escolha
  var storageMode = 'none';                // 'cookie' | 'localStorage' | 'memory' | 'none'
  var banner = null, overlay = null, dialog = null, lastOpener = null;

  /* ---------- estado ---------- */

  function serialize(s) {
    return 'v' + s.v + '|' + s.ts + '|a' + (s.analytics ? 1 : 0) + '|m' + (s.ads ? 1 : 0);
  }

  function parse(raw) {
    var m = /^v(\d+)\|([0-9T:.\-]+Z)\|a([01])\|m([01])$/.exec(raw || '');
    if (!m || Number(m[1]) !== VERSION) return null;
    return { v: VERSION, ts: m[2], analytics: m[3] === '1', ads: m[4] === '1' };
  }

  function isProductionHost() {
    var h = location.hostname;
    return h === ROOT_DOMAIN || h.slice(-(ROOT_DOMAIN.length + 1)) === '.' + ROOT_DOMAIN;
  }

  // Domain só no domínio real (partilha com subdomínios); em localhost/IP fica sem Domain.
  // Secure só em HTTPS, para não criar um cookie impossível de gravar em http://localhost.
  function cookieAttributes(maxAge) {
    var parts = ['Path=/', 'Max-Age=' + maxAge, 'SameSite=Lax'];
    if (isProductionHost()) parts.push('Domain=.' + ROOT_DOMAIN);
    if (location.protocol === 'https:') parts.push('Secure');
    return '; ' + parts.join('; ');
  }

  function readCookie(name) {
    var all = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < all.length; i++) {
      var eq = all[i].indexOf('=');
      if (all[i].slice(0, eq) === name) {
        try { return decodeURIComponent(all[i].slice(eq + 1)); } catch (e) { return null; }
      }
    }
    return null;
  }

  function load() {
    var raw = null;
    try { raw = readCookie(COOKIE_NAME); } catch (e) { raw = null; }
    if (raw !== null) { storageMode = 'cookie'; return parse(raw); }
    try { raw = window.localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (raw !== null) { storageMode = 'localStorage'; return parse(raw); }
    return null;
  }

  function save(s) {
    var value = serialize(s);
    try {
      document.cookie = COOKIE_NAME + '=' + encodeURIComponent(value) + cookieAttributes(MAX_AGE);
      if (readCookie(COOKIE_NAME) === value) {
        storageMode = 'cookie';
        try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* sem acesso */ }
        return;
      }
    } catch (e) { /* cookies bloqueados */ }
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
      storageMode = 'localStorage';
      return;
    } catch (e) { /* armazenamento bloqueado */ }
    storageMode = 'memory';               // a escolha vale só nesta página
  }

  // Quando uma categoria é retirada, apaga cookies que a Google possa ter criado.
  function clearTrackingCookies(analytics, ads) {
    var prefixes = [];
    if (!analytics) prefixes.push('_ga', '_gid');
    if (!ads) prefixes.push('_gcl');
    if (!prefixes.length || !document.cookie) return;
    document.cookie.split('; ').forEach(function (pair) {
      var name = pair.slice(0, pair.indexOf('='));
      for (var i = 0; i < prefixes.length; i++) {
        if (name.indexOf(prefixes[i]) === 0) {
          var expire = name + '=; Path=/; Max-Age=0';
          document.cookie = expire;
          if (isProductionHost()) document.cookie = expire + '; Domain=.' + ROOT_DOMAIN;
          break;
        }
      }
    });
  }

  // Mapeamento para o Consent Mode v2. Sem escolha = tudo negado.
  // ad_personalization fica sempre negado nesta fase.
  function googleConsent(s) {
    return {
      analytics_storage: s && s.analytics ? 'granted' : 'denied',
      ad_storage: s && s.ads ? 'granted' : 'denied',
      ad_user_data: s && s.ads ? 'granted' : 'denied',
      ad_personalization: 'denied'
    };
  }

  function setChoice(analytics, ads) {
    var previous = state;
    state = { v: VERSION, ts: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), analytics: !!analytics, ads: !!ads };
    save(state);
    hideBanner();
    closePreferences();
    var detail = { choice: copy(state), google: googleConsent(state), storage: storageMode };
    try { document.dispatchEvent(new CustomEvent('fp:consentchange', { detail: detail })); } catch (e) { /* navegador antigo */ }
    // Depois de a etiqueta (se existir) receber o "denied", apaga os cookies da categoria retirada.
    if (previous) clearTrackingCookies(state.analytics, state.ads);
    loadAnalytics();
  }

  // Carrega a medição uma única vez por página, e só com consentimento de Análise e/ou Publicidade.
  function loadAnalytics() {
    if (!state || !(state.analytics || state.ads)) return;
    if (window.__fpAnalytics || document.querySelector('script[data-fp-analytics]')) return;
    var s = document.createElement('script');
    s.src = ANALYTICS_SRC;
    s.setAttribute('data-fp-analytics', '');
    document.head.appendChild(s);
  }

  function copy(s) {
    return s ? { v: s.v, ts: s.ts, analytics: s.analytics, ads: s.ads } : null;
  }

  /* ---------- interface ---------- */

  function layout() {
    var bar = document.querySelector('.mobileCta');
    var barH = bar && window.getComputedStyle(bar).display !== 'none' ? bar.offsetHeight : 0;
    root.style.setProperty('--cc-bar', barH + 'px');
    if (banner && !banner.hidden) {
      banner.classList.toggle('cc-banner--abovebar', barH > 0);
      root.style.setProperty('--cc-h', banner.offsetHeight + 'px');
    }
  }

  var layoutQueued = false;
  function queueLayout() {
    if (layoutQueued) return;
    layoutQueued = true;
    window.requestAnimationFrame(function () { layoutQueued = false; layout(); });
  }

  function buildBanner() {
    banner = document.createElement('section');
    banner.className = 'cc-banner';
    banner.setAttribute('aria-label', 'Consentimento de cookies');
    banner.innerHTML =
      '<div class="cc-inner">' +
        '<p class="cc-text">Usamos cookies opcionais de análise (Google Analytics) apenas se autorizar. ' +
        '<a href="' + POLICY_URL + '">Política de cookies</a></p>' +
        '<div class="cc-actions">' +
          '<button type="button" class="cc-btn" data-cc="reject">Recusar tudo</button>' +
          '<button type="button" class="cc-btn" data-cc="accept">Aceitar tudo</button>' +
          '<button type="button" class="cc-btn cc-btn--quiet" data-cc="prefs">Preferências</button>' +
        '</div>' +
      '</div>';
    banner.addEventListener('click', onAction);
    // Primeiro na ordem do teclado (depois do link "Saltar para o conteúdo", se existir).
    var skip = document.body.querySelector(':scope > .skipLink');
    document.body.insertBefore(banner, skip ? skip.nextSibling : document.body.firstChild);
  }

  function showBanner() {
    if (!banner) buildBanner();
    banner.hidden = false;
    root.classList.add('cc-open');
    layout();
  }

  function hideBanner() {
    if (!banner || banner.hidden) return;
    var hadFocus = banner.contains(document.activeElement);
    banner.hidden = true;
    root.classList.remove('cc-open');
    root.style.removeProperty('--cc-h');
    if (hadFocus) focusAfterBanner();
  }

  // Evita perder o foco quando o banner desaparece.
  function focusAfterBanner() {
    var target = document.querySelector('h1') || document.querySelector('main') || document.body;
    if (target !== document.body && !target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener('blur', function () { target.removeAttribute('tabindex'); }, { once: true });
    }
    try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
  }

  function buildPreferences() {
    overlay = document.createElement('div');
    overlay.className = 'cc-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="cc-dialog" role="dialog" aria-modal="true" aria-labelledby="cc-title" aria-describedby="cc-desc">' +
        '<div class="cc-dialog-head">' +
          '<h2 id="cc-title" class="cc-title">Preferências de cookies</h2>' +
          '<button type="button" class="cc-close" data-cc="close" aria-label="Fechar preferências">×</button>' +
        '</div>' +
        '<p id="cc-desc" class="cc-desc">Escolha o que autoriza. Pode alterar a escolha a qualquer momento em «Preferências de cookies». ' +
        '<a href="' + POLICY_URL + '">Política de cookies</a></p>' +
        '<div class="cc-cat cc-cat--fixed">' +
          '<div class="cc-cat-text"><span class="cc-cat-name" id="cc-nec-name">Necessários</span>' +
          '<span class="cc-cat-desc" id="cc-nec-desc">Guardam a sua escolha de cookies. Sempre ativos.</span></div>' +
          '<input type="checkbox" class="cc-switch" role="switch" checked disabled aria-labelledby="cc-nec-name" aria-describedby="cc-nec-desc">' +
        '</div>' +
        '<label class="cc-cat" for="cc-analytics">' +
          '<span class="cc-cat-text"><span class="cc-cat-name">Análise</span>' +
          '<span class="cc-cat-desc" id="cc-analytics-desc">Ajuda-nos a perceber como o site é usado (Google Analytics). Desativado por defeito.</span></span>' +
          '<input type="checkbox" class="cc-switch" role="switch" id="cc-analytics" aria-describedby="cc-analytics-desc">' +
        '</label>' +
        '<label class="cc-cat" for="cc-ads">' +
          '<span class="cc-cat-text"><span class="cc-cat-name">Publicidade</span>' +
          '<span class="cc-cat-desc" id="cc-ads-desc">Mede os pedidos de contacto vindos de anúncios Google (Google Ads). Não personaliza anúncios. Desativado por defeito.</span></span>' +
          '<input type="checkbox" class="cc-switch" role="switch" id="cc-ads" aria-describedby="cc-ads-desc">' +
        '</label>' +
        '<div class="cc-dialog-actions">' +
          '<button type="button" class="cc-btn" data-cc="reject">Recusar tudo</button>' +
          '<button type="button" class="cc-btn" data-cc="accept">Aceitar tudo</button>' +
          '<button type="button" class="cc-btn cc-btn--save" data-cc="save">Guardar escolhas</button>' +
        '</div>' +
      '</div>';
    dialog = overlay.querySelector('.cc-dialog');
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) { closePreferences(); return; }
      onAction(e);
    });
    overlay.addEventListener('keydown', onDialogKeydown);
    document.body.appendChild(overlay);
  }

  function openPreferences(opener) {
    if (!overlay) buildPreferences();
    lastOpener = opener || document.activeElement;
    overlay.querySelector('#cc-analytics').checked = !!(state && state.analytics);
    overlay.querySelector('#cc-ads').checked = !!(state && state.ads);
    overlay.hidden = false;
    root.classList.add('cc-modal');
    overlay.querySelector('#cc-analytics').focus();
  }

  function closePreferences() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    root.classList.remove('cc-modal');
    var back = lastOpener;
    lastOpener = null;
    // Volta ao botão que abriu o painel; se já não estiver visível (banner fechado), vai para o título.
    if (back && document.contains(back) && back.offsetParent !== null) back.focus();
    else focusAfterBanner();
  }

  function focusables() {
    return Array.prototype.filter.call(
      dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function onDialogKeydown(e) {
    if (e.key === 'Escape') { e.preventDefault(); closePreferences(); return; }
    if (e.key !== 'Tab') return;
    var items = focusables();
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function onAction(e) {
    var btn = e.target.closest ? e.target.closest('[data-cc]') : null;
    if (!btn) return;
    var action = btn.getAttribute('data-cc');
    if (action === 'accept') setChoice(true, true);
    else if (action === 'reject') setChoice(false, false);
    else if (action === 'prefs') openPreferences(btn);
    else if (action === 'close') closePreferences();
    else if (action === 'save') {
      setChoice(overlay.querySelector('#cc-analytics').checked, overlay.querySelector('#cc-ads').checked);
    }
  }

  // "Preferências de cookies" no rodapé, a seguir ao link "Cookies" (sem mexer nos outros links).
  function addReopenLink() {
    if (document.querySelector('.cc-reopen')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cc-reopen';
    btn.textContent = 'Preferências de cookies';
    btn.addEventListener('click', function () { openPreferences(btn); });
    var cookiesLink = document.querySelector('footer a[href="' + POLICY_URL + '"]');
    if (cookiesLink) {
      cookiesLink.parentNode.insertBefore(btn, cookiesLink.nextSibling);
      cookiesLink.parentNode.insertBefore(document.createTextNode(' · '), btn);
    } else {
      // Páginas sem rodapé (páginas legais): linha própria no fim da página.
      var p = document.createElement('p');
      p.className = 'cc-reopen-row';
      p.appendChild(btn);
      document.body.appendChild(p);
    }
  }

  /* ---------- arranque ---------- */

  state = load();

  window.fpConsent = {
    version: VERSION,
    get: function () { return copy(state); },
    hasChoice: function () { return state !== null; },
    google: function () { return googleConsent(state); },
    storage: function () { return storageMode; },
    openPreferences: function () { openPreferences(document.activeElement); }
  };

  // Botões nas páginas (ex.: política de cookies) que reabrem as preferências.
  function onOpenButton(e) {
    var btn = e.target.closest ? e.target.closest('[data-cc-open]') : null;
    if (btn) openPreferences(btn);
  }

  function start() {
    addReopenLink();
    document.addEventListener('click', onOpenButton);
    if (!state) showBanner();
    else loadAnalytics();
    window.addEventListener('resize', queueLayout);
    window.addEventListener('orientationchange', queueLayout);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
