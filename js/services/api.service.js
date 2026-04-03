/**
 * SchoolBox - Service API Base
 * Gère les appels API avec gestion d'erreur centralisée
 */

import { SUPABASE_CONFIG, ERROR_MESSAGES } from '/js/config.js';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Client Supabase singleton
let supabaseClient = null;

/**
 * Initialise le client Supabase
 */
export function initSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
  return supabaseClient;
}

/**
 * Récupère le client Supabase
 */
export function getSupabase() {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
}

/**
 * Classe de base pour les services API
 */
export class BaseAPIService {
  constructor() {
    this.supabase = getSupabase();
  }

  /**
   * Gère les erreurs API
   */
  handleError(error, context = '') {
    console.error(`API Error [${context}]:`, error);
    
    if (error?.status === 401) {
      return ERROR_MESSAGES.UNAUTHORIZED;
    } else if (error?.status === 403) {
      return ERROR_MESSAGES.PERMISSION_DENIED;
    } else if (error?.status === 404) {
      return ERROR_MESSAGES.NOT_FOUND;
    } else if (error?.message?.includes('network')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    } else if (error?.message) {
      return error.message;
    }
    return ERROR_MESSAGES.SERVER_ERROR;
  }

  /**
   * Effectue un appel sécurisé avec gestion d'erreur
   */
  async safeCall(asyncFn, context = 'API Call') {
    try {
      return await asyncFn();
    } catch (error) {
      const message = this.handleError(error, context);
      throw new Error(message);
    }
  }
}

/**
 * Service de utilitaires HTTP
 */
export class HTTPService {
  static async get(url, options = {}) {
    return fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }).then(this.handleResponse);
  }

  static async post(url, data, options = {}) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    }).then(this.handleResponse);
  }

  static async put(url, data, options = {}) {
    return fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    }).then(this.handleResponse);
  }

  static async delete(url, options = {}) {
    return fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }).then(this.handleResponse);
  }

  static async handleResponse(response) {
    const data = await response.json().catch(() => null);
    
    if (!response.ok) {
      const error = new Error(data?.message || `HTTP Error ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  }
}

/**
 * Service de notifications et toasts
 */
export class NotificationService {
  static show(message, type = 'info', duration = 3000) {
    const toast = this.createToast(message, type);
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    if (duration > 0) {
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  }

  static success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  static error(message, duration = 5000) {
    return this.show(message, 'error', duration);
  }

  static warning(message, duration = 4000) {
    return this.show(message, 'warning', duration);
  }

  static createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    return toast;
  }
}

/**
 * Service de stockage local
 */
export class StorageService {
  static set(key, value) {
    try {
      localStorage.setItem(
        `schoolbox_${key}`,
        typeof value === 'string' ? value : JSON.stringify(value)
      );
    } catch (e) {
      console.error('LocalStorage error:', e);
    }
  }

  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`schoolbox_${key}`);
      if (!item) return defaultValue;
      
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (e) {
      console.error('LocalStorage error:', e);
      return defaultValue;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(`schoolbox_${key}`);
    } catch (e) {
      console.error('LocalStorage error:', e);
    }
  }

  static clear() {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('schoolbox_'))
        .forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.error('LocalStorage error:', e);
    }
  }
}

/**
 * Service de validation
 */
export class ValidationService {
  static isEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  static isStrongPassword(password) {
    // Au minimum 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password);
  }

  static isPhoneNumber(phone) {
    // Accepte les numéros au format international ou local
    const phonePattern = /^(\+|00)[0-9]{1,3}[0-9]{6,14}$|^[0-9]{8,14}$/;
    return phonePattern.test(phone.replace(/\s/g, ''));
  }

  static validateRequired(fields) {
    const errors = {};
    Object.entries(fields).forEach(([key, value]) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors[key] = `${key} est requis`;
      }
    });
    return Object.keys(errors).length === 0 ? null : errors;
  }
}

/**
 * Service d'utilitaires
 */
export class UtilService {
  static formatCurrency(amount, currency = 'FCFA') {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
  }

  static formatDate(date, locale = 'fr-FR') {
    return new Date(date).toLocaleDateString(locale);
  }

  static formatDateTime(date, locale = 'fr-FR') {
    return new Date(date).toLocaleString(locale);
  }

  static debounce(fn, delay = 300) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  static throttle(fn, delay = 300) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  }

  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
