document.addEventListener("DOMContentLoaded", function () {
  if (window.innerWidth > 880) return;

  const cards = document.querySelectorAll(".card.feature1");
  if (!cards.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("in-view", entry.isIntersecting);
    });
  }, {
    threshold: 0.45
  });

  cards.forEach((card) => observer.observe(card));
});
