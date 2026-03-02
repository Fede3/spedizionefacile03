<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNotificationPreference extends Model
{
    protected $fillable = [
        'user_id',
        'referral_site_enabled',
        'referral_email_enabled',
        'referral_sms_enabled',
        'email_opt_in_at',
        'sms_opt_in_at',
    ];

    protected $casts = [
        'referral_site_enabled' => 'boolean',
        'referral_email_enabled' => 'boolean',
        'referral_sms_enabled' => 'boolean',
        'email_opt_in_at' => 'datetime',
        'sms_opt_in_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
