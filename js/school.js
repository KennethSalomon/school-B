// Simulation de recherche d'écoles (à connecter à Supabase)
document.getElementById('search-button').addEventListener('click', async () => {
  const query = document.getElementById('school-search').value;
  if (!query) return;

  // Exemple de données simulées (remplacer par un appel Supabase)
  const schools = [
    { id: 1, name: 'École Primaire Les Oliviers', city: 'Cotonou' },
    { id: 2, name: 'Lycée Moderne de Porto-Novo', city: 'Porto-Novo' },
  ];

  // Afficher les résultats
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'school-results';
  resultsContainer.innerHTML = schools.map(school =>
    `<div class="school-card" data-id="${school.id}">${school.name} (${school.city})</div>`
  ).join('');

  document.querySelector('.search-container').appendChild(resultsContainer);

  // Sélection d'une école
  document.querySelectorAll('.school-card').forEach(card => {
    card.addEventListener('click', () => {
      alert(`École sélectionnée : ${card.textContent}`);
      // Ici, tu peux charger les classes et articles associés
    });
  });
});