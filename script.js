const menu = document.querySelector('.menu');
const mobileNav = document.querySelector('.mobile-nav');

if (menu && mobileNav) {
  menu.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });

  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    });
  });
}

document.getElementById('year').textContent = new Date().getFullYear();
