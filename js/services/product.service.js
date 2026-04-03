/**
 * SchoolBox - Service de Produits
 * Gère recherche, filtrage et récupération de produits
 */

import { BaseAPIService, StorageService, UtilService } from '/js/services/api.service.js';

export class ProductService extends BaseAPIService {
  constructor() {
    super();
    this.allProducts = [];
    this.searchIndex = [];
  }

  /**
   * Récupère tous les produits
   */
  async getAllProducts(filters = {}) {
    return this.safeCall(async () => {
      let query = this.supabase
        .from('products')
        .select(`
          *,
          product_variants(*),
          product_categories(name)
        `)
        .eq('active', true);

      // Appliquer les filtres
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.schoolId) {
        // Récupérer les produits de l'école spécifique
        const schoolListIds = await this.getSchoolProductListIds(filters.schoolId);
        if (schoolListIds.length > 0) {
          query = query.in('id', schoolListIds);
        }
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      this.allProducts = data || [];
      this.buildSearchIndex();
      
      return this.allProducts;
    }, 'GetAllProducts');
  }

  /**
   * Recherche intelligente de produits
   */
  async searchProducts(query, filters = {}) {
    return this.safeCall(async () => {
      if (!query || query.trim().length === 0) {
        return await this.getAllProducts(filters);
      }

      const searchQuery = query.toLowerCase().trim();
      let results = [];

      // Recherche dans les produits déjà chargés
      if (this.allProducts.length > 0) {
        results = this.allProducts.filter(product => 
          product.name.toLowerCase().includes(searchQuery) ||
          product.description.toLowerCase().includes(searchQuery) ||
          (product.category && product.category.toLowerCase().includes(searchQuery))
        );
      } else {
        // Sinon, chercher dans Supabase
        const { data, error } = await this.supabase
          .from('products')
          .select(`
            *,
            product_variants(*),
            product_categories(name)
          `)
          .or(
            `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
          )
          .eq('active', true);

        if (error) throw error;
        results = data || [];
      }

      // Appliquer les filtres
      if (filters.category) {
        results = results.filter(p => p.category === filters.category);
      }

      if (filters.minPrice) {
        results = results.filter(p => 
          p.product_variants?.some(v => v.price >= filters.minPrice)
        );
      }

      if (filters.maxPrice) {
        results = results.filter(p => 
          p.product_variants?.some(v => v.price <= filters.maxPrice)
        );
      }

      return results;
    }, 'SearchProducts');
  }

  /**
   * Récupère un produit par ID
   */
  async getProductById(productId) {
    return this.safeCall(async () => {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          product_variants(*),
          product_categories(name)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data;
    }, 'GetProductById');
  }

  /**
   * Récupère les catégories de produits
   */
  async getCategories() {
    return this.safeCall(async () => {
      const { data, error } = await this.supabase
        .from('product_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    }, 'GetCategories');
  }

  /**
   * Récupère les produits proposés pour une école et classe
   */
  async getSchoolProducts(schoolId, classId) {
    return this.safeCall(async () => {
      const { data, error } = await this.supabase
        .from('school_lists')
        .select(`
          id, required, note,
          products(
            id, name, description, category, image_url,
            product_variants(id, quality, price, stock)
          )
        `)
        .eq('school_id', schoolId)
        .eq('class_id', classId);

      if (error) throw error;
      return data || [];
    }, 'GetSchoolProducts');
  }

  /**
   * Récupère les IDs de produits pour une école
   */
  async getSchoolProductListIds(schoolId) {
    try {
      const { data, error } = await this.supabase
        .from('school_lists')
        .select('product_id')
        .eq('school_id', schoolId);

      if (error) throw error;
      return data?.map(item => item.product_id) || [];
    } catch (error) {
      console.error('Error getting school product IDs:', error);
      return [];
    }
  }

  /**
   * Construit un index de recherche
   */
  buildSearchIndex() {
    this.searchIndex = this.allProducts.map(product => ({
      id: product.id,
      name: product.name,
      keywords: [
        product.name.toLowerCase(),
        product.description?.toLowerCase() || '',
        product.category?.toLowerCase() || ''
      ]
    }));
  }

  /**
   * Récupère les produits populaires
   */
  async getPopularProducts(limit = 12) {
    return this.safeCall(async () => {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          product_variants(*)
        `)
        .eq('active', true)
        .eq('featured', true)
        .limit(limit)
        .order('popularity', { ascending: false });

      if (error) throw error;
      return data || [];
    }, 'GetPopularProducts');
  }

  /**
   * Récupère les produits en promotion
   */
  async getPromoProducts(limit = 12) {
    return this.safeCall(async () => {
      const { data, error } = await this.supabase
        .from('products')
        .select(`
          *,
          product_variants(*)
        `)
        .eq('active', true)
        .not('promo_percentage', 'is', null)
        .limit(limit)
        .order('promo_percentage', { ascending: false });

      if (error) throw error;
      return data || [];
    }, 'GetPromoProducts');
  }

  /**
   * Calcule le prix de vente (avec promotion)
   */
  calculatePrice(product, variant) {
    const basePrice = variant.price;
    if (product.promo_percentage) {
      return basePrice * (1 - product.promo_percentage / 100);
    }
    return basePrice;
  }

  /**
   * Recapture les données pour suggestions (autocomplete)
   */
  async getSuggestions(query, limit = 5) {
    if (!query || query.length < 2) return [];
    
    const suggestions = this.allProducts
      .filter(p => p.name.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, limit)
      .map(p => ({ id: p.id, name: p.name }));

    return suggestions;
  }
}

/**
 * Instance singleton de ProductService
 */
export const productService = new ProductService();
