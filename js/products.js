import { authService } from '/js/services/auth.service.js';
import { productService } from '/js/services/product.service.js';
import { cartService } from '/js/services/cart.service.js';
import { NotificationService } from '/js/services/api.service.js';

let allProducts = [];
let currentCart = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  // Vérifier l'authentification
  const isAuth = authService.isAuthenticated();
  if (!isAuth) {
    window.location.href = '/pages/auth.html';
    return;
  }

  // Gestionnaire de déconnexion
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await authService.signOut();
    });
  }

  // Charger les produits
  await loadProducts();

  // Charger le panier
  await loadCart();

  // Configuration des contrôles
  setupSearch();
  setupFilters();
  setupCart();
});

async function loadProducts() {
  try {
    allProducts = await productService.getAllProducts();
    displayProducts(allProducts);
  } catch (error) {
    console.error('Erreur chargement produits:', error);
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = '<div class="no-products">Erreur lors du chargement des produits</div>';
    }
    NotificationService.error('Erreur lors du chargement des produits');
  }
}

async function loadCart() {
  try {
    currentCart = await cartService.getCart();
    updateCartSummary();
  } catch (error) {
    console.error('Erreur chargement panier:', error);
    currentCart = [];
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
  if (!product) {
    NotificationService.error('Produit non trouvé');
    return;
  }

  try {
    // Ajouter au panier via cartService
    cartService.addToCart({
      id: product.id,
      name: product.name,
      price: product.product_variants?.[0]?.price || 0,
      quantity: 1
    });

    // Animation du bouton
    button.textContent = 'Ajouté ✓';
    button.classList.add('added');
    setTimeout(() => {
      button.textContent = 'Ajouter au panier';
      button.classList.remove('added');
    }, 1000);

    updateCartSummary();
    NotificationService.success('Produit ajouté au panier');
  } catch (error) {
    console.error('Erreur ajout panier:', error);
    NotificationService.error('Erreur lors de l\'ajout au panier');
  }
}

function setupCart() {
  const viewCartBtn = document.getElementById('view-cart-btn');
  if (viewCartBtn) {
    viewCartBtn.addEventListener('click', () => {
      showCartModal();
    });
  }

  // Modal
  const closeModalBtn = document.querySelector('.close-modal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      const modal = document.getElementById('cart-modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  }

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      try {
        const user = authService.getCurrentUser();
        if (!user) {
          NotificationService.error('Utilisateur non connecté');
          return;
        }

        if (currentCart.length === 0) {
          NotificationService.warning('Votre panier est vide');
          return;
        }

        // Rediriger vers la page de livraison
        window.location.href = '/pages/delivery.html';
      } catch (error) {
        console.error('Erreur commande:', error);
        NotificationService.error('Erreur lors du processus de commande');
      }
    });
  }
}

function updateCartSummary() {
  const summary = document.getElementById('cart-summary');
  const count = document.getElementById('cart-count');
  const total = document.getElementById('cart-total');

  if (!summary || !count || !total) return;

  if (currentCart.length === 0) {
    summary.style.display = 'none';
    return;
  }

  summary.style.display = 'flex';
  count.textContent = `${currentCart.length} article(s)`;
  const totalPrice = currentCart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
  total.textContent = totalPrice.toLocaleString('fr-FR') + ' FCFA';
}

function showCartModal() {
  const cartItems = document.getElementById('cart-items');
  const modalTotal = document.getElementById('modal-cart-total');

  if (!cartItems || !modalTotal) return;

  cartItems.innerHTML = currentCart.map(item => `
    <div class="cart-item">
      <div>
        <strong>${item.name}</strong><br>
        <small>Quantité: ${item.quantity}</small>
      </div>
      <span>${((item.price || 0) * (item.quantity || 1)).toLocaleString('fr-FR')} FCFA</span>
    </div>
  `).join('');

  const total = currentCart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
  modalTotal.textContent = total.toLocaleString('fr-FR');

  const modal = document.getElementById('cart-modal');
  if (modal) {
    modal.style.display = 'block';
  }
}