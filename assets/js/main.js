(function(){
  const c = window.SITE_CONFIG || {};
  const wa = document.querySelectorAll('[data-wa]');
  wa.forEach(a=>{
    const text = encodeURIComponent(c.whatsappText || "");
    a.href = `https://wa.me/${c.whatsappNumber}?text=${text}`;
  });
  const rev = document.querySelectorAll('[data-greview]');
  rev.forEach(a=>{
    if(c.googleBusinessReviewUrl && c.googleBusinessReviewUrl.trim() && !c.googleBusinessReviewUrl.includes('#avaliacoes')){
      a.href = c.googleBusinessReviewUrl;
      a.target = "_blank"; a.rel="noopener noreferrer";
    }
  });
})();

