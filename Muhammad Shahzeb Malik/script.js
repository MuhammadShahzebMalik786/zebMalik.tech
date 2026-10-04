document.addEventListener('DOMContentLoaded', () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!reducedMotion.matches && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scrolled');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05 });
        document.documentElement.classList.add('has-scroll-effects');
        document.querySelectorAll('[data-scroll]').forEach(element => observer.observe(element));
    }

    const nav = document.querySelector('.glass-nav');
    if (nav) {
        const updateNav = () => {
            const scrolled = window.scrollY > 50;
            nav.style.background = scrolled ? 'rgba(9, 9, 11, 0.85)' : 'rgba(9, 9, 11, 0.6)';
            nav.style.boxShadow = scrolled ? '0 4px 30px rgba(0, 0, 0, 0.5)' : 'none';
        };
        updateNav();
        window.addEventListener('scroll', updateNav, { passive: true });
    }

    const menuButton = document.querySelector('.mobile-menu-btn');
    const menu = document.getElementById('portfolio-nav');
    if (menuButton && menu) {
        const closeMenu = () => {
            menu.classList.remove('is-open');
            menuButton.setAttribute('aria-expanded', 'false');
        };
        menuButton.addEventListener('click', () => {
            const open = menu.classList.toggle('is-open');
            menuButton.setAttribute('aria-expanded', String(open));
        });
        menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && menu.classList.contains('is-open')) {
                closeMenu();
                menuButton.focus();
            }
        });
    }

    if (!reducedMotion.matches && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('.tilt-card-wrapper').forEach(wrapper => {
            const card = wrapper.querySelector('.tilt-card');
            if (!card) return;
            wrapper.addEventListener('mousemove', event => {
                if (reducedMotion.matches) return;
                const rect = wrapper.getBoundingClientRect();
                const rotateX = ((event.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -15;
                const rotateY = ((event.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 15;
                card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
            wrapper.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.transition = 'transform 0.5s ease, box-shadow 0.5s ease';
            });
            wrapper.addEventListener('mouseenter', () => {
                card.style.transition = 'none';
            });
        });
    }
});
