/**
 * SchoolBox - Middleware de Protection des Routes
 * Vérifie l'authentification et redirige si nécessaire
 */

import { authService } from '/js/services/auth.service.js';
import { APP_CONFIG, AUTH_PAGES } from '/js/config.js';

/**
 * Classe pour gérer la protection des routes
 */
export class RouteGuard {
  static isProtectedRoute(pathname) {
    return APP_CONFIG.protectedRoutes.some(route => pathname.includes(route));
  }

  static async checkProtectedRoute() {
    const currentPath = window.location.pathname;
    
    if (!this.isProtectedRoute(currentPath)) {
      return true; // Route publique
    }

    const isAuth = await authService.isAuthenticated();
    
    if (!isAuth) {
      window.location.href = AUTH_PAGES.login;
      return false;
    }

    return true;
  }

  static async requireAuth() {
    const isAuth = authService.isAuthenticated();
    if (!isAuth) {
      window.location.href = AUTH_PAGES.login;
      throw new Error('Authentication required');
    }
    return authService.getCurrentUser();
  }
}

/**
 * Initialise la protection des routes au chargement de la page
 */
export async function initializeRouteGuard() {
  // Vérifier les routes protégées
  await RouteGuard.checkProtectedRoute();
}

/**
 * Décorateur pour protéger les fonctions
 */
export function requireAuth(target, propertyKey, descriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function(...args) {
    const user = await RouteGuard.requireAuth();
    return originalMethod.apply(this, args);
  };

  return descriptor;
}
