-- Additive indexes for date-range reports and active table order lookups.
CREATE INDEX `tables_current_order_id_idx` ON `tables`(`current_order_id`);
CREATE INDEX `orders_created_at_idx` ON `orders`(`created_at`);
