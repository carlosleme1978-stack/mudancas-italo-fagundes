(function(){
  const c = window.SITE_CONFIG || {};
  // Mensagem WhatsApp: 1) data-wa-text do link, 2) data-wa-text do <body>, 3) SITE_CONFIG.whatsappText
  const pageText = document.body ? document.body.getAttribute('data-wa-text') : null;
  const wa = document.querySelectorAll('[data-wa]');
  wa.forEach(a=>{
    const msg = a.getAttribute('data-wa-text') || pageText || c.whatsappText || "";
    a.href = `https://wa.me/${c.whatsappNumber}?text=${encodeURIComponent(msg)}`;
  });
  // Telefone centralizado em SITE_CONFIG.phoneNumber (o href tel: no HTML funciona sem JS)
  if (c.phoneNumber) {
    document.querySelectorAll('[data-tel]').forEach(a=>{ a.href = `tel:${c.phoneNumber}`; });
  }
  // Menu mobile com botão real (FAG-ADS-03C): só em cabeçalhos com [data-menu-toggle]
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menuPanel = menuToggle && document.getElementById(menuToggle.getAttribute('aria-controls'));
  const menuNav = menuToggle && menuToggle.closest('.nav');
  if (menuToggle && menuPanel && menuNav) {
    document.documentElement.classList.add('js-nav');
    const setMenuOpen = open => {
      menuNav.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    menuToggle.addEventListener('click', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menuNav.classList.contains('is-open')) { setMenuOpen(false); menuToggle.focus(); }
    });
    document.addEventListener('click', e => {
      if (menuNav.classList.contains('is-open') && !menuNav.contains(e.target)) setMenuOpen(false);
    });
    menuNav.addEventListener('focusout', e => {
      if (menuNav.classList.contains('is-open') && e.relatedTarget && !menuNav.contains(e.relatedTarget)) setMenuOpen(false);
    });
  }
  const rev = document.querySelectorAll('[data-greview]');
  rev.forEach(a=>{
    if(c.googleBusinessReviewUrl && c.googleBusinessReviewUrl.trim() && !c.googleBusinessReviewUrl.includes('#avaliacoes')){
      a.href = c.googleBusinessReviewUrl;
      a.target = "_blank"; a.rel="noopener noreferrer";
    }
  });
})();

