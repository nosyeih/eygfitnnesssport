/**
 * E&G FITNESS SPORT — product.js
 * Lógica completa de la página de detalle de producto (product_detail.html)
 * Depende de: utils.js
 */

/* ═══════════════════════════════════════════════════════════════════════════
   ESTADO GLOBAL
   ═══════════════════════════════════════════════════════════════════════════ */
let product           = null;
let allProducts       = [];
let currentImgIdx     = 0;
let quantity          = 1;
let selectedVariantId = null;

/** Ruta base para imágenes locales (desde /products/ hacia /img/) */
const IMG_BASE = '../';

/* ═══════════════════════════════════════════════════════════════════════════
   INICIALIZACIÓN
   ═══════════════════════════════════════════════════════════════════════════ */
async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));

  if (!id) {
    window.location.href = '../store.html';
    return;
  }

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
    if (notFound) notFound.classList.remove('hidden');
    return;
  }

  renderProduct();
  renderRelated();
  if (main) main.classList.remove('hidden');
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER DEL PRODUCTO
   ═══════════════════════════════════════════════════════════════════════════ */
function renderProduct() {
  const p = product;
  const siteDomain = 'https://eygfitnnesssport.com';

  // ── SEO HYDRATION ──────────────────────────────────────────────────────────
  
  // 1. Dynamic Title
  document.title = `${p.model} - ${p.name} | E&G Fitness Sport Perú`;

  // 2. Dynamic Meta Description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', p.description);

  // 3. Open Graph Metadata
  updateMetaTag('property', 'og:title', `${p.name} - ${p.model} | E&G Fitness`);
  updateMetaTag('property', 'og:description', p.description);
  updateMetaTag('property', 'og:url', `${siteDomain}/products/product_detail.html?id=${p.id}`);
  if (p.images && p.images.length > 0) {
    updateMetaTag('property', 'og:image', `${siteDomain}/${p.images[0]}`);
  }

  // 4. Canonical Tag
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', `${siteDomain}/products/product_detail.html?id=${p.id}`);

  // 5. JSON-LD Product Schema
  injectProductSchema(p, siteDomain);

  // ── UI RENDERING ────────────────────────────────────────────────────────────

  // Título e Identidad
  setText('productSerie', p.series);
  setText('productBrand', p.brand);
  setText('productName', `${p.model} - ${p.name}`);

  // Breadcrumb
  setText('bcCategory', p.category);
  const bcCat = document.getElementById('bcCategory');
  if (bcCat) {
    bcCat.href = `../store.html?cat=${encodeURIComponent(p.category)}`;
    bcCat.onclick = (e) => {
        e.preventDefault();
        location.href = bcCat.href;
    };
  }
  setText('bcModel', p.model);

  // Rating
  const starsHTML  = renderStars(p.rating, 'stars-sm');
  setHTML('productRating', starsHTML);
  setText('productReviews', `${p.rating} (${p.reviews} reseñas)`);

  // Precio Base
  setText('productPrice', formatPrice(p.price).replace('S/ ', ''));
  const discount = calcDiscount(p.price, p.originalPrice);
  if (discount > 0) {
    const oldPriceEl = document.getElementById('productOldPrice');
    if (oldPriceEl) {
        oldPriceEl.textContent = formatPrice(p.originalPrice);
        oldPriceEl.classList.remove('hidden');
    }
  }

  // Stock
  const stockEl = document.getElementById('productStock');
  if (stockEl) {
    stockEl.innerHTML = p.inStock
      ? `<span class="stock-in"><span class="material-symbols-outlined" style="font-size:16px">check_circle</span>En stock</span>`
      : `<span class="stock-out"><span class="material-symbols-outlined" style="font-size:16px">cancel</span>Agotado temporalmente</span>`;
  }

  // Descripción
  setText('productDesc', p.description);

  // Variantes
  renderVariants();

  // Regalos
  renderGifts();

  // Spec chips (máx 4)
  renderSpecChips(p.specs);

  // Specs en accordion
  renderSpecsList('specsTable', p.specs);

  // Galería
  renderGallery(p.images);

  // Actualizar botones de compra
  updateCartContext();

  // Limpiar esqueletos
  document.querySelectorAll('.skeleton').forEach(el => {
    el.classList.remove('skeleton', 'w-[80%]', 'w-24', 'w-20', 'w-16', 'w-32', 'w-full', 'h-4', 'h-12', 'h-20', 'rounded');
  });
}

function updateCartContext() {
  const p = product;
  
  // Actualizar todos los botones de "Añadir al Carrito" (pueden haber varios en móvil/escritorio)
  document.querySelectorAll('#addToCartBtn').forEach(btn => {
    if (!p.inStock) {
      btn.disabled = true;
      btn.classList.add('opacity-40', 'cursor-not-allowed');
    } else {
      btn.disabled = false;
      btn.classList.remove('opacity-40', 'cursor-not-allowed');
      btn.onclick = () => window.addToGlobalCart(p, quantity, selectedVariantId);
    }
  });

  // Actualizar todos los botones de "Comprar Ahora"
  document.querySelectorAll('#buyNowBtn').forEach(btn => {
    if (!p.inStock) {
      btn.disabled = true;
      btn.classList.add('opacity-40', 'cursor-not-allowed');
    } else {
      btn.disabled = false;
      btn.classList.remove('opacity-40', 'cursor-not-allowed');
      btn.onclick = () => {
        window.addToGlobalCart(p, quantity, selectedVariantId);
        location.href = '../cart.html';
      };
    }
  });
}

