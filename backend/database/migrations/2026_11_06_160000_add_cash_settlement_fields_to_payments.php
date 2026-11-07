<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->decimal('cash_received', 12, 2)->nullable();
            $table->decimal('cash_change', 12, 2)->nullable();
            $table->string('idempotency_key', 64)->nullable()->unique('payments_idempotency_key_unique');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->dropUnique('payments_idempotency_key_unique');
            $table->dropColumn(['cash_received', 'cash_change', 'idempotency_key']);
        });
    }
};
