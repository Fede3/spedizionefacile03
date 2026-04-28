<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('brt_parcel_id')->nullable()->after('status');
            $table->string('brt_numeric_sender_reference')->nullable()->after('brt_parcel_id');
            $table->string('brt_tracking_url')->nullable()->after('brt_numeric_sender_reference');
            $table->text('brt_label_base64')->nullable()->after('brt_tracking_url');
            $table->string('brt_pudo_id')->nullable()->after('brt_label_base64');
            $table->boolean('is_cod')->default(false)->after('brt_pudo_id');
            $table->integer('cod_amount')->nullable()->after('is_cod');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'brt_parcel_id',
                'brt_numeric_sender_reference',
                'brt_tracking_url',
                'brt_label_base64',
                'brt_pudo_id',
                'is_cod',
                'cod_amount',
            ]);
        });
    }
};
