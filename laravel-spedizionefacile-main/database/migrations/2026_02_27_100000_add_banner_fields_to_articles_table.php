<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Modifica l'enum 'type' per supportare anche 'promo'
        // SQLite e MySQL gestiscono l'enum diversamente: usiamo change() per MySQL
        Schema::table('articles', function (Blueprint $table) {
            $table->string('type', 20)->default('guide')->change();
            $table->string('banner_image')->nullable()->after('featured_image');
            $table->string('banner_title')->nullable()->after('banner_image');
            $table->string('banner_subtitle')->nullable()->after('banner_title');
            $table->string('banner_cta_text')->nullable()->after('banner_subtitle');
            $table->string('banner_cta_url')->nullable()->after('banner_cta_text');
            $table->string('banner_bg_color', 20)->default('#095866')->after('banner_cta_url');
            $table->string('banner_text_color', 20)->default('#ffffff')->after('banner_bg_color');
            $table->string('banner_position', 30)->default('homepage_top')->after('banner_text_color');
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn([
                'banner_image',
                'banner_title',
                'banner_subtitle',
                'banner_cta_text',
                'banner_cta_url',
                'banner_bg_color',
                'banner_text_color',
                'banner_position',
            ]);
        });
    }
};
