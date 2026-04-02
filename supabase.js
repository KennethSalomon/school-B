/* ═══════════════════════════════════════════
   SCHOOL BOX — supabase.js
   Configuration & helpers Supabase
   ⚠️ Remplace les valeurs ci-dessous par les
      vraies clés de ton projet Supabase
═══════════════════════════════════════════ */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 👇 Utilisation des variables d'environnement
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Auth helpers ──
export const Auth = {
  async signUp({ email, password, name, phone }) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, phone } }
    });
    if (error) throw error;
    return data;
  },

  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    localStorage.setItem('sb_user', JSON.stringify({ id: data.user.id, email, name: data.user.user_metadata?.name }));
    window.SB && (window.SB.user = JSON.parse(localStorage.getItem('sb_user')));
    return data;
  },

  async signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem('sb_user');
    window.SB && (window.SB.user = null);
    window.location.href = '/index.html';
  },

  async getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
  }
};

// ── Écoles ──
export const Schools = {
  async search(query) {
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, city, logo_url, classes')
      .ilike('name', `%${query}%`)
      .limit(10);
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('schools')
      .select('*, classes(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
};

// ── Fournitures ──
export const Products = {
  async getBySchoolAndClass(schoolId, classeId) {
    const { data, error } = await supabase
      .from('school_lists')
      .select(`
        id, required, note,
        products(id, name, description, category, image_url,
          product_variants(id, quality, price, stock))
      `)
      .eq('school_id', schoolId)
      .eq('classe_id', classeId);
    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('active', true)
      .order('category');
    if (error) throw error;
    return data;
  }
};

// ── Commandes ──
export const Orders = {
  async create(orderData) {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getMyOrders(userId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
};

// ── Parrainage ──
export const Referral = {
  async getMyCode(userId) {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async applyCode(code, userId) {
    const { data, error } = await supabase
      .rpc('apply_referral_code', { p_code: code, p_user_id: userId });
    if (error) throw error;
    return data;
  }
};