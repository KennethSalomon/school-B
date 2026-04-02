import { Auth, Orders } from '/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Vérifier l'authentification
  const user = await Auth.getUser();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // Afficher le nom de l'utilisateur
  const userData = JSON.parse(localStorage.getItem('sb_user'));
  if (userData) {
    document.getElementById('user-name').textContent = userData.name;
  }

  // Charger les statistiques
  loadDashboardStats();

  // Gestionnaire de déconnexion
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await Auth.signOut();
  });

  // Boutons d'action
  document.getElementById('configure-box-btn').addEventListener('click', () => {
    window.location.href = '/index.html';
  });

  document.getElementById('explore-products-btn').addEventListener('click', () => {
    window.location.href = '/products.html';
  });
});

async function loadDashboardStats() {
  try {
    const user = await Auth.getUser();
    if (!user) return;

    // Charger les commandes
    const orders = await Orders.getMyOrders(user.id);
    document.getElementById('orders-count').textContent = `${orders.length} commande(s)`;

    // Afficher les commandes récentes
    displayRecentOrders(orders);

    // TODO: Calculer les économies (nécessite plus de logique métier)

  } catch (error) {
    console.error('Erreur lors du chargement des statistiques:', error);
  }
}

function displayRecentOrders(orders) {
  const ordersList = document.getElementById('orders-list');

  if (orders.length === 0) return;

  ordersList.innerHTML = orders.slice(0, 3).map(order => `
    <div class="order-item">
      <div class="order-header">
        <span class="order-id">Commande #${order.id}</span>
        <span class="order-date">${new Date(order.created_at).toLocaleDateString('fr-FR')}</span>
      </div>
      <div class="order-status status-${order.status || 'pending'}">
        ${getStatusText(order.status || 'pending')}
      </div>
    </div>
  `).join('');
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