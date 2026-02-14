<?php
/**
 * FILE: CouponController.php
 * SCOPO: Calcola lo sconto da applicare in base a codice coupon o codice referral.
 *
 * COSA ENTRA:
 *   - Request con coupon (codice inserito) e total (totale carrello in euro)
 *
 * COSA ESCE:
 *   - JSON con type (coupon/referral), percentage, discount_amount, new_total, new_total_raw
 *   - JSON error se codice non valido (HTTP 404) o auto-referral (HTTP 422)
 *
 * CHIAMATO DA:
 *   - routes/api.php — POST /api/coupon
 *   - nuxt: pages/checkout.vue (campo codice promozionale)
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno (sola lettura: verifica coupon e calcola sconto senza salvare)
 *
 * ERRORI TIPICI:
 *   - 404: codice non corrisponde a nessun coupon attivo ne' codice referral
 *   - 422: utente sta tentando di usare il proprio codice referral
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/Coupon.php — modello coupon con code, percentage, active
 *   - ReferralController.php — gestione completa dei codici referral e commissioni
 */

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\User;
use Illuminate\Http\Request;
use App\Cart\MyMoney;
class CouponController extends Controller
{
    // Calcola lo sconto da applicare in base al codice inserito dall'utente
    public function calculateCoupon(Request $request) {
        $couponCode = $request->input('coupon');   // Il codice inserito dall'utente
        $total = $request->input('total');          // Il totale del carrello in euro

        // PRIMA controlliamo se e' un coupon classico (creato dall'admin)
        // Cerchiamo nel database un coupon con questo codice che sia ancora attivo
        $coupon = Coupon::where('code', $couponCode)->where('active', true)->first();

        if ($coupon) {
            // Calcoliamo lo sconto in base alla percentuale del coupon
            $percentageValue = $coupon->percentage;
            $discountAmount = $total * ($percentageValue / 100);
            $finalAmount = $total - $discountAmount;

            // Convertiamo il totale scontato in centesimi per la formattazione
            $finalAmountCents = intval(round($finalAmount * 100));
            $newAmount = new MyMoney($finalAmountCents);

            return response()->json([
                'success' => true,
                'type' => 'coupon',
                'percentage' => $percentageValue,
                'discount_amount' => round($discountAmount, 2),
                'new_total' => $newAmount->formatted(),          // Totale formattato (es. "8,55 EUR")
                'new_total_raw' => round($finalAmount, 2),       // Totale come numero (es. 8.55)
            ]);
        }

        // POI controlliamo se e' un codice referral di un Partner Pro
        // I codici referral sono codici di 8 caratteri assegnati ai Partner Pro
        $proUser = User::where('referral_code', strtoupper($couponCode))
            ->where('role', 'Partner Pro')
            ->first();

        if ($proUser) {
            $buyer = auth()->user();

            // L'utente non puo' usare il proprio codice referral su se stesso
            if ($proUser->id === $buyer->id) {
                return response()->json([
                    'error' => 'Non puoi usare il tuo stesso codice referral.'
                ], 422);
            }

            // I codici referral danno sempre il 5% di sconto
            $percentageValue = 5;
            $discountAmount = $total * ($percentageValue / 100);
            $finalAmount = $total - $discountAmount;

            $finalAmountCents = intval(round($finalAmount * 100));
            $newAmount = new MyMoney($finalAmountCents);

            return response()->json([
                'success' => true,
                'type' => 'referral',
                'percentage' => $percentageValue,
                'discount_amount' => round($discountAmount, 2),
                'new_total' => $newAmount->formatted(),
                'new_total_raw' => round($finalAmount, 2),
                'referral_code' => strtoupper($couponCode),
                'pro_user_name' => $proUser->name,
            ]);
        }

        // Se il codice non corrisponde ne' a un coupon ne' a un codice referral, e' non valido
        return response()->json([
            'error' => 'Codice non valido'
        ], 404);
    }
}
