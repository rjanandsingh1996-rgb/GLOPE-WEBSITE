/* GLOPE V20 — accessible, lightweight product carousel */
(() => {
  const carousel = document.querySelector('.glope-carousel');
  const previous = document.querySelector('[data-carousel-prev]');
  const next = document.querySelector('[data-carousel-next]');
  if (!carousel) return;
  const slides = Array.from(carousel.querySelectorAll('.glope-slide'));
  if (slides.length < 2) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pauseUntil = 0;
  let timer = null;
  const stepSize = () => {
    const styles = window.getComputedStyle(carousel);
    const gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
    return slides[0].getBoundingClientRect().width + gap;
  };
  const move = direction => {
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const atEnd = carousel.scrollLeft >= maxScroll - 8;
    const atStart = carousel.scrollLeft <= 8;
    if (direction > 0 && atEnd) carousel.scrollTo({left:0,behavior:reducedMotion.matches?'auto':'smooth'});
    else if (direction < 0 && atStart) carousel.scrollTo({left:maxScroll,behavior:reducedMotion.matches?'auto':'smooth'});
    else carousel.scrollBy({left:direction*stepSize(),behavior:reducedMotion.matches?'auto':'smooth'});
  };
  previous?.addEventListener('click',()=>{pauseUntil=Date.now()+12000;move(-1)});
  next?.addEventListener('click',()=>{pauseUntil=Date.now()+12000;move(1)});
  const pause=()=>{pauseUntil=Date.now()+12000};
  carousel.addEventListener('pointerdown',pause,{passive:true});
  carousel.addEventListener('focusin',pause);
  carousel.addEventListener('mouseenter',pause);
  const start=()=>{
    if(timer||reducedMotion.matches)return;
    timer=window.setInterval(()=>{
      if(document.hidden||Date.now()<pauseUntil)return;
      move(1);
    },6200);
  };
  const stop=()=>{if(timer)window.clearInterval(timer);timer=null};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start()});
  reducedMotion.addEventListener?.('change',()=>{if(reducedMotion.matches)stop();else start()});
  start();
})();
