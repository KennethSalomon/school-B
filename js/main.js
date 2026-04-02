// Animation du logo au chargement
document.addEventListener('DOMContentLoaded', () => {
  const logo = document.querySelector('.logo');
  logo.style.animation = 'logoPulse 2s infinite';

  // Animation de la box
  const openBoxButton = document.getElementById('open-box-button');
  const box = document.querySelector('.box');

  openBoxButton.addEventListener('click', () => {
    box.classList.toggle('open');
  });
});

// Exemple d'ajout d'article à la box
function addItemToBox(itemName) {
  const boxContent = document.getElementById('box-content');
  const item = document.createElement('div');
  item.className = 'box-item';
  item.textContent = itemName;
  boxContent.appendChild(item);
}