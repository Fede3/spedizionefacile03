<?php

namespace App\Models;

use App\Models\Order;
use App\Models\Package;
use App\Models\UserAddress;
use App\Models\WalletMovement;
use App\Models\ReferralUsage;
use App\Models\WithdrawalRequest;
use Illuminate\Support\Str;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /* HasApiTokens, */

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'surname',
        'email',
        'telephone_number',
        'password',
        'role',
        'referral_code',
        'identifier',
        'email_verified_at',
        'stripe_account_id',
        'customer_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'created_at',
        'email_verified_at',
        'updated_at',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /* protected static function booted()
    {
        static::creating(function ($user) {
            $user->identifier = (string) Str::uuid();
        });
    } */

    public function isAdmin(): bool {
        return $this->role === 'Admin';
    }

    public function addresses() {
        return $this->hasMany(UserAddress::class);
    }

    /* public function cart() {
        return $this->belongsToMany(Package::class, 'cart_user')
                    ->withPivot('quantity')
                    ->withTimestamps();
    } */

    /* public function cart() {
        return $this->hasMany(CartUser::class); // carrello dell'utente
    } */

    public function packages() {
        return $this->hasMany(Package::class);
    }

    public function orders() {
        return $this->hasMany(Order::class);
    }

    public function isPro(): bool {
        return $this->role === 'Partner Pro';
    }

    public function walletMovements() {
        return $this->hasMany(WalletMovement::class);
    }

    public function referralUsagesAsPro() {
        return $this->hasMany(ReferralUsage::class, 'pro_user_id');
    }

    public function withdrawalRequests() {
        return $this->hasMany(WithdrawalRequest::class);
    }

    public function walletBalance(): float {
        $credits = $this->walletMovements()
            ->where('status', 'confirmed')
            ->where('type', 'credit')
            ->sum('amount');
        $debits = $this->walletMovements()
            ->where('status', 'confirmed')
            ->where('type', 'debit')
            ->sum('amount');
        return round($credits - $debits, 2);
    }

    public function commissionBalance(): float {
        $earned = $this->referralUsagesAsPro()
            ->where('status', 'confirmed')
            ->sum('commission_amount');
        $withdrawn = $this->withdrawalRequests()
            ->whereIn('status', ['approved', 'completed'])
            ->sum('amount');
        return round($earned - $withdrawn, 2);
    }

    protected static function booted()
    {
        static::creating(function ($user) {
            if ($user->role === 'Partner Pro' && empty($user->referral_code)) {
                $user->referral_code = strtoupper(Str::random(8));
            }
        });
    }
}
