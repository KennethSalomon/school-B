/**
 * SchoolBox - Service de Commandes
 * Gère la création et le suivi des commandes
 */

import { BaseAPIService } from '/js/services/api.service.js';

export class OrderService extends BaseAPIService {
  constructor() {
    super();
  }

  /**
   * Crée une nouvelle commande
   */
  async createOrder(orderData) {
    return this.safeCall(async () => {
      // Insérer la commande
      const { data: orderResult, error: orderError } = await this.supabase
        .from('orders')
        .insert({
          user_id: orderData.user_id,
          status: orderData.status || 'pending',
          subtotal: orderData.subtotal,
          tax_amount: orderData.tax_amount,
          shipping_cost: orderData.shipping_cost,
          total_amount: orderData.total_amount,
          delivery_info: orderData.delivery_info,
          notes: orderData.notes || '',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insérer les articles de la commande
      if (orderData.items && orderData.items.length > 0) {
        const orderItems = orderData.items.map(item => ({
          order_id: orderResult.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.price
        }));

        const { error: itemsError } = await this.supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      return orderResult;
    }, 'CreateOrder');
  }

  /**
   * Récupère les commandes de l'utilisateur
   */
  async getUserOrders(userId) {
    return this.safeCall(async () => {
      const { data, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            products(name, image_url),
            product_variants(quality, price)
          ),
          payments(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }, 'GetUserOrders');
  }

  /**
   * Récupère une commande par ID
   */
  async getOrderById(orderId) {
    return this.safeCall(async () => {
      const { data, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            products(name, image_url, description),
            product_variants(quality, price)
          ),
          payments(*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data;
    }, 'GetOrderById');
  }

  /**
   * Met à jour le statut d'une commande
   */
  async updateOrderStatus(orderId, status) {
    return this.safeCall(async () => {
      const { data, error } = await this.supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'UpdateOrderStatus');
  }

  /**
   * Cancelle une commande
   */
  async cancelOrder(orderId, reason) {
    return this.safeCall(async () => {
      const { data, error } = await this.supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'CancelOrder');
  }

  /**
   * Récupère statistiques / résumés de commandes
   */
  async getOrderStats(userId) {
    return this.safeCall(async () => {
      const { data, error } = await this.supabase
        .from('orders')
        .select('status, total_amount')
        .eq('user_id', userId);

      if (error) throw error;

      const stats = {
        totalOrders: data.length,
        totalSpent: data.reduce((sum, order) => sum + order.total_amount, 0),
        byStatus: {
          pending: data.filter(o => o.status === 'pending').length,
          confirmed: data.filter(o => o.status === 'confirmed').length,
          preparing: data.filter(o => o.status === 'preparing').length,
          shipped: data.filter(o => o.status === 'shipped').length,
          delivered: data.filter(o => o.status === 'delivered').length,
          cancelled: data.filter(o => o.status === 'cancelled').length
        }
      };

      return stats;
    }, 'GetOrderStats');
  }
}

/**
 * Instance singleton de OrderService
 */
export const orderService = new OrderService();
