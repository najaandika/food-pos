USE pos;

INSERT INTO app_settings (`key`, value, created_at, updated_at) VALUES
  ('cafe', JSON_OBJECT(
    'profile', JSON_OBJECT(
      'cafeName', 'POS',
      'phone', '+00 000 000 000',
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
ON DUPLICATE KEY UPDATE value = value;
