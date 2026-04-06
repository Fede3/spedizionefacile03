<?php
/**
 * FILE: Coupon.php
 * SCOPO: Modello buono sconto con codice, percentuale e stato attivo/disattivo.
 *
 * DOVE SI USA:
 *   - CouponController.php — calculateCoupon cerca coupon attivo per codice
 *   - Admin/CouponController.php — CRUD coupon dal pannello admin
 *
 * DATI IN INGRESSO:
 *   - code (es. "SCONTO10"), percentage (es. 10), active (bool)
 *   - stripe_connected_account_id (opzionale, per multi-vendor)
 *   Esempio: Coupon::create(['code' => 'SCONTO10', 'percentage' => 10, 'active' => true])
 *
 * DATI IN USCITA:
 *   - Record nella tabella coupons
 *   Esempio: Coupon::where('code', 'SCONTO10')->where('active', true)->first()
 *
 * VINCOLI:
 *   - active deve essere true per essere utilizzabile (query filtra sempre per active=true)
 *   - code deve essere unico (validato dal controller)
 *
 * ERRORI TIPICI:
 *   - Creare coupon senza active=true: non sara' utilizzabile dal frontend
 *   - percentage e' un intero (10 = 10%), non un decimale (0.10)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere scadenza: aggiungere campo expires_at in $fillable e nella migrazione
 *   - Per aggiungere limite utilizzi: aggiungere campo max_uses e contatore uses_count
 *
 * COLLEGAMENTI:
 *   - app/Http/Controllers/CouponController.php — calcolo sconto
 *   - app/Http/Controllers/Admin/CouponController.php — CRUD coupon admin
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    use HasFactory;

    /**
     * Campi compilabili dall'esterno.
     */
    protected $fillable = [
        'code',                          // Codice del coupon (es. "SCONTO10", "WELCOME20")
        'stripe_connected_account_id',   // ID dell'account Stripe collegato
        'percentage',                    // Percentuale di sconto (es. 10 = 10% di sconto)
        'active',                        // Se il coupon e' attivo e utilizzabile
    ];
}
