<?php
/**
 * FILE: Coupon.php
 * SCOPO: Modello buono sconto con codice, percentuale e stato attivo/disattivo.
 *
 * COSA ENTRA:
 *   - code (es. "SCONTO10"), percentage (es. 10), active (bool)
 *   - stripe_connected_account_id (opzionale, per multi-vendor)
 *
 * COSA ESCE:
 *   - Record nella tabella coupons
 *
 * CHIAMATO DA:
 *   - CouponController.php — calculateCoupon cerca coupon attivo per codice
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (modello semplice senza boot/observer)
 *
 * ERRORI TIPICI:
 *   - active deve essere true per essere utilizzabile (where active=true in query)
 *
 * DOCUMENTI CORRELATI:
 *   - CouponController.php — calcolo sconto con priorita': prima coupon, poi referral
 */

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
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
