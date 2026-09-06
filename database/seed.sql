USE pos;

INSERT INTO users (name, email, password_hash, role) VALUES
  ('POS Owner', 'owner@pos.local', 'scrypt$16384$8$1$M4-QduS4vOkrVaSvYy7lGw$kwghdsBQ590o6dp9P2yWDVSZrf8aPqqW4BhjlRhZwPGIGKeEAltwWhps7KfaX9rdi9YOHVpEEmh7wneW3j4UWg', 'owner'),
  ('POS Cashier', 'cashier@pos.local', 'scrypt$16384$8$1$M4-QduS4vOkrVaSvYy7lGw$kwghdsBQ590o6dp9P2yWDVSZrf8aPqqW4BhjlRhZwPGIGKeEAltwWhps7KfaX9rdi9YOHVpEEmh7wneW3j4UWg', 'kasir'),
  ('POS Waiter', 'waiters@pos.local', 'scrypt$16384$8$1$M4-QduS4vOkrVaSvYy7lGw$kwghdsBQ590o6dp9P2yWDVSZrf8aPqqW4BhjlRhZwPGIGKeEAltwWhps7KfaX9rdi9YOHVpEEmh7wneW3j4UWg', 'waiters')
ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), is_active = TRUE;

INSERT INTO categories (name, sort_order, is_active) VALUES
  ('Coffee', 1, TRUE),
  ('Non Coffee', 2, TRUE),
  ('Food', 3, TRUE),
  ('Snack', 4, TRUE),
  ('Signature', 5, TRUE),
  ('Breakfast', 6, TRUE),
  ('Promo', 7, TRUE)
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order), is_active = VALUES(is_active);

