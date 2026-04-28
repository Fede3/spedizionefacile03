<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('cod_payment_type', 5)->nullable()->after('cod_amount')
                ->comment('Tipo pagamento contrassegno BRT: BM=bonifico, CC=assegno circolare, AS=assegno bancario');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('cod_payment_type');
        });
    }
};
