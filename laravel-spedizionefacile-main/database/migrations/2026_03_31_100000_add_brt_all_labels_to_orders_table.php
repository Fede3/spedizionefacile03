<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->json('brt_all_labels')->nullable()->after('brt_label_base64')
                ->comment('Etichette individuali multi-collo [{collo_index, parcel_id, stream}]');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('brt_all_labels');
        });
    }
};
