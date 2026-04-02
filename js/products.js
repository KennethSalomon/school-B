import { Auth, Products, Orders } from '/supabase.js';

let allProducts = [];
let cart = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  // Vérifier l'authentification
  const user = await Auth.getUser();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // Gestionnaire de déconnexion
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await Auth.signOut();
  });

  // Charger les produits
  await loadProducts();

  // Configuration des contrôles
  setupSearch();
  setupFilters();
  setupCart();
});

async function loadProducts() {
  try {
    const products = await Products.getAll();
    allProducts = products;
    displayProducts(products);
  } catch (error) {
    console.error('Erreur chargement produits:', error);
    document.getElementById('products-grid').innerHTML = '<div class="no-products">Erreur lors du chargement des produits</div>';
  }
}

function displayProducts(products) {
  const grid = document.getElementById('products-grid');

  if (products.length === 0) {
    grid.innerHTML = '<div class="no-products">Aucun produit trouvé</div>';
    return;
  }

  grid.innerHTML = products.map(product => `
    <div class="product-card" data-id="${product.id}" data-category="${product.category}">
      <img src="${product.image_url || '/placeholder.jpg'}" alt="${product.name}" class="product-image">
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-description">${product.description}</p>
        <div class="product-footer">
          <span class="product-price">${product.product_variants[0]?.price || 0} FCFA</span>
          <button class="add-to-cart-btn" data-id="${product.id}">
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Gestionnaire d'ajout au panier
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const productId = btn.dataset.id;
      addToCart(productId, btn);
    });
  });
}

function setupSearch() {
  const searchInput = document.getElementById('product-search');
  const searchBtn = document.getElementById('search-btn');

  const performSearch = () => {
    const query = searchInput.value.toLowerCase().trim();
    let filteredProducts = allProducts;

    if (query) {
      filteredProducts = allProducts.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query)
      );
    }

    if (currentCategory !== 'all') {
      filteredProducts = filteredProducts.filter(product =>
        product.category === currentCategory
      );
    }

    displayProducts(filteredProducts);
  };

  searchInput.addEventListener('input', performSearch);
  searchBtn.addEventListener('click', performSearch);
}

function setupFilters() {
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Retirer la classe active
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      // Ajouter la classe active
      btn.classList.add('active');

      currentCategory = btn.dataset.category;
      filterProducts();
    });
  });
}

function filterProducts() {
  let filteredProducts = allProducts;

  if (currentCategory !== 'all') {
    filteredProducts = allProducts.filter(product =>
      product.category === currentCategory
    );
  }

  // Appliquer aussi la recherche si elle existe
  const query = document.getElementById('product-search').value.toLowerCase().trim();
  if (query) {
    filteredProducts = filteredProducts.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query)
    );
  }

  displayProducts(filteredProducts);
}

function addToCart(productId, button) {
  const product = allProducts.find(p => p.id == productId);
  if (!product) return;

  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.product_variants[0]?.price || 0,
      quantity: 1
    });
  }

  // Animation du bouton
  button.textContent = 'Ajouté ✓';
  button.classList.add('added');
  setTimeout(() => {
    button.textContent = 'Ajouter au panier';
    button.classList.remove('added');
  }, 1000);

  updateCartSummary();
}

function setupCart() {
  document.getElementById('view-cart-btn').addEventListener('click', () => {
    showCartModal();
  });

  // Modal
  document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('cart-modal').style.display = 'none';
  });

  document.getElementById('checkout-btn').addEventListener('click', async () => {
    try {
      const user = await Auth.getUser();
      const orderData = {
        user_id: user.id,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        status: 'pending'
      };

      await Orders.create(orderData);
      alert('Commande créée avec succès !');
      document.getElementById('cart-modal').style.display = 'none';
      cart = [];
      updateCartSummary();
    } catch (error) {
      console.error('Erreur commande:', error);
      alert('Erreur lors de la création de la commande');
    }
  });
}

function updateCartSummary() {
  const summary = document.getElementById('cart-summary');
  const count = document.getElementById('cart-count');
  const total = document.getElementById('cart-total');

  if (cart.length === 0) {
    summary.style.display = 'none';
    return;
  }

  summary.style.display = 'flex';
  count.textContent = `${cart.length} article(s)`;
  total.textContent = cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + ' FCFA';
}

function showCartModal() {
  const cartItems = document.getElementById('cart-items');
  const total = document.getElementById('modal-cart-total');

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div>
        <strong>${item.name}</strong><br>
        <small>Quantité: ${item.quantity}</small>
      </div>
      <span>${item.price * item.quantity} FCFA</span>
    </div>
  `).join('');

  total.textContent = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  document.getElementById('cart-modal').style.display = 'block';
}