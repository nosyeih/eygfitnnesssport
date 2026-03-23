/**
 * E&G FITNESS SPORT — utils.js
 * Utilidades compartidas entre store.js y product.js
 */

/* ─── BADGE ──────────────────────────────────────────────────────────────────── */

/**
 * Retorna la clase CSS del badge según su texto.
 * @param {string|null} badge
 * @returns {string}
 */
function getBadgeClass(badge) {
  if (!badge) return '';
  const b = badge.replace(/\s+/g, '').toLowerCase();
  const map = {
    bestseller: 'badge-bestseller',
    new:        'badge-new',
    oferta:     'badge-sale',
    pro:        'badge-pro',
    popular:    'badge-popular',
    toprated:   'badge-toprated',
  };
  return map[b] || 'badge-bestseller';
}

/* ─── STARS ──────────────────────────────────────────────────────────────────── */

/**
 * Genera el HTML de las estrellas.
 * @param {number} rating  — calificación (0-5)
 * @param {string} [size]  — clase extra: 'stars-sm' | 'stars-lg'
 * @returns {string}
 */
function renderStars(rating, size = '') {
  let html = `<span class="stars ${size}">`;
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(rating);
    html += `<span class="material-symbols-outlined star ${filled ? 'filled' : 'empty'}">star</span>`;
  }
  return html + '</span>';
}

/* ─── PRECIO ──────────────────────────────────────────────────────────────────── */

/**
 * Formatea un número como precio en soles peruanos.
 * @param {number} price
 * @returns {string}  ej. "S/ 2,499.00"
 */
function formatPrice(price) {
  return 'S/ ' + price.toLocaleString('es-PE', { minimumFractionDigits: 2 });
}

/**
 * Calcula el porcentaje de descuento entre dos precios.
 * @param {number} price
 * @param {number} originalPrice
 * @returns {number}  — 0 si no hay descuento
 */
function calcDiscount(price, originalPrice) {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round((1 - price / originalPrice) * 100);
}

/* ─── RUTA DE IMAGEN ──────────────────────────────────────────────────────────── */

/**
 * Resuelve la ruta de una imagen según el contexto de la página.
 * - Si es URL absoluta (http/https) → retorna tal cual
 * - Si empieza con "img/" → antepone basePath (e.g. "../")
 * @param {string} src
 * @param {string} [basePath='']  — prefijo para rutas relativas
 * @returns {string}
 */
function resolveImgSrc(src, basePath = '') {
  if (!src) return '';
  if (src.startsWith('http') || src.startsWith('//')) return src;
  if (src.startsWith('img/')) return basePath + src;
  return src;
}

/* ─── TEXTO ──────────────────────────────────────────────────────────────────── */

/**
 * Convierte un string en slug válido para IDs HTML.
 * @param {string} str
 * @returns {string}
 */
function slugify(str) {
  return (str || '').replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

/**
 * Etiqueta legible para claves de spec del JSON.
 * @param {string} key
 * @returns {string}
 */
function formatSpecKey(key) {
  const map = {
    motor: 'Motor', maxSpeed: 'Vel. Máx', incline: 'Inclinación',
    maxWeight: 'Peso Máx', runningArea: 'Área de Rodado',
    weight: 'Pesas', stations: 'Estaciones', pulleys: 'Poleas',
    extras: 'Extras', material: 'Material', adjustable: 'Ajustable',
    positions: 'Posiciones', flywheel: 'Volante', resistance: 'Resistencia',
    display: 'Pantalla', seat: 'Asiento', stride: 'Zancada', foldable: 'Plegable',
  };
  return map[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

/* ─── TOAST ──────────────────────────────────────────────────────────────────── */

/**
 * Muestra una notificación temporal.
 * @param {string}  msg
 * @param {string}  [type='primary']  — 'primary' (amarillo) | 'dark' (gris)
 * @param {number}  [duration=2500]   — ms hasta desaparecer
 */
function showToast(msg, type = 'primary', duration = 2500) {
  // Eliminar toasts anteriores
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast${type === 'dark' ? ' dark' : ''}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ─── FETCH PRODUCTS ─────────────────────────────────────────────────────────── */

/**
 * Carga el archivo products.json.
 * @param {string} path — ruta al JSON
 * @returns {Promise<Object>}
 */
async function fetchProducts(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ─── CARRITO DE COMPRAS (LOCALSTORAGE) ──────────────────────────────────────── */

/**
 * Obtiene el carrito del localStorage.
 * @returns {Array} 
 */
function getCart() {
  const c = localStorage.getItem('eg_cart');
  return c ? JSON.parse(c) : [];
}

/**
 * Guarda el carrito en el localStorage.
 * @param {Array} cart 
 */
function saveCart(cart) {
  localStorage.setItem('eg_cart', JSON.stringify(cart));
  updateCartIcon();
}

/**
 * Añade un producto al carrito global.
 * @param {Object} product - producto del json
 * @param {number} qty - cantidad
 */
window.addToGlobalCart = function(product, qty = 1) {
  const cart = getCart();
  const index = cart.findIndex(item => item.id === product.id);
  
  if (index >= 0) {
    cart[index].qty += qty;
  } else {
    // Guardamos solo data esencial para no saturar el storage
    cart.push({
      id: product.id,
      name: product.name,
      model: product.model,
      brand: product.brand,
      price: product.price,
      image: product.images ? product.images[0] : null,
      qty: qty
    });
  }
  
  saveCart(cart);
  showToast(`¡Añadido al carrito: ${product.name}!`, 'dark');
}

/**
 * Actualiza el contador rojo del ícono del carrito en toda la web.
 */
function updateCartIcon() {
  const cart = getCart();
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  
  document.querySelectorAll('[aria-label="Carrito"]').forEach(btn => {
    let badge = btn.querySelector('.cart-badge');
    if (totalItems > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart-badge absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-600 shadow rounded-full select-none transform translate-x-1 -translate-y-1';
        btn.appendChild(badge);
      }
      badge.textContent = totalItems > 99 ? '99+' : totalItems;
    } else if (badge) {
      badge.remove();
    }
    
    // Navegación click
    btn.onclick = (e) => {
        e.preventDefault();
        const inSubdir = window.location.pathname.includes('/products/');
        window.location.href = inSubdir ? '../cart.html' : 'cart.html';
    };
  });
}

// Inicializar ícono al cargar
document.addEventListener('DOMContentLoaded', () => {
  updateCartIcon();
});
