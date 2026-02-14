<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = [
        'title', 'slug', 'type', 'meta_description', 'intro',
        'sections', 'faqs', 'featured_image', 'icon',
        'is_published', 'sort_order',
    ];

    protected $casts = [
        'sections' => 'array',
        'faqs' => 'array',
        'is_published' => 'boolean',
    ];

    public function scopeGuides($query) { return $query->where('type', 'guide'); }
    public function scopeServices($query) { return $query->where('type', 'service'); }
    public function scopePublished($query) { return $query->where('is_published', true); }
}
