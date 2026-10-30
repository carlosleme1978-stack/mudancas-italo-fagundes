/*
 * Medição GA4 — Fagundes Transportes (FAG-ADS-05A)
 * Este ficheiro NUNCA é incluído diretamente nas páginas: é carregado por
 * cookies-consent.js só depois de o visitante autorizar a categoria "Análise"
 * (Consent Mode v2, modo básico). Não envia dados pessoais.
 */
(function () {
  'use strict';

  var GA_ID = 'G-SMMXQHF7ZQ';
  var consent = window.fpConsent;

  // Uma única inicialização por página; e nada sem consentimento válido para análise.
  if (window.__fpAnalytics) return;
  if (!consent || !consent.get() || !consent.get().analytics) return;

  var tracker = window.__fpAnalytics = { id: GA_ID, active: true };
  window['ga-disable-' + GA_ID] = false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  // Estado inicial restritivo e, logo a seguir, as escolhas reais do visitante.
  // Análise não implica publicidade: cada sinal segue a sua própria categoria.
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
  window.gtag('consent', 'update', consent.google());
  window.gtag('set', 'ads_data_redaction', true);
  window.gtag('js', new Date());
  // Um único config = um único page_view automático. Sem Google Signals nem personalização.
  window.gtag('config', GA_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(script);

  /* ---------- eventos de contacto ---------- */

  function pageType(path) {
    if (path === '/') return 'home';
    if (/^\/(cookies|privacidade|termos|acessibilidade)\//.test(path)) return 'legal';
    if (/^\/blog\//.test(path)) return 'blog';
    if (/^\/servicos\//.test(path)) return 'servico';
    if (/^\/mudancas-(em|no|na)-[^/]+\/[^/]+\/$/.test(path)) return 'local';
    if (/^\/mudancas-(em|no|na)-[^/]+\/$/.test(path)) return 'regiao';
    return 'outro';
  }

  function classify(link) {
    var href = link.href || '';
    if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(href)) {
      return { name: 'whatsapp_click', position: link.getAttribute('data-wa-pos') };
    }
    if (/^tel:/i.test(href)) {
      return { name: 'phone_click', position: link.getAttribute('data-tel-pos') };
    }
    if (/^https:\/\/simulador\.fagundestransportes\.pt(\/|$)/i.test(href)) {
      return { name: 'simulator_open', position: link.getAttribute('data-sim-pos') };
    }
    return null;
  }

  var last = { link: null, time: 0 };

  // Um único ouvinte (fase de captura) para todos os links: evita eventos duplicados.
  document.addEventListener('click', function (e) {
    if (!tracker.active) return;
    var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!link) return;
    var hit = classify(link);
    if (!hit) return;
    var now = Date.now();
    if (last.link === link && now - last.time < 1000) return;   // duplo toque acidental
    last.link = link;
    last.time = now;
    // Só parâmetros não pessoais: nunca o href (tem o número e o texto da mensagem).
    window.gtag('event', hit.name, {
      page_path: window.location.pathname,
      page_type: pageType(window.location.pathname),
      button_position: hit.position || 'sem_posicao'
    });
  }, true);

  /* ---------- alteração ou retirada do consentimento ---------- */

  document.addEventListener('fp:consentchange', function (e) {
    var google = e.detail && e.detail.google;
    if (!google) return;
    window.gtag('consent', 'update', google);
    tracker.active = google.analytics_storage === 'granted';
    // Opt-out oficial do GA4: impede novos envios nesta página após retirada.
    window['ga-disable-' + GA_ID] = !tracker.active;
  });
})();
