-- ============================================================================
-- SCHOOLBOX - Schéma de Base de Données Supabase
-- Exécutez ce script dans le SQL Editor de Supabase pour créer l'infrastructure
-- ============================================================================

-- ============================================================================
-- 1. TABLE: UTILISATEURS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'vendor')),
  bio TEXT,
  preferred_language VARCHAR(10) DEFAULT 'fr',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Index sur email pour les connexions rapides
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- 2. TABLE: ADRESSES DE LIVRAISON
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  type VARCHAR(50) DEFAULT 'home' CHECK (type IN ('home', 'work', 'other')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  street_address VARCHAR(255),
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Benin',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_addresses_user ON delivery_addresses(user_id);

-- ============================================================================
-- 3. TABLE: ÉCOLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  city VARCHAR(100),
  district VARCHAR(100),
  logo_url VARCHAR(500),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_active ON schools(active);
CREATE INDEX idx_schools_city ON schools(city);

-- ============================================================================
-- 4. TABLE: CLASSES SCOLAIRES
-- ============================================================================
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools ON DELETE CASCADE,
  level VARCHAR(50) NOT NULL, -- '6e', '5e', '4e', '3e', etc.
  name VARCHAR(100),
  capacity INT DEFAULT 30,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_classes_school ON classes(school_id);

-- ============================================================================
-- 5. TABLE: CATÉGORIES DE PRODUITS
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  image_url VARCHAR(500),
  position INT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_active ON product_categories(active);

-- ============================================================================
-- 6. TABLE: PRODUITS
-- ============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  category_id UUID REFERENCES product_categories ON DELETE SET NULL,
  description TEXT,
  image_url VARCHAR(500),
  featured BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  promo_percentage NUMERIC(5, 2),
  popularity INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_featured ON products(featured);

-- ============================================================================
-- 7. TABLE: VARIANTES DE PRODUITS (couleur, taille, qualité)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products ON DELETE CASCADE,
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(100), -- p.ex. "Bleu", "Grand", "Premium"
  price NUMERIC(10, 2) NOT NULL,
  cost NUMERIC(10, 2),
  stock INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);

-- ============================================================================
-- 8. TABLE: LISTES SCOLAIRES (produits requis par école/classe)
-- ============================================================================
CREATE TABLE IF NOT EXISTS school_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products ON DELETE CASCADE,
  required BOOLEAN DEFAULT TRUE,
  sequence INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(school_id, class_id, product_id)
);

CREATE INDEX idx_school_lists_school ON school_lists(school_id);
CREATE INDEX idx_school_lists_class ON school_lists(class_id);
CREATE INDEX idx_school_lists_product ON school_lists(product_id);

-- ============================================================================
-- 9. TABLE: COMMANDES
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'payment_failed')),
  subtotal NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) DEFAULT 0,
  shipping_cost NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  delivery_address_id UUID REFERENCES delivery_addresses,
  delivery_info JSONB, -- Sauvegarde les informations de livraison
  notes TEXT,
  paid_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  tracking_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- ============================================================================
-- 10. TABLE: ARTICLES DE COMMANDE
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================================================
-- 11. TABLE: PAIEMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders ON DELETE CASCADE,
  transaction_id VARCHAR(255) UNIQUE,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'XOF',
  method VARCHAR(50) NOT NULL, -- 'mobile_money', 'card', 'wallet'
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  reference VARCHAR(255),
  metadata JSONB,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================================
-- 12. TABLE: PARRAINAGES / CODES PROMO
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  discount_percentage NUMERIC(5, 2) DEFAULT 10,
  max_uses INT,
  used_count INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referrals_code ON referrals(code);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);

-- ============================================================================
-- 13. TABLE: UTILISATIONS DE CODES PARRAINAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  order_id UUID REFERENCES orders ON DELETE SET NULL,
  discount_amount NUMERIC(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(referral_id, user_id)
);

-- ============================================================================
-- 14. TABLE: AVIS / COMMENTAIRES DE PRODUITS
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_reviews_user ON product_reviews(user_id);

