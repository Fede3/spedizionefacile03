<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('client_submission_id')->nullable()->after('billing_data');
            $table->string('pricing_signature')->nullable()->after('client_submission_id');
            $table->unsignedInteger('pricing_snapshot_version')->nullable()->after('pricing_signature');
            $table->json('pricing_snapshot')->nullable()->after('pricing_snapshot_version');

            $table->unique(['user_id', 'client_submission_id'], 'orders_user_submission_unique');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('orders_user_submission_unique');
            $table->dropColumn([
                'client_submission_id',
                'pricing_signature',
                'pricing_snapshot_version',
                'pricing_snapshot',
            ]);
        });
    }
};
