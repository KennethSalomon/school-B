import { Auth, Orders } from '/supabase.js';

let allOrders = [];
let currentFilter = 'all';

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

  // Charger les commandes
  await loadOrders();

  // Gestion des filtres
  setupFilters();

  // Gestion du modal
  setupModal();
});

async function loadOrders() {
  try {
    const user = await Auth.getUser();
    const orders = await Orders.getMyOrders(user.id);
    allOrders = orders;
    displayOrders(orders);
  } catch (error) {
    console.error('Erreur chargement commandes:', error);
    document.getElementById('orders-list').innerHTML = '<div class="no-orders">Erreur lors du chargement des commandes</div>';
  }
}

function displayOrders(orders) {
  const ordersList = document.getElementById('orders-list');

  if (orders.length === 0) {
    ordersList.innerHTML = '<div class="no-orders">Aucune commande trouvée</div>';
    return;
  }

  ordersList.innerHTML = orders.map(order => `
    <div class="order-card" data-id="${order.id}">
      <div class="order-header">
        <span class="order-id">Commande #${order.id}</span>
        <span class="order-date">${new Date(order.created_at).toLocaleDateString('fr-FR')}</span>
      </div>
      <div class="order-status status-${order.status || 'pending'}">
        ${getStatusText(order.status || 'pending')}
      </div>
      <div class="order-summary">
        <span class="order-items">${order.order_items?.length || 0} article(s)</span>
        <span class="order-total">${calculateOrderTotal(order)} FCFA</span>
      </div>
    </div>
  `).join('');

  // Gestionnaire de clic sur les cartes
  document.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', () => {
      showOrderDetails(card.dataset.id);
    });
  });
}

function getStatusText(status) {
  const statusMap = {
    'pending': 'En attente',
    'confirmed': 'Confirmée',
    'preparing': 'En préparation',
    'shipped': 'Expédiée',
    'delivered': 'Livrée'
  };
  return statusMap[status] || status;
}

function calculateOrderTotal(order) {
  if (order.order_items && order.order_items.length > 0) {
    return order.order_items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
  return 0;
}

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Retirer la classe active
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      // Ajouter la classe active au bouton cliqué
      btn.classList.add('active');

      currentFilter = btn.dataset.filter;
      filterOrders();
    });
  });
}

function filterOrders() {
  let filteredOrders = allOrders;

  if (currentFilter !== 'all') {
    filteredOrders = allOrders.filter(order => order.status === currentFilter);
  }

  displayOrders(filteredOrders);
}

function setupModal() {
  document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('order-modal').style.display = 'none';
  });

  // Fermer le modal en cliquant en dehors
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('order-modal');
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}

function showOrderDetails(orderId) {
  const order = allOrders.find(o => o.id == orderId);
  if (!order) return;

  document.getElementById('order-id').textContent = `#${order.id}`;

  const details = document.getElementById('order-details');
  details.innerHTML = `
    <div class="order-info">
      <div class="order-info-grid">
        <div class="info-item">
          <div class="info-label">Date de commande</div>
          <div class="info-value">${new Date(order.created_at).toLocaleDateString('fr-FR')}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Statut</div>
          <div class="info-value">${getStatusText(order.status || 'pending')}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Nombre d'articles</div>
          <div class="info-value">${order.order_items?.length || 0}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Total</div>
          <div class="info-value">${calculateOrderTotal(order)} FCFA</div>
        </div>
      </div>
    </div>

    <div class="order-items-list">
      <h4>Articles commandés</h4>
      ${order.order_items?.map(item => `
        <div class="order-item-detail">
          <div class="item-info">
            <h5>${item.product_name || 'Produit inconnu'}</h5>
            <small>Quantité: ${item.quantity}</small>
          </div>
          <div class="item-price">${item.price * item.quantity} FCFA</div>
        </div>
      `).join('') || '<p>Aucun article trouvé</p>'}
    </div>
  `;

  document.getElementById('order-modal').style.display = 'block';
}