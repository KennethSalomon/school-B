import { Auth, Schools } from '/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const logo = document.querySelector('.logo');
  if (logo) logo.style.animation = 'logoPulse 2s infinite';

  // Vérifier si l'utilisateur est connecté
  const user = await Auth.getUser();
  if (user) {
    // Rediriger vers le dashboard si connecté
    window.location.href = '/dashboard.html';
  }

  setupSchoolSearch();
});

async function setupSchoolSearch() {
  const searchButton = document.getElementById('search-button');
  const searchInput = document.getElementById('school-search');

  if (!searchButton) return;

  searchButton.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) {
      alert('Veuillez saisir le nom d\'une école');
      return;
    }

    try {
      const schools = await Schools.search(query);
      if (schools.length === 0) {
        alert('Aucune école trouvée. Essayez un autre nom.');
        return;
      }

      // Sauvegarder les résultats et rediriger vers la page de connexion/inscription
      localStorage.setItem('school_search_results', JSON.stringify(schools));
      localStorage.setItem('school_search_query', query);

      alert(`${schools.length} école(s) trouvée(s). Connectez-vous pour continuer.`);
      window.location.href = '/login.html';
    } catch (error) {
      console.error('Erreur recherche:', error);
      alert('Erreur lors de la recherche. Veuillez réessayer.');
    }
  });
}

// Gestion de l'ouverture de la box (démonstration)
document.getElementById('open-box-button')?.addEventListener('click', () => {
  const box = document.querySelector('.box');
  if (box) {
    box.classList.toggle('open');
  }
});