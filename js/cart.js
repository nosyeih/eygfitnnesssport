/**
 * E&G FITNESS SPORT — cart.js
 * Gestiona la visualización del carrito y el checkout vía WhatsApp.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderCart();

  const checkoutBtn = document.getElementById('checkoutWhatsAppBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', proceedToWhatsApp);
  }
});

/**
 * Pinta cada item del carrito en la interfaz.
 */
function renderCart() {
  const cart = getCart(); // desde utils.js
  const container = document.getElementById('cartItemsContainer');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutWhatsAppBtn');

  if (!container || !subtotalEl || !totalEl) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="w-full text-center py-16 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 border-dashed transition-colors">
        <span class="material-symbols-outlined text-6xl text-neutral-300 dark:text-neutral-700 mb-4 block">remove_shopping_cart</span>
        <h3 class="font-headline text-xl font-bold text-neutral-900 dark:text-white mb-2">Tu carrito está vacío</h3>
        <p class="text-neutral-500 font-body text-sm mb-6">Parece que aún no has agregado nada.</p>
        <a href="store.html" class="inline-flex items-center justify-center p-4 bg-primary-fixed text-neutral-900 font-headline font-bold text-sm tracking-widest uppercase hover:brightness-95 transition-all">
          Ir a la tienda
        </a>
      </div>
    `;
    subtotalEl.textContent = 'S/ 0.00';
    totalEl.textContent = 'S/ 0.00';
    if(checkoutBtn) checkoutBtn.disabled = true;
    if(checkoutBtn) checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
    return;
  }

  if(checkoutBtn) checkoutBtn.disabled = false;
  if(checkoutBtn) checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');

  let total = 0;

  container.innerHTML = cart.map(item => {
    total += item.price * item.qty;
    const imgStr = resolveImgSrc(item.image, ''); 

    return `
      <div class="flex flex-col sm:flex-row gap-6 p-4 sm:p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 transition-colors">
        <!-- Imagen -->
        <div class="w-24 h-24 sm:w-32 sm:h-32 bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 cursor-pointer" onclick="location.href='products/product_detail.html?id=${item.id}'">
          <img src="${imgStr}" alt="${item.model}" class="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal" onerror="this.src='https://placehold.co/400x500/1c1b1b/484831?text=${encodeURIComponent(item.model)}'"/>
        </div>
        
        <!-- Info -->
        <div class="flex-1 flex flex-col justify-between">
          <div class="flex justify-between items-start gap-4">
            <div>
              <p class="text-[10px] text-neutral-500 uppercase tracking-widest font-label font-bold mb-1">${item.brand}</p>
              <h3 class="font-headline font-bold text-lg md:text-xl text-neutral-900 dark:text-white uppercase leading-tight tracking-tighter cursor-pointer hover:text-primary-fixed" onclick="location.href='products/product_detail.html?id=${item.id}'">
                ${item.model}
              </h3>
              ${item.extraInfo?.weight ? `<span class="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-400 font-label font-bold uppercase tracking-widest mt-1 inline-block">PESO: ${item.extraInfo.weight}</span>` : ''}
            </div>
            <button onclick="removeItem('${item.id}', '${item.variantId || ''}')" class="text-neutral-400 hover:text-red-500 transition-colors p-1" aria-label="Eliminar producto">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>

          <div class="flex justify-between items-end mt-4">
            <!-- Quantity Control -->
            <div class="flex items-center border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
              <button onclick="updateItemQty('${item.id}', '${item.variantId || ''}', -1)" class="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                <span class="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <div class="w-10 h-8 flex items-center justify-center font-headline font-bold text-sm text-neutral-900 dark:text-white border-l border-r border-neutral-200 dark:border-neutral-800">
                ${item.qty}
              </div>
              <button onclick="updateItemQty('${item.id}', '${item.variantId || ''}', 1)" class="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
                <span class="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
            
            <!-- Price -->
            <span class="font-headline font-bold text-xl md:text-2xl text-neutral-900 dark:text-white tracking-tighter">
              ${formatPrice(item.price * item.qty)}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  subtotalEl.textContent = formatPrice(total);
  totalEl.textContent = formatPrice(total);
}

/**
 * Actualiza la cantidad de un producto.
 */
window.updateItemQty = function(id, variantId, delta) {
  let cart = getCart();
  const vId = variantId === '' ? null : variantId;
  const index = cart.findIndex(i => i.id == id && i.variantId == vId);
  
  if (index > -1) {
    cart[index].qty += delta;
    if (cart[index].qty < 1) cart[index].qty = 1;
    saveCart(cart);
    renderCart();
  }
};

/**
 * Elimina un producto entero del carrito.
 */
window.removeItem = function(id, variantId) {
  let cart = getCart();
  const vId = variantId === '' ? null : variantId;
  cart = cart.filter(i => !(i.id == id && i.variantId == vId));
  saveCart(cart);
  renderCart();
  showToast('Producto eliminado del carrito', 'dark');
};

/**
 * Procesa el checkout armando el texto para la API de WhatsApp.
 */
function proceedToWhatsApp() {
  const cart = getCart();
  if (cart.length === 0) return;

  const phone = "51979497037"; // Número del usuario
  let text = "Hola *E&G FITNESS SPORT*, quisiera realizar un pedido desde la web:\n\n";
  text += "🏋️ *DETALLE DEL PEDIDO:*\n";
  text += "━━━━━━━━━━━━━━━━━━━━━\n\n";
  
  let total = 0;
  cart.forEach((item, i) => {
    total += item.price * item.qty;
    text += `*${i + 1}. ${item.model}*\n`;
    text += `   🔸 Marca: ${item.brand}\n`;
    if (item.extraInfo?.weight) {
        text += `   ⚖️ Peso: ${item.extraInfo.weight}\n`;
    }
    text += `   🔢 Cantidad: ${item.qty} ${item.qty > 1 ? 'unidades' : 'unidad'}\n`;
    text += `   💵 Subtotal: S/ ${(item.price * item.qty).toLocaleString('es-PE', {minimumFractionDigits:2})}\n\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 *TOTAL A PAGAR: S/ ${total.toLocaleString('es-PE', {minimumFractionDigits:2})}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += "📍 *Información adicional:*\n";
  text += "- Solicito confirmación de Stock.\n";
  text += "- Consultar costos de envío y armado.\n\n";
  text += "¡Quedo atento a su respuesta!";

  const waURL = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  window.open(waURL, '_blank');
}