/* ─── Variantes ── */
function renderVariants() {
  const container = document.getElementById('productVariants');
  if (!container) return;

  if (product.type !== 'variable' || !product.variants?.length) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  selectedVariantId = product.variants[0].id; // Primero por defecto

  container.innerHTML = `
    <span class="text-[10px] text-neutral-500 uppercase tracking-widest font-label font-bold mb-2 block">Seleccionar ${product.variantType || 'opción'}</span>
    <div class="flex flex-wrap gap-2">
      ${product.variants.map(v => `
        <button 
          onclick="setVariant('${v.id}')" 
          id="btn-variant-${v.id}"
          class="variant-chip ${v.id === selectedVariantId ? 'active' : ''}"
        >
          ${v.label}
        </button>
      `).join('')}
    </div>
  `;
  
  setVariant(selectedVariantId);
}

window.setVariant = function(id) {
  selectedVariantId = id;
  const v = product.variants.find(x => x.id === id);
  if (!v) return;

  // Actualizar precio en UI
  setText('productPrice', formatPrice(v.price).replace('S/ ', ''));
  
  const oldPriceEl = document.getElementById('productOldPrice');
  if (oldPriceEl) {
      if (v.originalPrice && v.originalPrice > v.price) {
        oldPriceEl.textContent = formatPrice(v.originalPrice);
        oldPriceEl.classList.remove('hidden');
      } else {
        oldPriceEl.classList.add('hidden');
      }
  }

  // Actualizar chip activo
  document.querySelectorAll('.variant-chip').forEach(btn => {
    btn.classList.toggle('active', btn.id === `btn-variant-${id}`);
  });

  // Re-vincular callbacks de botones con la nueva variante
  updateCartContext();
}

/* ─── Regalos ── */
function renderGifts() {
  const container = document.getElementById('productGifts');
  const list = document.getElementById('giftsList');
  if (!container || !list) return;

  if (!product.gifts || !product.gifts.length) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  list.innerHTML = product.gifts.map(gift => `
    <li class="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300 font-medium">
      <span class="material-symbols-outlined text-[#fbf008]" style="font-size:14px">check_circle</span>
      ${gift}
    </li>
  `).join('');
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
    thumbsEl.classList.remove('hidden');
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

  container.onmousemove = (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = `${x}% ${y}%`;
    img.style.transform = 'scale(2.2)';
  };

  container.onmouseleave = () => {
    img.style.transformOrigin = 'center center';
    img.style.transform = 'scale(1)';
  };
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

  // Counter opcional
  const counter = document.getElementById('imgCounter');
  if (counter) counter.textContent = `${idx + 1} / ${images.length}`;

  // Active thumb
  document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
}

window.nextImage = () => navigateImg(1);
window.prevImage = () => navigateImg(-1);

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
  
  if (related.length < 4) {
    const others = allProducts.filter(p => p.id !== product.id && !related.find(r => r.id === p.id));
    related.push(...others.slice(0, 4 - related.length));
  }

  grid.innerHTML = related.slice(0, 4).map(p => {
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
          <h4 class="font-headline font-bold text-lg tracking-tight leading-tight text-neutral-900 dark:text-neutral-100 line-clamp-1">${p.name}</h4>
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
window.updateQty = function(delta) {
  quantity = Math.max(1, Math.min(10, quantity + delta));
  const el = document.getElementById('qtyValue');
  if (el) el.textContent = quantity;
}

window.shareProduct = function() {
  if (navigator.share) {
    navigator.share({ title: `${product.model} | E&G FITNNES SPORT`, url: location.href });
  } else {
    navigator.clipboard.writeText(location.href).then(() =>
      showToast('Enlace copiado al portapapeles', 'dark')
    );
  }
}

window.toggleAccordion = function(btn) {
  const content = btn.nextElementSibling;
  const isOpen  = content.classList.contains('open');
  content.classList.toggle('open', !isOpen);
  btn.classList.toggle('is-open', !isOpen);
  btn.setAttribute('aria-expanded', !isOpen);
  
  const icon = btn.querySelector('.acc-icon');
  if (icon) icon.textContent = isOpen ? 'add' : 'remove';
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
   SEO HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function updateMetaTag(attr, value, content) {
  let el = document.querySelector(`meta[${attr}="${value}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function injectProductSchema(p, domain) {
  const oldSchema = document.getElementById('product-schema');
  if (oldSchema) oldSchema.remove();

  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": p.name,
    "image": p.images.map(img => `${domain}/${img.startsWith('/') ? img.substring(1) : img}`),
    "description": p.description,
    "sku": p.model,
    "brand": { "@type": "Brand", "name": p.brand },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "PEN",
      "price": p.price,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": { "@type": "Organization", "name": "E&G Fitness Sport" }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": p.rating,
      "reviewCount": p.reviews
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": `${domain}/index.html` },
      { "@type": "ListItem", "position": 2, "name": "Tienda", "item": `${domain}/store.html` },
      { "@type": "ListItem", "position": 3, "name": p.category, "item": `${domain}/store.html?cat=${encodeURIComponent(p.category)}` },
      { "@type": "ListItem", "position": 4, "name": p.name, "item": window.location.href }
    ]
  };

  const script = document.createElement('script');
  script.id = 'product-schema';
  script.type = 'application/ld+json';
  script.text = JSON.stringify([productSchema, breadcrumbSchema]);
  document.head.appendChild(script);
}

/* ═══════════════════════════════════════════════════════════════════════════
   EVENTOS GLOBALES
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  navigateImg(-1);
  if (e.key === 'ArrowRight') navigateImg(1);
});

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', init);
