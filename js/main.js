/**
 * E&G FITNESS SPORT — main.js
 * Theme manager y lógica global
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Manager (Dark/Light mode) prevent FOUC
    const root = document.documentElement;
    const isDark = localStorage.getItem('theme') === 'dark' || 
                   (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Función para forzar el color del header (bypass Tailwind JIT issues)
    const updateHeaderTheme = () => {
        const headerNav = document.querySelector('header nav');
        if (!headerNav) return;
        
        if (root.classList.contains('dark')) {
            headerNav.style.backgroundColor = 'rgba(23, 23, 23, 0.8)'; // neutral-900 con opacidad
            headerNav.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        } else {
            headerNav.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            headerNav.style.borderColor = 'rgba(0, 0, 0, 0.1)';
        }
    };

    // Aplicamos clase de una vez si es oscura para evitar flash light
    if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
    } else {
        root.classList.add('light');
        root.classList.remove('dark');
    }
    
    // Forzar tema inicial del header
    updateHeaderTheme();

    // Toggle logic function (usada por botones en navbar)
    window.toggleTheme = function() {
        const currentlyDark = root.classList.contains('dark');
        if (currentlyDark) {
            root.classList.remove('dark');
            root.classList.add('light');
            localStorage.setItem('theme', 'light');
        } else {
            root.classList.remove('light');
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        
        // Forzar actualización de colores del header
        updateHeaderTheme();
        
        // Disparar evento custom si alguna página lo necesita detectar
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark: !currentlyDark } }));
    };

    // Función para actualizar contador de carrito (badges)
    const updateCartCount = () => {
        const cart = JSON.parse(localStorage.getItem('eg_cart') || '[]');
        const count = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
        const countBadges = document.querySelectorAll('#cart-count, #cart-count-mobile');
        
        countBadges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    };

    // Binding a los botones por ID (index, store, detail)
    const toggleBtns = document.querySelectorAll('#theme-toggle');
    toggleBtns.forEach(btn => {
        btn.onclick = window.toggleTheme; // Usar onclick para asegurar un solo binding
    });

    // 3. Mobile Menu Logic
    const initMobileMenu = () => {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileDrawer = document.getElementById('mobileDrawer');
        const drawerOverlay = document.getElementById('drawerOverlay');
        const closeDrawerBtn = document.getElementById('closeDrawer');

        if (!mobileMenuBtn || !mobileDrawer || !drawerOverlay) return;

        const toggleMenu = (e) => {
            if (e) e.preventDefault();
            const isOpen = mobileDrawer.classList.contains('open');
            if (isOpen) {
                mobileDrawer.classList.remove('open');
                drawerOverlay.classList.remove('active');
                document.body.style.overflow = '';
            } else {
                mobileDrawer.classList.add('open');
                drawerOverlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        };

        mobileMenuBtn.onclick = toggleMenu;
        if (closeDrawerBtn) closeDrawerBtn.onclick = toggleMenu;
        drawerOverlay.onclick = toggleMenu;

        // Cerrar al hacer click en links
        const drawerLinks = mobileDrawer.querySelectorAll('a');
        drawerLinks.forEach(link => {
            link.onclick = () => {
                mobileDrawer.classList.remove('open');
                drawerOverlay.classList.remove('active');
                document.body.style.overflow = '';
            };
        });
    };

    // Sincronización inicial
    initMobileMenu();
    updateCartCount();
    
    // Escuchar cambios externos en el carrito si es necesario
    window.addEventListener('storage', (e) => {
        if (e.key === 'eg_cart') updateCartCount();
    });
    
    // Escuchar evento custom de actualización (si existe en cart.js o store.js)
    window.addEventListener('cartUpdated', updateCartCount);

    // 4. Global Scroll Animation (Web & Mobile)
    const initScrollAnimations = () => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes premiumScrollEdge {
                0% { opacity: 0; transform: translateY(30px); filter: blur(8px); }
                100% { opacity: 1; transform: translateY(0); filter: blur(0); }
            }
            .reveal-on-scroll { opacity: 0; }
            .reveal-on-scroll.is-revealed {
                animation: premiumScrollEdge 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
        `;
        document.head.appendChild(style);

        // Seleccionamos elementos clave a animar en el cuerpo principal
        const elements = document.querySelectorAll('main h2, main h3, main p:not(.text-\\[10px\\]), main .group, main img:not(.absolute)');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-revealed');
                    // Remueve hook de animación luego de completarse para no romper hover transitions (ej. group-hover)
                    setTimeout(() => {
                        entry.target.style.animation = 'none';
                        entry.target.classList.remove('reveal-on-scroll', 'is-revealed');
                        // Restauramos opacity para que no se oculte tras borrar la clave CSS
                        entry.target.style.opacity = '1'; 
                    }, 1000);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        });

        elements.forEach((el, i) => {
            if (el.closest('.hero-premium-container') || el.closest('.animate-slide-up') || el.closest('.drawer-overlay')) return;
            el.classList.add('reveal-on-scroll');
            // Cascade timing para grupos de elementos
            el.style.animationDelay = `${(i % 5) * 0.08}s`;
            observer.observe(el);
        });
    };
    
    // Inicializar luego del first paint
    setTimeout(initScrollAnimations, 100);
});
