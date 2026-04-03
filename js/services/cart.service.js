/**
 * SchoolBox - Service de Panier
 * Gère le panier d'achat en localStorage avec synchronisation
 */

import { StorageService, UtilService, NotificationService } from '/js/services/api.service.js';

export class CartService {
  constructor() {
    this.cart = StorageService.get('cart') || [];
    this.listeners = [];
  }

  /**
   * Ajoute un article au panier
   */
  addItem(product, variant, quantity = 1) {
    if (!product || !variant) {
      throw new Error('Produit ou variante invalide');
    }

    const existingItem = this.cart.find(
      item => item.productId === product.id && item.variantId === variant.id
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.cart.push({
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        productImage: product.image_url,
        price: variant.price,
        quantity: quantity,
        addedAt: new Date().toISOString()
      });
    }

    this.saveCart();
    this.notifyListeners();
    NotificationService.success(`${product.name} ajouté au panier`);

    return this.cart;
  }

  /**
   * Supprime un article du panier
   */
  removeItem(productId, variantId) {
    this.cart = this.cart.filter(
      item => !(item.productId === productId && item.variantId === variantId)
    );
    this.saveCart();
    this.notifyListeners();
    return this.cart;
  }

  /**
   * Modifie la quantité d'un article
   */
  updateQuantity(productId, variantId, quantity) {
    if (quantity <= 0) {
      return this.removeItem(productId, variantId);
    }

    const item = this.cart.find(
      it => it.productId === productId && it.variantId === variantId
    );

    if (item) {
      item.quantity = quantity;
      this.saveCart();
      this.notifyListeners();
    }

    return this.cart;
  }

  /**
   * Vide le panier
   */
  clear() {
    this.cart = [];
    this.saveCart();
    this.notifyListeners();
  }

  /**
   * Récupère le panier
   */
  getCart() {
    return this.cart;
  }

  /**
   * Récupère le nombre d'articles
   */
  getItemCount() {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }

  /**
   * Calcule le sous-total
   */
  getSubtotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  /**
   * Calcule les taxes (19% TVA au Bénin)
   */
  calculateTax(subtotal = null) {
    const amount = subtotal !== null ? subtotal : this.getSubtotal();
    return amount * 0.19; // 19% de TVA
  }

  /**
   * Calcule les frais de livraison
   */
  calculateShipping(subtotal = null) {
    const amount = subtotal !== null ? subtotal : this.getSubtotal();
    
    // Frais de livraison basés sur le montant
    if (amount >= 50000) return 0; // Gratuit pour les commandes >= 50000 FCFA
    if (amount >= 25000) return 2500;
    if (amount >= 10000) return 3500;
    return 5000; // Minimum 5000 FCFA
  }

  /**
   * Calcule le total (subtotal + taxes + frais)
   */
  getTotal() {
    const subtotal = this.getSubtotal();
    const tax = this.calculateTax(subtotal);
    const shipping = this.calculateShipping(subtotal);
    return subtotal + tax + shipping;
  }

  /**
   * Récupère le résumé du panier
   */
  getSummary() {
    const subtotal = this.getSubtotal();
    const tax = this.calculateTax(subtotal);
    const shipping = this.calculateShipping(subtotal);
    const total = subtotal + tax + shipping;

    return {
      itemCount: this.getItemCount(),
      subtotal,
      tax,
      shipping,
      total,
      items: this.cart
    };
  }

  /**
   * Prépare les données pour la création d'une commande
   */
  prepareOrderData(userId, deliveryInfo) {
    const summary = this.getSummary();

    return {
      user_id: userId,
      status: 'pending',
      subtotal: summary.subtotal,
      tax_amount: summary.tax,
      shipping_cost: summary.shipping,
      total_amount: summary.total,
      delivery_info: deliveryInfo,
      items: this.cart.map(item => ({
        product_id: item.productId,
        variant_id: item.variantId,
        quantity: item.quantity,
        price: item.price
      })),
      created_at: new Date().toISOString()
    };
  }

  /**
   * Sauvegarde le panier dans localStorage
   */
  saveCart() {
    StorageService.set('cart', this.cart);
  }

  /**
   * Restaure le panier du localStorage
   */
  loadCart() {
    this.cart = StorageService.get('cart') || [];
    return this.cart;
  }

  /**
   * Ajoute un listener pour les changements du panier
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notifie tous les listeners
   */
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.getSummary()));
  }

  /**
   * Valide le panier avant paiement
   */
  validate() {
    const errors = [];

    if (this.cart.length === 0) {
      errors.push('Le panier est vide');
    }

    this.cart.forEach((item, index) => {
      if (!item.productId || !item.variantId) {
        errors.push(`Article ${index + 1} invalide`);
      }
      if (item.quantity <= 0) {
        errors.push(`Quantité invalide pour ${item.productName}`);
      }
      if (item.price <= 0) {
        errors.push(`Prix invalide pour ${item.productName}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

/**
 * Instance singleton de CartService
 */
export const cartService = new CartService();
