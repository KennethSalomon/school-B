/**
 * SchoolBox - Service d'Authentification
 * Gère inscription, connexion, déconnexion et session utilisateur
 */

import { BaseAPIService, StorageService, NotificationService, ValidationService } from '/js/services/api.service.js';
import { APP_CONFIG, ERROR_MESSAGES } from '/js/config.js';

export class AuthService extends BaseAPIService {
  constructor() {
    super();
    this.currentUser = null;
    this.loadCurrentUser();
  }

  /**
   * Charge l'utilisateur actuel depuis le localStorage
   */
  loadCurrentUser() {
    this.currentUser = StorageService.get('user');
  }

  /**
   * Récupère l'utilisateur actuel
   * Synchronise avec Supabase si pas en cache
   */
  async getCurrentUser() {
    // Si on a un user en cache, le retourner
    if (this.currentUser) {
      return this.currentUser;
    }

    // Sinon, vérifier avec Supabase
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        // Récupérer les données du profil
        const { data } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          this.currentUser = data;
          StorageService.set('user', this.currentUser);
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    return this.currentUser;
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isAuthenticated() {
    return !!this.currentUser && !!this.currentUser.id;
  }

  /**
   * Inscription utilisateur
   */
  async signUp(userData) {
    return this.safeCall(async () => {
      const { email, password, confirmPassword, firstName, lastName, phone } = userData;

      // Validations
      if (!email || !ValidationService.isEmail(email)) {
        throw new Error(ERROR_MESSAGES.INVALID_EMAIL);
      }

      if (!password || password.length < APP_CONFIG.validation.passwordMinLength) {
        throw new Error(
          `Le mot de passe doit contenir au moins ${APP_CONFIG.validation.passwordMinLength} caractères`
        );
      }

      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (phone && !ValidationService.isPhoneNumber(phone)) {
        throw new Error('Numéro de téléphone invalide');
      }

      // Vérifier si l'email existe déjà
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('Cet email est déjà utilisé');
      }

      // Inscrire via Supabase Auth
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
            phone
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Créer le profil utilisateur
      if (data.user) {
        await this.supabase
          .from('users')
          .insert({
            id: data.user.id,
            email,
            firstName,
            lastName,
            phone,
            created_at: new Date().toISOString()
          });
      }

      return {
        success: true,
        message: 'Inscription réussie ! Vérifiez votre email pour confirmer votre compte.',
        user: data.user
      };
    }, 'SignUp');
  }

  /**
   * Connexion utilisateur
   */
  async signIn(credentials) {
    return this.safeCall(async () => {
      const { email, password } = credentials;

      if (!email || !ValidationService.isEmail(email)) {
        throw new Error(ERROR_MESSAGES.INVALID_EMAIL);
      }

      if (!password) {
        throw new Error('Le mot de passe est requis');
      }

      // Connexion via Supabase Auth
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(error.message || 'Connexion échouée');
      }

      // Récupérer les données de l'utilisateur
      const { data: userData } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Sauvegarder dans localStorage
      this.currentUser = {
        id: data.user.id,
        email: data.user.email,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        phone: userData?.phone,
        avatar: userData?.avatar,
        role: userData?.role || 'user'
      };

      StorageService.set('user', this.currentUser);
      StorageService.set('auth_token', data.session?.access_token);

      return {
        success: true,
        user: this.currentUser,
        token: data.session?.access_token
      };
    }, 'SignIn');
  }

  /**
   * Déconnexion
   */
  async signOut() {
    return this.safeCall(async () => {
      await this.supabase.auth.signOut();
      
      this.currentUser = null;
      StorageService.remove('user');
      StorageService.remove('auth_token');

      return { success: true };
    }, 'SignOut');
  }

  /**
   * Demande de réinitialisation de mot de passe
   */
  async requestPasswordReset(email) {
    return this.safeCall(async () => {
      if (!email || !ValidationService.isEmail(email)) {
        throw new Error(ERROR_MESSAGES.INVALID_EMAIL);
      }

      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/pages/reset-password.html`
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'Un lien de réinitialisation a été envoyé à votre email'
      };
    }, 'RequestPasswordReset');
  }

  /**
   * Réinitialise le mot de passe
   */
  async resetPassword(newPassword, confirmPassword) {
    return this.safeCall(async () => {
      if (!newPassword || newPassword.length < APP_CONFIG.validation.passwordMinLength) {
        throw new Error(
          `Le mot de passe doit contenir au moins ${APP_CONFIG.validation.passwordMinLength} caractères`
        );
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'Mot de passe réinitialisé avec succès'
      };
    }, 'ResetPassword');
  }

  /**
   * Met à jour le profil utilisateur
   */
  async updateProfile(updates) {
    return this.safeCall(async () => {
      if (!this.currentUser) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      const { error } = await this.supabase
        .from('users')
        .update(updates)
        .eq('id', this.currentUser.id);

      if (error) {
        throw new Error(error.message);
      }

      // Mettre à jour le user actuel
      this.currentUser = { ...this.currentUser, ...updates };
      StorageService.set('user', this.currentUser);

      return {
        success: true,
        user: this.currentUser
      };
    }, 'UpdateProfile');
  }

  /**
   * Récupère les données complètes de l'utilisateur
   */
  async getFullUserData() {
    return this.safeCall(async () => {
      if (!this.currentUser) {
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
      }

      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', this.currentUser.id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }, 'GetFullUserData');
  }

  /**
   * Vérifie l'authentification (appel au démarrage)
   */
  async checkAuth() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) {
        this.currentUser = null;
        StorageService.remove('user');
        return false;
      }

      if (!this.currentUser) {
        const { data } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          this.currentUser = data;
          StorageService.set('user', this.currentUser);
        }
      }

      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }

  /**
   * Ajoute un token d'authentification aux requêtes
   */
  getAuthHeader() {
    const token = StorageService.get('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}

/**
 * Instance singleton de AuthService
 */
export const authService = new AuthService();
