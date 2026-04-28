<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add referral_code and wallet fields to users
        Schema::table('users', function (Blueprint $table) {
            $table->string('referral_code', 8)->nullable()->unique()->after('role');
        });

        // Track referral usages: who used whose code, on which order
        Schema::create('referral_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('pro_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('referral_code', 8);
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('order_amount', 12, 2);
            $table->decimal('discount_amount', 12, 2);
            $table->decimal('commission_amount', 12, 2);
            $table->string('status')->default('pending'); // pending, confirmed, paid
            $table->timestamps();
        });

        // Withdrawal requests: Pro users request to cash out commissions
        Schema::create('withdrawal_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('EUR');
            $table->string('status')->default('pending'); // pending, approved, rejected, completed
            $table->text('admin_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Add user_id to wallet_movements (was global before)
        if (Schema::hasTable('wallet_movements') && !Schema::hasColumn('wallet_movements', 'user_id')) {
            Schema::table('wallet_movements', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
                $table->string('source')->nullable()->after('description'); // stripe, commission, withdrawal, refund
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('withdrawal_requests');
        Schema::dropIfExists('referral_usages');

        if (Schema::hasColumn('users', 'referral_code')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('referral_code');
            });
        }

        if (Schema::hasTable('wallet_movements')) {
            if (Schema::hasColumn('wallet_movements', 'user_id')) {
                Schema::table('wallet_movements', function (Blueprint $table) {
                    $table->dropForeign(['user_id']);
                    $table->dropColumn(['user_id', 'source']);
                });
            }
        }
    }
};
