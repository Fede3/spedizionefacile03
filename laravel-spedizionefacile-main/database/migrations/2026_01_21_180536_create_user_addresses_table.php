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
        Schema::create('user_addresses', function (Blueprint $table) {
             $table->id();
            $table->string('type')->required();
            $table->string('name')->required();
            $table->string('additional_information')->nullable();
            $table->string('address')->required();
            $table->string('number_type')->required();
            $table->string('address_number')->required();
            $table->string('intercom_code')->nullable();
            $table->string('country')->required();
            $table->string('city')->required();
            $table->string('postal_code')->required();
            $table->string('province')->required();
            $table->string('telephone_number')->required();
            $table->string('email')->nullable();
            $table->boolean('default')->default(false);

            $table->unsignedBigInteger('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_addresses');
    }
};
