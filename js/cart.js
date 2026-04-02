// Exemple de gestion du panier
let cart = [];

function addToCart(item) {
  cart.push(item);
  updateCartUI();
}

function updateCartUI() {
  const cartItems = document.getElementById('cart-items');
  cartItems.innerHTML = cart.map(item =>
    `<div class="cart-item">${item.name} - ${item.price} FCFA</div>`
  ).join('');
}

// Exemple d'utilisation
addToCart({ name: 'Cahier 96 pages', price: 1500 });
addToCart({ name: 'Stylo bleu', price: 500 });