/**
 * E&G FITNESS SPORT — product.js
 * Lógica completa de la página de detalle de producto (product_detail.html)
 * Depende de: utils.js
 */

/* ═══════════════════════════════════════════════════════════════════════════
   ESTADO GLOBAL
   ═══════════════════════════════════════════════════════════════════════════ */
let product      = null;
let allProducts  = [];
let currentImgIdx = 0;
let quantity     = 1;

/** Ruta base para imágenes locales (desde /products/ hacia /img/) */
const IMG_BASE = '../';

/* ═══════════════════════════════════════════════════════════════════════════
   INICIALIZACIÓN
   ═══════════════════════════════════════════════════════════════════════════ */
async function init() {
  const id = parseInt(new URLSearchParams(window.location.search).get('id'));

  try {
    const data  = await fetchProducts('../products/products.json');
    allProducts = data.products;
    product     = allProducts.find(p => p.id === id) || null;
  } catch (e) {
    console.error('[Product] No se pudo cargar products.json:', e);
  }

  const loading  = document.getElementById('loadingState');
  const main     = document.getElementById('productMain');
  const notFound = document.getElementById('notFoundState');

  loading?.classList.add('hidden');

  if (!product) {
    notFound?.classList.remove('hidden');
    return;
  }

  renderProduct();
  renderRelated();
  main?.classList.remove('hidden');
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER DEL PRODUCTO
   ═══════════════════════════════════════════════════════════════════════════ */
function renderProduct() {
  const p = product;

  // Meta
  document.title = `${p.model} — ${p.name} | E&G FITNNES SPORT`;
  const metaDesc = document.getElementById('pageDesc');
  if (metaDesc) metaDesc.content = p.description;

  // Breadcrumb
  const breadCat   = document.getElementById('breadCat');
  const breadModel = document.getElementById('breadModel');
  if (breadCat) {
    breadCat.textContent = p.category;
    breadCat.onclick = () => { location.href = `../store.html?cat=${encodeURIComponent(p.category)}`; };
  }
  if (breadModel) breadModel.textContent = p.model;

  // Series label
  setText('seriesLabel', `${p.series} · ${p.brand}`);

// Badge
  if (p.badge) {
    const badgeClass = getBadgeClass(p.badge);
    setHTML('badgeContainer', `<span class="badge ${badgeClass}">${p.badge}</span>`);
  }

  // Título (ahora en IDs unificados en el HTML)
  setText('productSerie', p.series);
  setText('productBrand', p.brand);
  setText('productName', `${p.model} - ${p.name}`);

  // Breadcrumb category
  setText('bcCategory', p.category);
  const bcCat = document.getElementById('bcCategory');
  if (bcCat) bcCat.href = `../store.html?cat=${encodeURIComponent(p.category)}`;
  setText('bcModel', p.model);

  // Rating
  const starsHTML  = renderStars(p.rating, 'stars-sm');
  setHTML('productRating', starsHTML);
  setText('productReviews', `${p.rating} (${p.reviews} reseñas)`);

  // Precio
  setText('productPrice', formatPrice(p.price));
  const discount = calcDiscount(p.price, p.originalPrice);
  if (discount > 0) {
    setText('productOldPrice', formatPrice(p.originalPrice));
    show('productOldPrice');
  }

  // Stock
  const stockEl = document.getElementById('productStock');
  if (stockEl) {
    stockEl.innerHTML = p.inStock
      ? `<span class="stock-in"><span class="material-symbols-outlined" style="font-size:16px">check_circle</span>En stock</span>`
      : `<span class="stock-out"><span class="material-symbols-outlined" style="font-size:16px">cancel</span>Agotado temporalmente</span>`;
  }
  if (!p.inStock) {
    const addBtn = document.getElementById('addToCartBtn');
    if (addBtn) { addBtn.disabled = true; addBtn.classList.add('opacity-40','cursor-not-allowed'); }
  } else {
    const addBtn = document.getElementById('addToCartBtn');
    if (addBtn) addBtn.onclick = () => window.addToGlobalCart(p, window.quantity || 1);
    const buyBtn = document.getElementById('buyNowBtn');
    if (buyBtn) buyBtn.onclick = () => { window.addToGlobalCart(p, window.quantity || 1); location.href = '../cart.html'; };
  }

  // Descripción
  setText('productDesc', p.description);

  // Quitar la mancha difuminada skeleton de todas partes
  document.querySelectorAll('.skeleton').forEach(el => {
    el.classList.remove('skeleton', 'w-[80%]', 'w-24', 'w-20', 'w-16', 'w-32', 'w-full', 'h-4', 'h-12', 'h-20', 'rounded');
  });

  // Spec chips (máx 4)
  renderSpecChips(p.specs);

  // Specs en accordion
  renderSpecsList('specsTable', p.specs);

  // Galería
  renderGallery(p.images);
}

/* ─── Specs ── */
function renderSpecChips(specs) {
  const container = document.getElementById('specChipsContainer');
  if (!container || !specs) return;
  const keys = Object.keys(specs).slice(0, 4);
  container.innerHTML = keys.map(k => `
    <div class="spec-chip">
      <span class="spec-key">${formatSpecKey(k)}</span>
      <span class="spec-val">${specs[k]}</span>
    </div>`).join('');
}

function renderSpecsList(containerId, specs) {
  const container = document.getElementById(containerId);
  if (!container || !specs) return;
  container.innerHTML = Object.entries(specs).map(([k, v]) => `
    <div class="flex justify-between items-end border-b border-white/5 pb-3">
      <span class="text-neutral-500 text-xs font-label uppercase tracking-widest">${formatSpecKey(k)}</span>
      <span class="font-headline font-medium text-sm">${v}</span>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   GALERÍA
   ═══════════════════════════════════════════════════════════════════════════ */
function renderGallery(images) {
  if (!images?.length) return;
  setMainImage(0);

  const thumbsEl = document.getElementById('thumbsContainer');
  if (!thumbsEl) return;

  if (images.length > 1) {
    thumbsEl.innerHTML = images.map((src, i) => `
      <div class="thumb ${i === 0 ? 'active' : ''} aspect-square bg-neutral-100 dark:bg-neutral-800/50" id="thumb_${i}" onclick="setMainImage(${i})">
        <img src="${resolveImgSrc(src, IMG_BASE)}" alt="Vista ${i + 1}" loading="lazy" decoding="async"
          onerror="this.parentElement.style.display='none'"/>
      </div>`).join('');
  } else {
    thumbsEl.classList.add('hidden');
  }

  initImageZoom();
}

function initImageZoom() {
  const container = document.getElementById('mainImgContainer');
  const img = document.getElementById('mainImg');
  if (!container || !img) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = 'scale(2.2)'; // 2.2x zoom magnifier effect
  });

  container.addEventListener('mouseleave', () => {
    img.style.transformOrigin = 'center center';
    img.style.transform = 'scale(1)';
  });
}

function setMainImage(idx) {
  const images = product?.images;
  if (!images || idx < 0 || idx >= images.length) return;
  currentImgIdx = idx;

  const mainImg = document.getElementById('mainImg');
  if (!mainImg) return;

  mainImg.classList.add('fade');
  const tempImg = new Image();
  tempImg.onload = () => {
    mainImg.src = tempImg.src;
    mainImg.alt = `${product.model} — Vista ${idx + 1}`;
    mainImg.classList.remove('fade');
  };
  tempImg.onerror = () => {
    mainImg.src = `https://placehold.co/800x600/1c1b1b/484831?text=${encodeURIComponent(product.model)}`;
    mainImg.classList.remove('fade');
  };
  tempImg.src = resolveImgSrc(images[idx], IMG_BASE);

  // Counter
  const counter = document.getElementById('imgCounter');
  if (counter) counter.textContent = `${idx + 1} / ${images.length}`;

  // Active thumb
  document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
}

function navigateImg(dir) {
  const images = product?.images;
  if (!images) return;
  let next = currentImgIdx + dir;
  if (next < 0) next = images.length - 1;
  if (next >= images.length) next = 0;
  setMainImage(next);
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCTOS RELACIONADOS
   ═══════════════════════════════════════════════════════════════════════════ */
function renderRelated() {
  const grid = document.getElementById('relatedGrid');
  if (!grid) return;

  let related = allProducts.filter(p =>
    p.id !== product.id && (p.category === product.category || p.brand === product.brand)
  );
  if (related.length < 3) {
    const others = allProducts.filter(p => p.id !== product.id && !related.find(r => r.id === p.id));
    related.push(...others.slice(0, 3 - related.length));
  }

  grid.innerHTML = related.slice(0, 3).map(p => {
    const img = resolveImgSrc(p.images?.[0], IMG_BASE);
    return `
    <article class="rel-card group" onclick="location.href='product_detail.html?id=${p.id}'" role="link" tabindex="0" aria-label="${p.name}">
      <div class="aspect-square bg-neutral-100 dark:bg-neutral-800/50 overflow-hidden mb-5 p-4">
        <img src="${img}" alt="${p.name}" class="rel-img w-full h-full object-contain"
          onerror="this.src='https://placehold.co/400x400/1c1b1b/484831?text=${encodeURIComponent(p.model)}'"/>
      </div>
      <div class="flex justify-between items-start">
        <div class="flex-1 min-w-0">
          <p class="text-[9px] text-neutral-500 uppercase tracking-widest mb-1 font-label">${p.category} · ${p.brand}</p>
          <h4 class="font-headline font-bold text-lg tracking-tight leading-tight text-neutral-900 dark:text-neutral-100">${p.name}</h4>
          <div class="mt-2">${renderStars(p.rating, 'stars-sm')}</div>
        </div>
        <span class="font-headline font-medium font-bold whitespace-nowrap ml-4 text-base text-neutral-900 dark:text-neutral-100">${formatPrice(p.price)}</span>
      </div>
    </article>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTERACCIONES
   ═══════════════════════════════════════════════════════════════════════════ */
function changeQty(delta) {
  quantity = Math.max(1, Math.min(10, quantity + delta));
  const el = document.getElementById('qtyDisplay');
  if (el) el.textContent = quantity;
}

// addToCart delegado a utils.js

function shareProduct() {
  if (navigator.share) {
    navigator.share({ title: `${product.model} | E&G FITNNES SPORT`, url: location.href });
  } else {
    navigator.clipboard.writeText(location.href).then(() =>
      showToast('Enlace copiado al portapapeles', 'dark')
    );
  }
}

function toggleAcc(btn) {
  const content = btn.nextElementSibling;
  const isOpen  = content.classList.contains('open');
  content.classList.toggle('open', !isOpen);
  btn.classList.toggle('is-open', !isOpen);
}

/* ═══════════════════════════════════════════════════════════════════════════
   DOM HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function show(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

/* ═══════════════════════════════════════════════════════════════════════════
   EVENTOS GLOBALES
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  navigateImg(-1);
  if (e.key === 'ArrowRight') navigateImg(1);
});

/* ═══════════════════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);
