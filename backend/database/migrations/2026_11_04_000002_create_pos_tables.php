<?php

use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\TableStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 80)->unique('categories_name_key');
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->index(['is_active', 'sort_order'], 'categories_is_active_sort_order_idx');
        });

        Schema::create('tables', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 30)->unique('tables_code_key');
            $table->string('name', 80);
            $table->string('area', 80)->default('Indoor');
            $table->integer('seats')->default(2);
            $table->enum('status', array_column(TableStatus::cases(), 'value'))
                ->default(TableStatus::Available->value);
            $table->string('qr_token', 120)->unique('tables_qr_token_key');
            $table->integer('scans_today')->default(0);
            // Matches Prisma: intentionally indexed, but not a database FK.
            // A FK here would create a circular dependency with orders.table_id.
            $table->unsignedBigInteger('current_order_id')->nullable();
            $table->dateTime('created_at', 3)->useCurrent();
            $table->dateTime('updated_at', 3)->useCurrent();

            $table->index('status', 'tables_status_idx');
            $table->index('current_order_id', 'tables_current_order_id_idx');
        });

        Schema::create('menu_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('category_id')
                ->constrained('categories')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->string('name', 140);
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2);
            $table->decimal('old_price', 12, 2)->nullable();
            $table->string('image_url', 500)->nullable();
            $table->boolean('is_available')->default(true);
            $table->boolean('is_best_seller')->default(false);
            $table->string('badge', 40)->nullable();
            $table->dateTime('created_at', 3)->useCurrent();
            $table->dateTime('updated_at', 3)->useCurrent();

            $table->index(['category_id', 'is_available'], 'menu_items_category_id_is_available_idx');
        });

        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->string('order_number', 40)->unique('orders_order_number_key');
            $table->foreignId('table_id')
                ->nullable()
                ->constrained('tables')
                ->nullOnDelete()
                ->cascadeOnUpdate();
            $table->string('customer_name', 120);
            $table->enum('type', array_column(OrderType::cases(), 'value'))
                ->default(OrderType::DineIn->value);
            $table->enum('status', array_column(OrderStatus::cases(), 'value'))
                ->default(OrderStatus::Pending->value);
            $table->enum('source', array_column(OrderSource::cases(), 'value'))
                ->default(OrderSource::Manual->value);
            $table->integer('guests')->default(1);
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('service_charge', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->dateTime('created_at', 3)->useCurrent();
            $table->dateTime('updated_at', 3)->useCurrent();

            $table->index(['status', 'created_at'], 'orders_status_created_at_idx');
            $table->index('created_at', 'orders_created_at_idx');
            $table->index('table_id', 'orders_table_id_idx');
        });

        Schema::create('order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')
                ->constrained('orders')
                ->cascadeOnDelete()
                ->cascadeOnUpdate();
            $table->foreignId('menu_item_id')
                ->constrained('menu_items')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->integer('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->text('notes')->nullable();
            $table->dateTime('created_at', 3)->useCurrent();

            $table->index('order_id', 'order_items_order_id_idx');
            $table->index('menu_item_id', 'order_items_menu_item_id_idx');
        });

        Schema::create('payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')
                ->constrained('orders')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
            $table->enum('method', array_column(PaymentMethod::cases(), 'value'));
            $table->decimal('amount', 12, 2);
            $table->enum('status', array_column(PaymentStatus::cases(), 'value'))
                ->default(PaymentStatus::Pending->value);
            $table->dateTime('paid_at', 3)->nullable();
            $table->dateTime('created_at', 3)->useCurrent();

            $table->index(['order_id', 'status'], 'payments_order_id_status_idx');
        });

        Schema::create('app_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('key', 80)->unique('app_settings_key_key');
            $table->json('value');
            $table->dateTime('created_at', 3)->useCurrent();
            $table->dateTime('updated_at', 3)->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('tables');
        Schema::dropIfExists('categories');
    }
};
