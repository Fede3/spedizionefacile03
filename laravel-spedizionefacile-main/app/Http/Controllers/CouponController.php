<?php
/**
 * FILE: CouponController.php
 * SCOPO: Preview/validazione di coupon o referral nel checkout.
 *
 * COSA ENTRA:
 *   - Request con coupon (codice inserito) e total (totale carrello in euro)
 *
 * COSA ESCE:
 *   - JSON con type (coupon/referral), percentage, discount_amount, new_total, new_total_raw
 *   - JSON error se codice non valido (HTTP 404) o auto-referral (HTTP 422)
 *
 * CHIAMATO DA:
 *   - routes/api.php -> POST /api/calculate-coupon
 *   - nuxt: composables/useCart.js -> validateCoupon()
 *   - nuxt: ShipmentStepPagamento / checkout UI
 *
 * EFFETTI COLLATERALI:
 *   - Nessuno: sola lettura, non salva lo sconto nell'ordine
 *
 * VINCOLI:
 *   - L'ordine di ricerca e': prima coupon admin, poi codice referral Partner Pro
 *   - I codici referral danno SEMPRE il 5% di sconto (hardcoded)
 *   - L'utente NON puo' usare il proprio codice referral su se stesso
 *   - Questa funzione produce solo una preview UI dello sconto
 *   - Non crea ReferralUsage, non muove WalletMovement e non persiste il discount nell'ordine
 *   - La commissione Partner Pro NON nasce qui: il credito reale viene registrato da ReferralRewardController
 *
 * ERRORI TIPICI:
 *   - 404: codice non corrisponde a nessun coupon attivo ne' codice referral
 *   - 422: utente sta tentando di usare il proprio codice referral
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per cambiare la percentuale referral: modificare "$percentageValue = 5" nel blocco $proUser
 *   - Per aggiungere un tipo di sconto: aggiungere un blocco dopo il check referral
 *
 * COLLEGAMENTI:
 *   - app/Models/Coupon.php -> modello coupon con code, percentage, active
 *   - ReferralRewardController.php -> accredito reale della commissione referral
 *   - composables/useCart.js -> preview coupon/referral lato checkout
 */

namespace App\Http\Controllers;

use App\Models\Coupon;
use Illuminate\Http\Request;
use App\Services\DiscountPreviewService;

class CouponController extends Controller
{
    /*
     * Boundary note:
     * - questo controller serve solo per preview/validazione del codice nel checkout;
     * - il source of truth monetario dell'ordine non nasce qui;
     * - per la parte economica post-ordine vedere ReferralRewardController.
     */

    // Calcola lo sconto da applicare in base al codice inserito dall'utente
    public function calculateCoupon(Request $request, DiscountPreviewService $discountPreviewService)
    {
        $data = $request->validate([
            'coupon' => 'required|string|max:50',
            'total' => 'required|numeric|min:0',
        ]);

        $couponCode = strtoupper(trim($data['coupon']));   // Il codice inserito dall'utente
        $total = $data['total'];          // Il totale del carrello in euro

        // PRIMA controlliamo se e' un coupon classico (creato dall'admin)
        // Cerchiamo nel database un coupon con questo codice che sia ancora attivo
        $coupon = Coupon::where('code', $couponCode)->where('active', true)->first();

        if ($coupon) {
            // SEC-NEW-07: Verifica anti-abuso (scadenza, limiti globali e per-utente)
            $userId = auth()->id();
            [$isValid, $errorMessage] = $coupon->validateForUser($userId);

            if (! $isValid) {
                return response()->json(['error' => $errorMessage], 422);
            }

            return response()->json(
                $discountPreviewService->buildCouponPreview($coupon, (float) $total)
            );
        }

        // POI controlliamo se e' un codice referral di un Partner Pro
        // I codici referral sono codici di 8 caratteri assegnati ai Partner Pro
        $proUser = $discountPreviewService->resolveReferralPartner($couponCode);

        if ($proUser) {
            $buyer = auth()->user();

            // L'utente non puo' usare il proprio codice referral su se stesso
            if ($proUser->id === $buyer->id) {
                return response()->json([
                    'error' => 'Non puoi usare il tuo stesso codice referral.'
                ], 422);
            }

            return response()->json(
                $discountPreviewService->buildReferralPreview($proUser, (float) $total, $couponCode)
            );
        }

        // Se il codice non corrisponde ne' a un coupon ne' a un codice referral, e' non valido
        return response()->json([
            'error' => 'Codice non valido'
        ], 404);
    }
}
