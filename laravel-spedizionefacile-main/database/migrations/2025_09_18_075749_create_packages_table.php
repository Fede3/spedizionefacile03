<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('packages', function (Blueprint $table) {
            $table->id();
            /* $table->foreignId('shipment_id')->constrained('shipments')->onDelete('cascade'); */
            $table->string('package_type')->required();
            $table->smallInteger('quantity')->unsigned()->required();
            $table->string('weight')->required();
            $table->string('first_size')->required();
            $table->string('second_size')->required();
            $table->string('third_size')->required();
            $table->string('weight_price')->nullable();
            $table->string('volume_price')->nullable();
            $table->string('single_price')->nullable();

            $table->foreignId('origin_address_id')->constrained('package_addresses');
            $table->foreignId('destination_address_id')->constrained('package_addresses');
            $table->foreignId('service_id')->constrained('services');
            $table->foreignId('user_id')->required()->constrained()->onDelete('cascade'); 

            /* $table->foreignId('origin_address_id')->constrained('addresses');
            $table->foreignId('destination_address_id')->constrained('addresses'); */
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('packages');
    }
};
