import { Auth } from '/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');

  // Gestion des onglets
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      forms.forEach(f => f.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
    });
  });

  // Formulaire de connexion
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const data = await Auth.signIn({ email, password });
      alert('Connexion réussie !');
      window.location.href = '/dashboard.html';
    } catch (error) {
      alert('Erreur de connexion : ' + error.message);
    }
  });

  // Formulaire d'inscription
  document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('signup-name').value;
    const phone = document.getElementById('signup-phone').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
      const data = await Auth.signUp({ email, password, name, phone });
      alert('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
      // Basculer vers l'onglet connexion
      document.querySelector('[data-tab="login"]').click();
    } catch (error) {
      alert('Erreur d\'inscription : ' + error.message);
    }
  });

  // Vérifier si l'utilisateur est déjà connecté
  Auth.getUser().then(user => {
    if (user) {
      window.location.href = '/dashboard.html';
    }
  });
});