INSERT INTO app_settings (`key`, value, created_at, updated_at) VALUES
  ('cafe', JSON_OBJECT(
    'profile', JSON_OBJECT(
      'cafeName', 'POS',
      'phone', '+62 812-0000-0000',
      'address', 'Global location'
    ),
    'tax', JSON_OBJECT(
      'taxRate', 5,
      'serviceRate', 0,
      'currency', 'IDR'
    ),
    'payments', JSON_OBJECT(
      'cash', true,
      'qris', true,
      'transfer', false
    ),
    'qrOptions', JSON_OBJECT(
      'guestOrdering', true,
      'customerName', true,
      'callWaiter', true,
      'autoAcceptQr', false
    ),
    'hours', JSON_ARRAY(
      JSON_OBJECT('label', 'Monday - Thursday', 'open', '09:00', 'close', '22:00', 'isOpen', true),
      JSON_OBJECT('label', 'Friday', 'open', '08:00', 'close', '23:00', 'isOpen', true),
      JSON_OBJECT('label', 'Saturday - Sunday', 'open', '08:00', 'close', '23:00', 'isOpen', true)
    )
  ), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE value = VALUES(value);

INSERT INTO tables (code, name, area, seats, status, qr_token, scans_today) VALUES
  ('A1', 'Indoor Window', 'Indoor', 2, 'available', 'table-a1-token', 18),
  ('A4', 'Indoor Center', 'Indoor', 4, 'ready', 'table-a4-token', 42),
  ('A9', 'Indoor Sofa', 'Indoor', 4, 'waiting_payment', 'table-a9-token', 31),
  ('B2', 'Bar Area', 'Bar', 2, 'preparing', 'table-b2-token', 24),
  ('B7', 'Outdoor Bench', 'Outdoor', 4, 'need_waiter', 'table-b7-token', 27),
  ('C2', 'Terrace', 'Terrace', 3, 'waiting_payment', 'table-c2-token', 22),
  ('O1', 'Outdoor Surf Corner', 'Outdoor', 4, 'inactive', 'table-o1-token', 9)
ON DUPLICATE KEY UPDATE name = VALUES(name), area = VALUES(area), seats = VALUES(seats), status = VALUES(status), scans_today = VALUES(scans_today);

INSERT INTO menu_items (category_id, name, description, price, old_price, image_url, is_available, is_best_seller, badge)
SELECT c.id, v.name, v.description, v.price, v.old_price, v.image_url, v.is_available, v.is_best_seller, v.badge
FROM (
  SELECT 'Coffee' category, 'House Latte' name, 'Espresso, fresh milk, and smooth house syrup.' description, 32000 price, NULL old_price, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80' image_url, TRUE is_available, TRUE is_best_seller, 'Signature' badge
  UNION ALL SELECT 'Signature', 'Krui Sunset Mocktail', 'Tropical citrus, soda, and beach-day freshness.', 36000, NULL, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80', TRUE, TRUE, 'Best Seller'
  UNION ALL SELECT 'Coffee', 'Iced Americano', 'Clean espresso over ice for a bright afternoon.', 26000, NULL, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80', TRUE, FALSE, NULL
  UNION ALL SELECT 'Food', 'Chicken Rice Bowl', 'Grilled chicken, warm rice, egg, and house sauce.', 45000, NULL, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', TRUE, FALSE, NULL
  UNION ALL SELECT 'Snack', 'Crispy Fries', 'Golden fries with house dipping sauce.', 28000, NULL, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80', TRUE, FALSE, NULL
  UNION ALL SELECT 'Non Coffee', 'Matcha Cloud', 'Creamy matcha latte with a soft vanilla finish.', 35000, NULL, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80', TRUE, FALSE, NULL
  UNION ALL SELECT 'Breakfast', 'Scrambled Eggs With Toast', 'Perfectly seasoned scrambled eggs served with warm toast.', 16990, NULL, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80', TRUE, TRUE, 'Popular'
  UNION ALL SELECT 'Breakfast', 'Greek Yogurt Parfait', 'Creamy Greek yogurt layered with ripe fruit and granola.', 21490, NULL, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80', TRUE, FALSE, NULL
  UNION ALL SELECT 'Breakfast', 'Vegetable Omelette', 'Farm-fresh eggs filled with colorful seasonal vegetables.', 17090, 18990, 'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=600&q=80', FALSE, FALSE, 'Disc 10%'
  UNION ALL SELECT 'Breakfast', 'Smoked Salmon Bagel', 'A savory brunch classic with salmon and cream cheese.', 18990, NULL, 'https://images.unsplash.com/photo-1485963631004-f2f00b1d6606?auto=format&fit=crop&w=600&q=80', TRUE, FALSE, NULL
  UNION ALL SELECT 'Breakfast', 'Belgian Waffles', 'Crisp golden exterior with a soft, buttery interior.', 19490, NULL, 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80', TRUE, FALSE, NULL
) v
JOIN categories c ON c.name = v.category
WHERE NOT EXISTS (SELECT 1 FROM menu_items mi WHERE mi.name = v.name);

INSERT INTO orders (order_number, table_id, customer_name, type, status, source, guests, subtotal, tax, service_charge, total, notes)
SELECT '925', t.id, 'Ariel Hikmat', 'dine_in', 'ready', 'qr', 4, 73790, 3650, 9900, 87340, 'make the dish a bit spicy'
FROM tables t WHERE t.code = 'A4'
ON DUPLICATE KEY UPDATE status = VALUES(status), total = VALUES(total);

INSERT INTO orders (order_number, table_id, customer_name, type, status, source, guests, subtotal, tax, service_charge, total, notes)
SELECT '921', t.id, 'Denis Freeman', 'dine_in', 'preparing', 'manual', 2, 54880, 2990, 0, 57870, NULL
FROM tables t WHERE t.code = 'B2'
ON DUPLICATE KEY UPDATE status = VALUES(status), total = VALUES(total);

INSERT INTO orders (order_number, table_id, customer_name, type, status, source, guests, subtotal, tax, service_charge, total, notes)
VALUES
  ('916', NULL, 'Morgan Cox', 'takeaway', 'pending', 'qr', 1, 82820, 4140, 0, 86960, NULL),
  ('919', NULL, 'Paul Rey', 'takeaway', 'preparing', 'manual', 1, 93295, 4665, 0, 97960, NULL)
ON DUPLICATE KEY UPDATE status = VALUES(status), total = VALUES(total);

INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes)
SELECT o.id, mi.id, v.quantity, mi.price, v.notes
FROM (
  SELECT '925' order_number, 'Scrambled Eggs With Toast' item_name, 1 quantity, 'Extra egg' notes
  UNION ALL SELECT '925', 'Smoked Salmon Bagel', 1, NULL
  UNION ALL SELECT '925', 'Belgian Waffles', 2, 'Extra honey'
  UNION ALL SELECT '925', 'House Latte', 1, NULL
  UNION ALL SELECT '921', 'Chicken Rice Bowl', 1, NULL
  UNION ALL SELECT '921', 'Crispy Fries', 1, NULL
  UNION ALL SELECT '916', 'Chicken Rice Bowl', 1, NULL
  UNION ALL SELECT '916', 'Krui Sunset Mocktail', 1, NULL
) v
JOIN orders o ON o.order_number = v.order_number
JOIN menu_items mi ON mi.name = v.item_name
WHERE NOT EXISTS (
  SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.menu_item_id = mi.id
);

UPDATE tables t
JOIN orders o ON o.table_id = t.id
SET t.current_order_id = o.id
WHERE o.order_number IN ('925', '921');