-- ============================================================================
-- 15. TABLE: NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users ON DELETE CASCADE,
  type VARCHAR(50), -- 'order_status', 'promotion', 'news'
  title VARCHAR(255),
  message TEXT,
  related_order_id UUID REFERENCES orders ON DELETE SET NULL,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- ============================================================================
-- POLICIES (Row Level Security)
-- ============================================================================

-- Activer RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs ne peuvent voir que leurs propres données
CREATE POLICY "Users can only view their own profile"
ON users
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
USING (auth.uid() = id);

-- Adresses de livraison: uniquement les siennes
CREATE POLICY "Users can only manage their own addresses"
ON delivery_addresses
FOR ALL
USING (auth.uid() = user_id);

-- Commandes: uniquement les siennes
CREATE POLICY "Users can only view their own orders"
ON orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only create their own orders"
ON orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Paiements liés aux commandes
CREATE POLICY "Users can view payments for their orders"
ON payments
FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders WHERE user_id = auth.uid()
  )
);

-- Notifications: uniquement les siennes
CREATE POLICY "Users can only view their own notifications"
ON notifications
FOR SELECT
USING (auth.uid() = user_id);

-- ============================================================================
-- VUES UTILES
-- ============================================================================

CREATE OR REPLACE VIEW user_order_summary AS
SELECT
  u.id,
  u.email,
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as completed_orders,
  SUM(o.total_amount) as total_spent,
  MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.email;

CREATE OR REPLACE VIEW product_sales_stats AS
SELECT
  p.id,
  p.name,
  COUNT(oi.id) as total_sold,
  SUM(oi.quantity) as total_quantity,
  AVG(oi.price) as avg_price,
  SUM(oi.quantity * oi.price) as revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name;

-- ============================================================================
-- FONCTIONS UTILES
-- ============================================================================

-- Fonction pour appliquer un code de parrainage
CREATE OR REPLACE FUNCTION apply_referral_code(p_code VARCHAR, p_user_id UUID)
RETURNS TABLE (success BOOLEAN, discount_amount NUMERIC, message VARCHAR) AS $$
DECLARE
  v_referral_id UUID;
  v_discount_percentage NUMERIC;
BEGIN
  -- Vérifier que le code existe et est actif
  SELECT id, discount_percentage INTO v_referral_id, v_discount_percentage
  FROM referrals
  WHERE code = p_code
    AND active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR used_count < max_uses);

  IF v_referral_id IS NULL THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 0::NUMERIC, 'Code invalide ou expiré'::VARCHAR;
    RETURN;
  END IF;

  -- Vérifier que l'utilisateur n'a pas déjà utilisé ce code
  IF EXISTS (SELECT 1 FROM referral_uses WHERE referral_id = v_referral_id AND user_id = p_user_id) THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 0::NUMERIC, 'Vous avez déjà utilisé ce code'::VARCHAR;
    RETURN;
  END IF;

  -- Enregistrer l'utilisation
  INSERT INTO referral_uses (referral_id, user_id)
  VALUES (v_referral_id, p_user_id);

  -- Incrémenter le compteur
  UPDATE referrals SET used_count = used_count + 1 WHERE id = v_referral_id;

  RETURN QUERY SELECT TRUE::BOOLEAN, v_discount_percentage::NUMERIC, 'Code appliqué avec succès'::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEX SUPPLÉMENTAIRES POUR LES PERFORMANCES
-- ============================================================================

CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
CREATE INDEX idx_product_variants_product_stock ON product_variants(product_id, stock);
CREATE INDEX idx_school_lists_school_class ON school_lists(school_id, class_id);

-- ============================================================================
-- DONNÉES DE DÉMARRAGE (optionnel)
-- ============================================================================

-- Insérer une catégorie par défaut
INSERT INTO product_categories (name, slug, description)
VALUES ('Non catégorisé', 'non-categorie', 'Produits sans catégorie')
ON CONFLICT DO NOTHING;

-- Vous pouvez ajouter d'autres données initiales ici

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
