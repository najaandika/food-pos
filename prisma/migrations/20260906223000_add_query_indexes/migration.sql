-- Additive indexes for common POS filters and relations.
CREATE INDEX `categories_is_active_sort_order_idx` ON `categories`(`is_active`, `sort_order`);
CREATE INDEX `tables_status_idx` ON `tables`(`status`);
CREATE INDEX `menu_items_category_id_is_available_idx` ON `menu_items`(`category_id`, `is_available`);
CREATE INDEX `orders_status_created_at_idx` ON `orders`(`status`, `created_at`);
CREATE INDEX `orders_table_id_idx` ON `orders`(`table_id`);
CREATE INDEX `order_items_order_id_idx` ON `order_items`(`order_id`);
CREATE INDEX `order_items_menu_item_id_idx` ON `order_items`(`menu_item_id`);
CREATE INDEX `payments_order_id_status_idx` ON `payments`(`order_id`, `status`);
