<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A scan is a guest opening /table/{token}, not every menu API refresh.
        // Keep only the table ID and UTC timestamp; do not store QR secrets,
        // visitor IP addresses or other personal data.
        Schema::create('qr_scan_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('table_id')
                ->constrained('tables')
                ->cascadeOnDelete();
            $table->dateTime('scanned_at', 3);
            $table->index(['table_id', 'scanned_at'], 'qr_scan_events_table_time_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_scan_events');
    }
};
