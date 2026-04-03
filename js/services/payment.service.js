/**
 * SchoolBox - Service de Paiement (Fedapay)
 * Gère l'intégration avec Fedapay pour les paiements mobiles et cartes
 */

import { BaseAPIService, HTTPService, StorageService, NotificationService } from '/js/services/api.service.js';
import { FEDAPAY_CONFIG } from '/js/config.js';

export class PaymentService extends BaseAPIService {
  constructor() {
    super();
    this.fedapayUrl = FEDAPAY_CONFIG.apiUrl;
    this.publicKey = FEDAPAY_CONFIG.publicKey;
  }

  /**
   * Crée une transaction de paiement Fedapay
   */
  async initiatePayment(paymentData) {
    return this.safeCall(async () => {
      const {
        orderId,
        amount,
        currency = 'XOF',
        description,
        paymentMethod,
        customerInfo
      } = paymentData;

      if (!orderId || !amount || !paymentMethod) {
        throw new Error('Données de paiement invalides');
      }

      // Créer la transaction Fedapay
      const transactionPayload = {
        description: description || `Commande #${orderId}`,
        amount: Math.round(amount * 100), // Fedapay utilise les centimes
        currency: currency,
        payment_method: {
          type: paymentMethod
        }
      };

      // Ajouter les informations client si disponibles
      if (customerInfo) {
        transactionPayload.customer = {
          firstname: customerInfo.firstName,
          lastname: customerInfo.lastName,
          email: customerInfo.email,
          phone: customerInfo.phone
        };
      }

      // Appel à l'API Fedapay
      const response = await fetch(`${this.fedapayUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.publicKey}`
        },
        body: JSON.stringify(transactionPayload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'initiation du paiement');
      }

      const data = await response.json();

      // Sauvegarder la transaction localement
      StorageService.set(`payment_${orderId}`, {
        transactionId: data.id,
        orderId,
        status: 'initiated',
        createdAt: new Date().toISOString()
      });

      return data;
    }, 'InitiatePayment');
  }

  /**
   * Charge la page de paiement Fedapay
   */
  async loadPaymentPage(transactionId) {
    return this.safeCall(async () => {
      const response = await fetch(
        `${this.fedapayUrl}/transactions/${transactionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.publicKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Impossible de charger la page de paiement');
      }

      const data = await response.json();
      return data;
    }, 'LoadPaymentPage');
  }

  /**
   * Vérifie le statut d'une transaction
   */
  async checkPaymentStatus(transactionId) {
    return this.safeCall(async () => {
      const response = await fetch(
        `${this.fedapayUrl}/transactions/${transactionId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.publicKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Impossible de vérifier le statut du paiement');
      }

      const data = await response.json();

      // Mettre à jour le statut local
      StorageService.set(`payment_${transactionId}`, {
        ...StorageService.get(`payment_${transactionId}`),
        status: data.status,
        updatedAt: new Date().toISOString()
      });

      return data;
    }, 'CheckPaymentStatus');
  }

  /**
   * Enregistre un paiement dans la base de données
   */
  async recordPayment(orderId, paymentData) {
    return this.safeCall(async () => {
      const { error } = await this.supabase
        .from('payments')
        .insert({
          order_id: orderId,
          transaction_id: paymentData.transactionId,
          amount: paymentData.amount,
          currency: paymentData.currency || 'XOF',
          method: paymentData.method,
          status: paymentData.status || 'pending',
          reference: paymentData.reference,
          metadata: paymentData.metadata || {},
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    }, 'RecordPayment');
  }

  /**
   * Valide un paiement et met à jour la commande
   */
  async validatePayment(orderId, transactionId) {
    return this.safeCall(async () => {
      // Vérifier le statut auprès de Fedapay
      const transaction = await this.checkPaymentStatus(transactionId);

      if (transaction.status !== 'approved') {
        throw new Error(`Paiement ${transaction.status}`);
      }

      // Mettre à jour le statut de la commande
      const { error } = await this.supabase
        .from('orders')
        .update({
          status: 'confirmed',
          paid_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Enregistrer le paiement
      await this.recordPayment(orderId, {
        transactionId,
        amount: transaction.amount / 100, // Convertir des centimes
        currency: transaction.currency,
        method: transaction.type,
        status: 'completed',
        reference: transaction.reference
      });

      return { success: true, transaction };
    }, 'ValidatePayment');
  }

  /**
   * Crée un panier de paiement (optionnel, pour intégration custom)
   */
  async createPaymentCart(cartItems, customerId) {
    return this.safeCall(async () => {
      const items = cartItems.map(item => ({
        label: item.productName,
        quantity: item.quantity,
        unit_price: Math.round(item.price * 100) // En centimes
      }));

      const cartPayload = {
        customer_id: customerId,
        items: items
      };

      const response = await fetch(`${this.fedapayUrl}/carts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.publicKey}`
        },
        body: JSON.stringify(cartPayload)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création du panier');
      }

      const data = await response.json();
      return data;
    }, 'CreatePaymentCart');
  }

  /**
   * Récupère les méthodes de paiement disponibles
   */
  async getPaymentMethods() {
    return this.safeCall(async () => {
      const response = await fetch(`${this.fedapayUrl}/payment_methods`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.publicKey}`
        }
      });

      if (!response.ok) {
        // Retourner les méthodes par défaut en cas d'erreur
        return [
          { id: 'mobile_money', label: 'Mobile Money', icon: '📱' },
          { id: 'card', label: 'Carte Bancaire', icon: '💳' }
        ];
      }

      const data = await response.json();
      return data;
    }, 'GetPaymentMethods');
  }

  /**
   * Gère les webhooks de Fedapay (pour le serveur backend)
   */
  async handleWebhook(payload, signature) {
    try {
      // Vérifier la signature du webhook
      const isValid = this.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        throw new Error('Webhook signature invalide');
      }

      const { event, data } = payload;

      switch (event) {
        case 'transaction.approved':
          await this.onPaymentApproved(data);
          break;
        case 'transaction.declined':
          await this.onPaymentDeclined(data);
          break;
        case 'transaction.pending':
          await this.onPaymentPending(data);
          break;
        default:
          console.log('Événement webhook non géré:', event);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook handling error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Traite un paiement approuvé
   */
  async onPaymentApproved(data) {
    const { transaction_id, order_id } = data;
    await this.validatePayment(order_id, transaction_id);
    NotificationService.success('Paiement confirmé! Votre commande est en préparation.');
  }

  /**
   * Traite un paiement décliné
   */
  async onPaymentDeclined(data) {
    const { order_id } = data;
    await this.supabase
      .from('orders')
      .update({ status: 'payment_failed' })
      .eq('id', order_id);
  }

  /**
   * Traite un paiement en attente
   */
  async onPaymentPending(data) {
    const { order_id } = data;
    // Laisser la commande en attente de confirmation
  }

  /**
   * Vérifie la signature du webhook
   */
  verifyWebhookSignature(payload, signature) {
    // Implémenter la vérification HMAC avec la clé secrète Fedapay
    // À adapter selon la documentation Fedapay
    return true; // À remplacer par la vraie implémentation
  }

  /**
   * Teste la configuration Fedapay
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.fedapayUrl}/transactions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.publicKey}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Fedapay connection test failed:', error);
      return false;
    }
  }
}

/**
 * Instance singleton de PaymentService
 */
export const paymentService = new PaymentService();
