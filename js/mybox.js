import { Auth, Schools, Products, Orders } from '/supabase.js';

let selectedSchool = null;
let selectedClass = null;
let supplies = [];
let cart = [];

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

  // Recherche d'écoles
  setupSchoolSearch();

  // Gestion de la box interactive
  setupInteractiveBox();

  // Gestion du panier
  setupCart();

  // Charger la box existante si elle existe
  loadExistingBox();
});

function setupSchoolSearch() {
  const searchInput = document.getElementById('school-search');
  const resultsDiv = document.getElementById('school-results');

  searchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      resultsDiv.style.display = 'none';
      return;
    }

    try {
      const schools = await Schools.search(query);
      displaySchoolResults(schools);
    } catch (error) {
      console.error('Erreur recherche écoles:', error);
    }
  });
}

function displaySchoolResults(schools) {
  const resultsDiv = document.getElementById('school-results');

  if (schools.length === 0) {
    resultsDiv.innerHTML = '<div class="school-result">Aucune école trouvée</div>';
    resultsDiv.style.display = 'block';
    return;
  }

  resultsDiv.innerHTML = schools.map(school => `
    <div class="school-result" data-id="${school.id}">
      <strong>${school.name}</strong><br>
      <small>${school.city}</small>
    </div>
  `).join('');

  resultsDiv.style.display = 'block';

  // Gestionnaire de clic sur les résultats
  document.querySelectorAll('.school-result').forEach(result => {
    result.addEventListener('click', () => {
      selectSchool(schools.find(s => s.id == result.dataset.id));
    });
  });
}

async function selectSchool(school) {
  selectedSchool = school;
  document.getElementById('school-info').textContent = `${school.name} - ${school.city}`;
  document.getElementById('school-search').value = school.name;
  document.getElementById('school-results').style.display = 'none';

  // Charger les classes
  try {
    const schoolData = await Schools.getById(school.id);
    displayClasses(schoolData.classes);
  } catch (error) {
    console.error('Erreur chargement classes:', error);
  }
}

function displayClasses(classes) {
  const select = document.getElementById('class-select');
  select.innerHTML = '<option value="">Choisissez votre classe</option>';

  classes.forEach(classe => {
    select.innerHTML += `<option value="${classe.id}">${classe.name}</option>`;
  });

  select.disabled = false;

  select.addEventListener('change', (e) => {
    selectedClass = classes.find(c => c.id == e.target.value);
    document.getElementById('create-box-btn').disabled = !selectedClass;
  });
}

document.getElementById('create-box-btn').addEventListener('click', async () => {
  if (!selectedSchool || !selectedClass) return;

  try {
    const suppliesData = await Products.getBySchoolAndClass(selectedSchool.id, selectedClass.id);
    supplies = suppliesData;
    displaySupplies();
    showBoxContent();
  } catch (error) {
    console.error('Erreur chargement fournitures:', error);
    alert('Erreur lors du chargement des fournitures');
  }
});

function displaySupplies() {
  const grid = document.getElementById('supplies-grid');
  grid.innerHTML = supplies.map(supply => `
    <div class="supply-item" data-id="${supply.id}">
      <img src="${supply.products.image_url || '/placeholder.jpg'}" alt="${supply.products.name}" class="supply-image">
      <div class="supply-info">
        <h4>${supply.products.name}</h4>
        <p>${supply.products.description}</p>
        <div class="supply-price">${supply.product_variants[0]?.price || 0} FCFA</div>
      </div>
    </div>
  `).join('');

  // Gestionnaire de sélection
  document.querySelectorAll('.supply-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('selected');
      updateCartFromSelection();
    });
  });
}

function updateCartFromSelection() {
  const selectedItems = document.querySelectorAll('.supply-item.selected');
  cart = Array.from(selectedItems).map(item => {
    const supplyId = item.dataset.id;
    const supply = supplies.find(s => s.id == supplyId);
    return {
      id: supply.products.id,
      name: supply.products.name,
      price: supply.product_variants[0]?.price || 0,
      quantity: 1
    };
  });
}

function setupInteractiveBox() {
  const box3d = document.querySelector('.box-3d');
  const openBtn = document.getElementById('open-interactive-box');

  openBtn.addEventListener('click', () => {
    box3d.classList.toggle('open');
    openBtn.textContent = box3d.classList.contains('open') ? 'Fermer la Box' : 'Ouvrir la Box';
  });
}

function setupCart() {
  document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    if (cart.length === 0) {
      alert('Sélectionnez au moins un article');
      return;
    }
    showCartModal();
  });

  document.getElementById('save-box-btn').addEventListener('click', () => {
    // Sauvegarder la configuration de la box
    localStorage.setItem('schoolbox_config', JSON.stringify({
      school: selectedSchool,
      class: selectedClass,
      supplies: supplies
    }));
    alert('Box sauvegardée !');
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
      updateCartDisplay();
    } catch (error) {
      console.error('Erreur commande:', error);
      alert('Erreur lors de la création de la commande');
    }
  });
}

function showCartModal() {
  updateCartDisplay();
  document.getElementById('cart-modal').style.display = 'block';
}

function updateCartDisplay() {
  const cartItems = document.getElementById('cart-items');
  const total = document.getElementById('cart-total');

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <span>${item.name} (x${item.quantity})</span>
      <span>${item.price * item.quantity} FCFA</span>
    </div>
  `).join('');

  total.textContent = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function showBoxContent() {
  document.getElementById('box-setup').style.display = 'none';
  document.getElementById('box-content').style.display = 'grid';
}

function loadExistingBox() {
  const config = localStorage.getItem('schoolbox_config');
  if (config) {
    const { school, classe, supplies: savedSupplies } = JSON.parse(config);
    selectedSchool = school;
    selectedClass = classe;
    supplies = savedSupplies;
    document.getElementById('school-info').textContent = `${school.name} - ${school.city}`;
    displaySupplies();
    showBoxContent();
  }
}