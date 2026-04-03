/**
 * SchoolBox Configuration Module
 * Gère les variables d'environnement et la configuration globale
 */

// Configuration environment
const ENV = {
  DEV: 'development',
  PROD: 'production'
};

const CURRENT_ENV = window.location.hostname === 'localhost' ? ENV.DEV : ENV.PROD;

/**
 * Configuration Supabase
 * À partir des variables d'environnement ou localStorage
 */
const SUPABASE_CONFIG = {
  // ⚠️ SÉCURITÉ: Ces variables doivent être configurées dans l'environnement
  // Ne pas mettre les clés en dur en production! Utiliser des variables d'env.
  url: localStorage.getItem('sb_url') || '',
  anonKey: localStorage.getItem('sb_key') || ''
};

/**
 * Configuration Fedapay
 */
const FEDAPAY_CONFIG = {
  publicKey: localStorage.getItem('fedapay_key') || 'pk_live_YOUR_PUBLIC_KEY',
  merchantId: localStorage.getItem('fedapay_merchant') || 'YOUR_MERCHANT_ID',
  apiUrl: 'https://api.fedapay.com/v1'
};

/**
 * Configuration application
 */
const APP_CONFIG = {
  appName: 'SchoolBox',
  appVersion: '1.0.0',
  currency: 'XOF',
  currencySymbol: 'FCFA',
  country: 'BN', // Benin
  language: 'fr-FR',
  timezone: 'Africa/Porto-Novo',
  
  // Limites et validations
  validation: {
    passwordMinLength: 8,
    phonePattern: /^(\+|00)[0-9]{1,3}[0-9]{6,14}$/,
    emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },

  // Configuration de listes
  schoolClasses: [
    { id: 'cp', label: 'Cours Préparatoire', level: 1 },
    { id: 'ce1', label: 'Cours Élémentaire 1', level: 2 },
    { id: 'ce2', label: 'Cours Élémentaire 2', level: 3 },
    { id: 'cm1', label: 'Cours Moyen 1', level: 4 },
    { id: 'cm2', label: 'Cours Moyen 2', level: 5 },
    { id: '6e', label: 'Sixième (6ème)', level: 6 },
    { id: '5e', label: 'Cinquième (5ème)', level: 7 },
    { id: '4e', label: 'Quatrième (4ème)', level: 8 },
    { id: '3e', label: 'Troisième (3ème)', level: 9 }
  ],

  // Routes protégées (nécessitent authentification)
  protectedRoutes: [
    '/dashboard.html',
    '/produits.html',
    '/orders.html',
    '/profil.html',
    '/pages/cart.html',
    '/pages/payement.html',
    '/pages/confirmation.html'
  ],

  // Délais et timeouts
  timeouts: {
    apiCall: 10000,
    authCheck: 5000,
    searchDebounce: 300
  },

  // Options de paiement Fedapay
  paymentMethods: [
    { id: 'mobile_money', label: 'Mobile Money', icon: '📱' },
    { id: 'card', label: 'Carte Bancaire', icon: '💳' },
    { id: 'wallet', label: 'Porte-monnaie Mobile', icon: '🏪' }
  ]
};

/**
 * URLs d'authentification
 */
const AUTH_PAGES = {
  login: '/pages/auth.html',
  signup: '/pages/auth.html',
  resetPassword: '/pages/reset-password.html',
  dashboard: '/dashboard.html'
};

/**
 * Messages d'erreur standardisés
 */
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Vous devez être connecté pour effectuer cette action',
  INVALID_EMAIL: 'Veuillez entrer une adresse e-mail valide',
  WEAK_PASSWORD: 'Le mot de passe doit contenir au moins 8 caractères',
  NETWORK_ERROR: 'Erreur de connexion. Veuillez vérifier votre connexion Internet',
  SERVER_ERROR: 'Une erreur serveur s\'est produite. Veuillez réessayer plus tard',
  NOT_FOUND: 'La ressource demandée n\'a pas été trouvée',
  PERMISSION_DENIED: 'Vous n\'avez pas la permission d\'effectuer cette action',
  INVALID_INPUT: 'Les données saisies ne sont pas valides'
};

/**
 * Exporte la configuration
 */
export {
  CURRENT_ENV,
  ENV,
  SUPABASE_CONFIG,
  FEDAPAY_CONFIG,
  APP_CONFIG,
  AUTH_PAGES,
  ERROR_MESSAGES
};

/**
 * Fonction utilitaire pour obtenir une configuration
 */
export function getConfig(key) {
  const [main, sub] = key.split('.');
  if (sub) {
    return window.SCHOOLBOX_CONFIG?.[main]?.[sub];
  }
  return window.SCHOOLBOX_CONFIG?.[main];
}

/**
 * Initialise la config globale
 */
window.SCHOOLBOX_CONFIG = {
  SUPABASE_CONFIG,
  FEDAPAY_CONFIG,
  APP_CONFIG,
  ENV: CURRENT_ENV,
  AUTH_PAGES,
  ERROR_MESSAGES
};
