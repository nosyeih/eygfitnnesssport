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
});
