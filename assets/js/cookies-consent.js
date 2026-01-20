(function () {
  const KEY = "cookie_consent_v1";

  function hasConsent() {
    return localStorage.getItem(KEY) === "accepted";
  }

  function createBanner() {
    const banner = document.createElement("div");
    banner.id = "cookie-banner";
    banner.style.position = "fixed";
    banner.style.left = "0";
    banner.style.right = "0";
    banner.style.bottom = "0";
    banner.style.padding = "14px 16px";
    banner.style.background = "#111";
    banner.style.color = "#fff";
    banner.style.fontFamily = "Arial, sans-serif";
    banner.style.zIndex = "9999";

    banner.innerHTML = `
      <div style="max-width: 920px; margin: 0 auto; display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap;">
        <div style="font-size:14px; line-height:1.5;">
          Usamos cookies apenas quando necessário. Se ativarmos ferramentas de análise/marketing, pediremos o seu consentimento.
          <a href="/mudancas-italo-fagundes/cookies/" style="color:#fff; text-decoration:underline;">Saber mais</a>.
        </div>
        <div style="display:flex; gap:10px;">
          <button id="cookie-accept" style="padding:10px 12px; border:0; cursor:pointer;">Aceitar</button>
          <button id="cookie-close" style="padding:10px 12px; border:1px solid #fff; background:transparent; color:#fff; cursor:pointer;">Fechar</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById("cookie-accept").addEventListener("click", function () {
      localStorage.setItem(KEY, "accepted");
      banner.remove();
      // Aqui você carregaria scripts de analytics/pixels APENAS depois do aceite.
    });

    document.getElementById("cookie-close").addEventListener("click", function () {
      banner.remove();
    });
  }

  window.addEventListener("load", function () {
    if (!hasConsent()) createBanner();
  });
})();

