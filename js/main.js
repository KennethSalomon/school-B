// Initialisation de Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

const supabaseUrl = window.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = window.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Animation du logo
document.addEventListener('DOMContentLoaded', () => {
  const logo = document.querySelector('.logo');
  logo.style.animation = 'logoPulse 2s infinite';
});

// Animation de la box
document.getElementById('open-box-button').addEventListener('click', () => {
  const box = document.querySelector('.box');
  box.classList.toggle('open');
});

// Recherche d'écoles
document.getElementById('search-button').addEventListener('click', async () => {
  const query = document.getElementById('school-search').value;
  if (!query) return;

  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .ilike('name', `%${query}%`);

  if (error) {
    console.error(error);
    alert("Erreur lors de la recherche.");
  } else {
    console.log(data);
    alert(`Écoles trouvées : ${data.length}`);
  }
});