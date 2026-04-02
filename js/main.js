import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// ⚠️ window.env n'existe pas dans un projet HTML pur — mets tes valeurs directement ici
const supabaseUrl = 'https://TON_URL.supabase.co';
const supabaseKey = 'ta_clé_anonyme';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
  const logo = document.querySelector('.logo');
  if (logo) logo.style.animation = 'logoPulse 2s infinite';
});

document.getElementById('open-box-button').addEventListener('click', () => {
  document.querySelector('.box').classList.toggle('open');
});

document.getElementById('search-button').addEventListener('click', async () => {
  const query = document.getElementById('school-search').value;
  if (!query) return;

  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .ilike('name', `%${query}%`);

  if (error) {
    console.error(error);
    alert('Erreur lors de la recherche.');
  } else {
    alert(`Écoles trouvées : ${data.length}`);
  }
});