/**
 * E&G FITNESS SPORT — store.js
 * Lógica completa de la página de tienda (store.html)
 * Depende de: utils.js
 */

/* ═══════════════════════════════════════════════════════════════════════════
   ESTADO GLOBAL
   ═══════════════════════════════════════════════════════════════════════════ */
let allProducts = [];
let currentGridCols = 3;

const state = {
  priceMin:   0,
  priceMax:   5000,
  categories: new Set(),
  brands:     new Set(),
  series:     new Set(),
  genders:    new Set(),
  inStock:    false,
  onSale:     false,
  minRating:  0,
  search:     '',
  sort:       'default',
};

/* ═══════════════════════════════════════════════════════════════════════════
   CARGA DE DATOS
   ═══════════════════════════════════════════════════════════════════════════ */
async function loadProducts() {
  try {
    const data = await fetchProducts('./products/products.json');
    allProducts = data.products;
    buildFilters(data);
    applyURLParams();
    applyFilters();
  } catch (e) {
    console.error('[Store] No se pudo cargar products.json:', e);
    document.getElementById('productsGrid').innerHTML =
      '<p class="col-span-full text-center text-neutral-600 py-16 font-label">Error cargando productos.</p>';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTRUCCIÓN DE FILTROS
   ═══════════════════════════════════════════════════════════════════════════ */
function buildFilters(data) {
  // Render desktop
  renderCheckGroup('categoryFilters', data.categories, 'cat');
  renderCheckGroup('brandFilters',    data.brands,     'brand');
  renderCheckGroup('seriesFilters',   data.series,     'series');
  renderGenderGroup('genderFilters');
  renderAvailabilityGroup('availabilityFilters');
  renderRatingGroup('ratingFilters');

  // Render mobile
  renderCheckGroup('categoryFiltersMobile', data.categories, 'cat');
  renderCheckGroup('brandFiltersMobile',    data.brands,     'brand');
  renderCheckGroup('seriesFiltersMobile',   data.series,     'series');
  renderGenderGroup('genderFiltersMobile');
  renderAvailabilityGroup('availabilityFiltersMobile');
  renderRatingGroup('ratingFiltersMobile');
}

/**
 * Genera un grupo de checkboxes custom para el sidebar.
 * @param {string}   containerId
 * @param {string[]} items
 * @param {string}   type  — 'cat' | 'brand' | 'series'
 */
function renderCheckGroup(containerId, items, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = items.map(item => {
    const id  = `${type}_${slugify(item)}`;
    const cnt = countFor(type, item);
    return `
      <button
        role="checkbox"
        aria-checked="false"
        data-type="${type}"
        data-value="${item}"
        id="${id}"
        class="filter-label w-full text-left"
        onclick="toggleFilter(this)"
      >
        <span class="filter-indicator" aria-hidden="true"></span>
        <span>${item}</span>
        <span class="filter-count">${cnt}</span>
      </button>`;
  }).join('');
}

function renderGenderGroup(containerId) {
  const genders = [
    { value: 'unisex',    label: 'Unisex',   icon: 'person' },
    { value: 'masculino', label: 'Hombres',  icon: 'man'    },
    { value: 'femenino',  label: 'Mujeres',  icon: 'woman'  },
  ];
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = genders.map(g => {
    const cnt = countFor('gender', g.value);
    return `
      <button
        role="checkbox"
        aria-checked="false"
        data-type="gender"
        data-value="${g.value}"
        id="gender_${g.value}"
        class="filter-label w-full text-left"
        onclick="toggleFilter(this)"
      >
        <span class="filter-indicator" aria-hidden="true"></span>
        <span class="material-symbols-outlined" style="font-size:15px">${g.icon}</span>
        <span>${g.label}</span>
        <span class="filter-count">${cnt}</span>
      </button>`;
  }).join('');
}

function renderAvailabilityGroup(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const items = [
    { id: 'inStock', label: 'Solo en stock', icon: 'inventory_2' },
    { id: 'onSale',  label: 'En oferta',     icon: 'local_offer'  },
  ];
  container.innerHTML = items.map(item => `
    <button
      role="checkbox"
      aria-checked="false"
      data-type="${item.id}"
      data-value="true"
      id="avail_${item.id}"
      class="filter-label w-full text-left"
      onclick="toggleAvailability(this, '${item.id}')"
    >
      <span class="filter-indicator" aria-hidden="true"></span>
      <span class="material-symbols-outlined" style="font-size:15px">${item.icon}</span>
      <span>${item.label}</span>
    </button>`).join('');
}

function renderRatingGroup(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const ratings = [4.5, 4.0, 3.5, 3.0];
  container.innerHTML = ratings.map(r => `
    <button
      role="radio"
      aria-checked="false"
      data-rating="${r}"
      class="filter-label w-full text-left"
      onclick="setRating(this, ${r})"
    >
      <span class="filter-indicator radio" aria-hidden="true"></span>
      ${renderStars(r, 'stars-sm')}
      <span style="font-size:11px; color:#484831;">& más</span>
    </button>`).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   EVENTOS DE FILTRO
   ═══════════════════════════════════════════════════════════════════════════ */
const typeToSet = { cat: 'categories', brand: 'brands', series: 'series', gender: 'genders' };

function toggleFilter(btn) {
  const { type, value } = btn.dataset;
  const setKey = typeToSet[type];
  if (!setKey) return;

  const isChecked = btn.getAttribute('aria-checked') === 'true';
  const newState = !isChecked;

  // Sincronizar todos los botones iguales (Desktop + Mobile)
  const allBtns = document.querySelectorAll(`[data-type="${type}"][data-value="${value}"]`);
  allBtns.forEach(b => {
    b.setAttribute('aria-checked', String(newState));
    b.classList.toggle('is-checked', newState);
  });

  if (newState) state[setKey].add(value);
  else         state[setKey].delete(value);

  // Si se cambió categoría, sincronizar tabs
  if (type === 'cat') syncCategoryTabs();

  applyFilters();
  updateActiveChips();
}

function toggleAvailability(btn, field) {
  const isChecked = btn.getAttribute('aria-checked') === 'true';
  const newState = !isChecked;

  const allBtns = document.querySelectorAll(`[data-type="${field}"]`);
  allBtns.forEach(b => {
    b.setAttribute('aria-checked', String(newState));
    b.classList.toggle('is-checked', newState);
  });

  state[field] = newState;
  applyFilters();
  updateActiveChips();
}

function setRating(btn, val) {
  const ratings = document.querySelectorAll('[data-rating]');
  const isSelected = btn.getAttribute('aria-checked') === 'true';
  const newState = !isSelected;

  // Desmarcar todos primero
  ratings.forEach(b => {
    b.setAttribute('aria-checked', 'false');
    b.classList.remove('is-checked');
  });

  if (newState) {
    const matching = document.querySelectorAll(`[data-rating="${val}"]`);
    matching.forEach(b => {
      b.setAttribute('aria-checked', 'true');
      b.classList.add('is-checked');
    });
    state.minRating = val;
  } else {
    state.minRating = 0;
  }
  applyFilters();
}

/* ── Price range ── */
function updatePriceRange() {
  syncPriceUI('sliderMin', 'sliderMax', 'priceMin', 'priceMax', 'priceMinInput', 'priceMaxInput');
  applyFilters();
}

function updatePriceRangeMobile() {
  syncPriceUI('sliderMinMobile', 'sliderMaxMobile', 'priceMinMobile', 'priceMaxMobile', null, null);
  applyFilters();
}

/** Helper para sincronizar inputs de precio */
function syncPriceUI(sMinId, sMaxId, lMinId, lMaxId, iMinId, iMaxId) {
  let min = parseInt(document.getElementById(sMinId).value);
  let max = parseInt(document.getElementById(sMaxId).value);
  if (min > max - 100) { min = max - 100; document.getElementById(sMinId).value = min; }

  // Actualizar labels desktop
  if(document.getElementById('priceMin')) document.getElementById('priceMin').textContent = min.toLocaleString();
  if(document.getElementById('priceMax')) document.getElementById('priceMax').textContent = max.toLocaleString();
  
  // Actualizar labels mobile
  if(document.getElementById('priceMinMobile')) document.getElementById('priceMinMobile').textContent = min.toLocaleString();
  if(document.getElementById('priceMaxMobile')) document.getElementById('priceMaxMobile').textContent = max.toLocaleString();
  
  // Sincronizar sliders si no son los que dispararon
  ['sliderMin', 'sliderMinMobile'].forEach(id => {
    const el = document.getElementById(id);
    if(el && el.id !== sMinId) el.value = min;
  });
  ['sliderMax', 'sliderMaxMobile'].forEach(id => {
    const el = document.getElementById(id);
    if(el && el.id !== sMaxId) el.value = max;
  });

  // Actualizar inputs numericos (solo desktop por ahora)
  if(iMinId && document.getElementById(iMinId)) document.getElementById(iMinId).value = min;
  if(iMaxId && document.getElementById(iMaxId)) document.getElementById(iMaxId).value = max;
  if(sMinId !== 'sliderMin' && document.getElementById('priceMinInput')) document.getElementById('priceMinInput').value = min;
  if(sMaxId !== 'sliderMax' && document.getElementById('priceMaxInput')) document.getElementById('priceMaxInput').value = max;

  state.priceMin = min;
  state.priceMax = max;
}

function syncFromInputs() {
  let min = parseInt(document.getElementById('priceMinInput').value) || 0;
  let max = parseInt(document.getElementById('priceMaxInput').value) || 5000;
  min = Math.max(0, Math.min(min, 4900));
  max = Math.max(min + 1, Math.min(max, 5000));
  
  document.getElementById('sliderMin').value = min;
  document.getElementById('sliderMax').value = max;
  
  syncPriceUI('sliderMin', 'sliderMax', 'priceMin', 'priceMax', 'priceMinInput', 'priceMaxInput');
  applyFilters();
}

/* ── Category tabs ── */
document.addEventListener('DOMContentLoaded', () => {
  const catTabs = document.getElementById('catTabs');
  if (catTabs) {
    catTabs.addEventListener('click', e => {
      const btn = e.target.closest('.cat-tab');
      if (!btn) return;
      const cat = btn.dataset.cat;

      catTabs.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');

      state.categories.clear();
      if (cat !== 'all') state.categories.add(cat);

      // Sincronizar checkboxes de categoría
      document.querySelectorAll('[data-type="cat"]').forEach(cb => {
        const match = cb.dataset.value === cat;
        cb.setAttribute('aria-checked', String(match));
        cb.classList.toggle('is-checked', match);
      });

      applyFilters();
      updateActiveChips();
    });
  }

  // Search
  ['searchDesktop', 'searchMobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', function () {
      state.search = this.value.toLowerCase().trim();
      ['searchDesktop', 'searchMobile'].forEach(oid => {
        const o = document.getElementById(oid);
        if (o && o !== this) o.value = this.value;
      });
      applyFilters();
    });
  });
});

function syncCategoryTabs() {
  const cat = state.categories.size === 1 ? [...state.categories][0] : 'all';
  document.querySelectorAll('.cat-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.cat === cat ||
      (cat === 'all' && t.dataset.cat === 'all'));
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   APLICAR FILTROS
   ═══════════════════════════════════════════════════════════════════════════ */
function applyFilters() {
  state.sort = document.getElementById('sortSelect')?.value || 'default';

  let filtered = allProducts.filter(p => {
    if (p.price < state.priceMin || p.price > state.priceMax) return false;
    if (state.categories.size && !state.categories.has(p.category)) return false;
    if (state.brands.size     && !state.brands.has(p.brand))        return false;
    if (state.series.size     && !state.series.has(p.series))       return false;
    if (state.genders.size    && !state.genders.has(p.gender))      return false;
    if (state.inStock  && !p.inStock)                                return false;
    if (state.onSale   && !(p.originalPrice > p.price))              return false;
    if (state.minRating && p.rating < state.minRating)               return false;
    if (state.search) {
      const q = state.search;
      if (![p.name, p.model, p.category, p.brand, ...(p.tags||[])].some(s => s.toLowerCase().includes(q)))
        return false;
    }
    return true;
  });

  filtered = sortProducts(filtered, state.sort);
  renderProducts(filtered);

  const count = filtered.length;
  const countEl = document.getElementById('resultCount');
  const mobileCountEl = document.getElementById('mobileCount');
  if (countEl) countEl.textContent = count;
  if (mobileCountEl) mobileCountEl.textContent = count;

  // No results
  const noRes = document.getElementById('no-results');
  const grid  = document.getElementById('productsGrid');
  if (noRes && grid) {
    if (count === 0) {
      noRes.classList.add('show');
      grid.style.display = 'none';
    } else {
      noRes.classList.remove('show');
      grid.style.display = '';
    }
  }
}

function sortProducts(products, sort) {
  const arr = [...products];
  switch (sort) {
    case 'price-asc':  return arr.sort((a, b) => a.price - b.price);
    case 'price-desc': return arr.sort((a, b) => b.price - a.price);
    case 'rating':     return arr.sort((a, b) => b.rating - a.rating);
    case 'name':       return arr.sort((a, b) => a.name.localeCompare(b.name));
    default:           return arr.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER DE PRODUCTOS
   ═══════════════════════════════════════════════════════════════════════════ */
function renderProducts(products) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = products.map(p => renderCard(p)).join('');
}

function renderCard(p) {
  const discount   = calcDiscount(p.price, p.originalPrice);
  const badgeClass = getBadgeClass(p.badge);
  const stars      = renderStars(p.rating, 'stars-sm');
  const img        = resolveImgSrc(p.images?.[0], '');

  return `
  <article
    class="product-card group cursor-pointer bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
    onclick="location.href='products/product_detail.html?id=${p.id}'"
    tabindex="0"
    role="link"
    aria-label="${p.name}"
    onkeydown="if(event.key==='Enter') this.click()"
  >
    <div class="relative aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-800/50 p-4">
      <img src="${img}" alt="${p.name} - ${p.model} | E&G Fitness Sport Perú" loading="lazy" decoding="async" class="card-img w-full h-full object-contain"
        onerror="this.src='https://placehold.co/400x400/1c1b1b/484831?text=${encodeURIComponent(p.model)}'"/>

      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

      ${p.badge ? `<span class="badge ${badgeClass} absolute top-4 left-4">${p.badge}</span>` : ''}
      ${discount > 0 ? `<span class="badge badge-discount absolute top-4 right-4">-${discount}%</span>` : ''}
      ${!p.inStock ? `
        <div class="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span class="text-[10px] font-label uppercase tracking-[0.2em] text-neutral-400 border border-neutral-600 px-3 py-1">Agotado</span>
        </div>` : ''}

      ${p.inStock ? `
        <div class="card-add-btn absolute bottom-4 left-4 right-4">
          <button
            class="w-full py-3 bg-primary-container text-on-primary text-[10px] font-headline font-bold tracking-[0.15em] hover:bg-yellow-300 transition-colors"
            onclick="event.stopPropagation(); ${p.type === 'variable' ? `location.href='products/product_detail.html?id=${p.id}'` : `addToCart(${p.id})`}"
          >${p.type === 'variable' ? 'VER OPCIONES' : 'AGREGAR AL CARRITO'}</button>
        </div>` : ''}
    </div>

    <div class="p-5">
      <p class="text-[9px] text-neutral-500 uppercase tracking-[0.18em] font-label mb-1">${p.category} · ${p.brand}</p>
      <h3 class="font-headline font-bold text-base leading-tight tracking-tight text-neutral-900 dark:text-neutral-100 line-clamp-2 mb-2">${p.name}</h3>
      <div class="flex items-center gap-2 mb-3">
        ${stars}
        <span class="text-[10px] text-neutral-500 font-label">${p.rating} (${p.reviews})</span>
      </div>
      <div class="flex items-baseline gap-3">
        <span class="font-headline font-bold text-xl text-neutral-900 dark:text-neutral-100">
          ${p.type === 'variable' ? '<span class="text-[10px] font-normal text-neutral-500 mr-1 uppercase">Desde</span>' : ''}
          ${formatPrice(p.price)}
        </span>
        ${p.originalPrice && p.originalPrice > p.price
          ? `<span class="text-neutral-600 line-through text-sm font-light font-label">${formatPrice(p.originalPrice)}</span>`
          : ''}
      </div>
    </div>
  </article>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACTIVE CHIPS
   ═══════════════════════════════════════════════════════════════════════════ */
function updateActiveChips() {
  const bar       = document.getElementById('activeFiltersBar');
  const chipsEl   = document.getElementById('activeChips');
  if (!bar || !chipsEl) return;

  const chips = [];

  state.categories.forEach(v => chips.push({ label: v, clear: () => clearFilterValue('cat', v) }));
  state.brands.forEach(v     => chips.push({ label: v, clear: () => clearFilterValue('brand', v) }));
  state.genders.forEach(v    => chips.push({ label: v, clear: () => clearFilterValue('gender', v) }));
  state.series.forEach(v     => chips.push({ label: v, clear: () => clearFilterValue('series', v) }));

  if (chips.length === 0) { bar.classList.add('hidden'); return; }

  bar.classList.remove('hidden');
  chipsEl.innerHTML = chips.map((c, i) => `
    <span class="filter-chip">
      ${c.label}
      <button class="filter-chip-close" onclick="removeChip(${i})" aria-label="Quitar ${c.label}">
        <span class="material-symbols-outlined" style="font-size:12px">close</span>
      </button>
    </span>`).join('');

  chipsEl._chips = chips;
}

function removeChip(idx) {
  const chips = document.getElementById('activeChips')?._chips;
  if (chips?.[idx]) chips[idx].clear();
}

function clearFilterValue(type, value) {
  const setKey = typeToSet[type];
  if (!setKey) return;
  state[setKey].delete(value);

  const allBtns = document.querySelectorAll(`[data-type="${type}"][data-value="${value}"]`);
  allBtns.forEach(btn => {
    btn.setAttribute('aria-checked', 'false');
    btn.classList.remove('is-checked');
  });

  syncCategoryTabs();
  applyFilters();
  updateActiveChips();
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIMPIAR TODOS LOS FILTROS
   ═══════════════════════════════════════════════════════════════════════════ */
function clearAllFilters() {
  ['categories','brands','series','genders'].forEach(k => state[k].clear());
  state.priceMin  = 0;
  state.priceMax  = 5000;
  state.minRating = 0;
  state.inStock   = false;
  state.onSale    = false;
  state.search    = '';

  document.querySelectorAll('.filter-label[role]').forEach(btn => {
    btn.setAttribute('aria-checked', 'false');
    btn.classList.remove('is-checked');
  });

  const sliderMin = document.getElementById('sliderMin');
  const sliderMax = document.getElementById('sliderMax');
  if (sliderMin) sliderMin.value = 500;
  if (sliderMax) sliderMax.value = 5000;
  document.getElementById('priceMin')?.textContent && (document.getElementById('priceMin').textContent = '500');
  document.getElementById('priceMax')?.textContent && (document.getElementById('priceMax').textContent = '5,000');
  document.getElementById('priceMinInput') && (document.getElementById('priceMinInput').value = 500);
  document.getElementById('priceMaxInput') && (document.getElementById('priceMaxInput').value = 5000);

  ['searchDesktop','searchMobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Reset category tabs
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.toggle('active', t.dataset.cat === 'all'));

  applyFilters();
  updateActiveChips();
}

/* ═══════════════════════════════════════════════════════════════════════════
   GRID VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function setGridView(cols) {
  currentGridCols = cols;
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const colMap = {
    2: 'grid grid-cols-1 sm:grid-cols-2 gap-6',
    3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
    4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6',
  };
  grid.className = colMap[cols] || colMap[3];
  grid.style.transition = 'all 0.3s';

  [2, 3, 4].forEach(c =>
    document.getElementById(`gridView${c}`)?.classList.toggle('active', c === cols)
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTROS COLAPSABLES
   ═══════════════════════════════════════════════════════════════════════════ */
function toggleSection(btn) {
  const content = btn.nextElementSibling;
  const isCollapsed = content.classList.contains('collapsed');
  content.classList.toggle('collapsed', !isCollapsed);
  btn.classList.toggle('collapsed', !isCollapsed);
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE FILTER DRAWER
   Sin clonar HTML — el sidebar desktop se oculta en mobile y se usa el drawer
   ═══════════════════════════════════════════════════════════════════════════ */
function openMobileFilters() {
  document.getElementById('filterDrawer')?.classList.add('open');
  document.getElementById('filterOverlay')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileFilters() {
  document.getElementById('filterDrawer')?.classList.remove('open');
  document.getElementById('filterOverlay')?.classList.remove('active');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════════════════════════════
   URL PARAMS
   ═══════════════════════════════════════════════════════════════════════════ */
function applyURLParams() {
  const cat = new URLSearchParams(window.location.search).get('cat');
  if (!cat) return;

  const tab = document.querySelector(`.cat-tab[data-cat="${cat}"]`);
  if (tab) {
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  }

  state.categories.add(cat);
  const btn = document.getElementById(`cat_${slugify(cat)}`);
  if (btn) { btn.setAttribute('aria-checked', 'true'); btn.classList.add('is-checked'); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CARRITO (demo)
   ═══════════════════════════════════════════════════════════════════════════ */
function addToCart(id) {
  const p = allProducts.find(x => x.id === id);
  if (p) {
    if (typeof window.addToGlobalCart === 'function') {
      window.addToGlobalCart(p, 1);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function countFor(type, value) {
  return allProducts.filter(p => {
    if (type === 'cat')    return p.category === value;
    if (type === 'brand')  return p.brand    === value;
    if (type === 'series') return p.series   === value;
    if (type === 'gender') return p.gender   === value;
    return false;
  }).length;
}

/* ═══════════════════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', loadProducts);
