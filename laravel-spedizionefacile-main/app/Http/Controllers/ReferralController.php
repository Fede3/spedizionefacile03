<?php
/**
 * FILE: ReferralController.php
 * SCOPO: Gestisce il sistema dei codici referral (codici amico) per i Partner Pro.
 *
 * COSA ENTRA:
 *   - Request con code (8 caratteri) per validate/storeReferral
 *   - Request con code, order_id, order_amount per apply
 *
 * COSA ESCE:
 *   - JSON con referral_code, total_earnings, referral_link, whatsapp_link per myCode
 *   - JSON con valid, discount_percent, pro_name per validate
 *   - JSON con success, discount_amount, usage per apply
 *   - JSON con has_discount, discount_percent per myDiscount
 *   - JSON con data (lista utilizzi), total_earnings per earnings
 *
 * CHIAMATO DA:
 *   - routes/api.php — GET /api/referral/my-code, POST /api/referral/validate
 *   - routes/api.php — POST /api/referral/apply, POST /api/referral/store
 *   - routes/api.php — GET /api/referral/my-discount, GET /api/referral/earnings
 *   - nuxt: pages/account/bonus.vue, pages/checkout.vue
 *
 * EFFETTI COLLATERALI:
 *   - Database: crea record in referral_usages (utilizzo codice)
 *   - Database: crea record in wallet_movements (commissione Partner Pro, tipo credit)
 *   - Database: aggiorna referral_code su utente (generazione al primo accesso)
 *   - Database: aggiorna referred_by su utente (salvataggio codice permanente)
 *
 * ERRORI TIPICI:
 *   - 403: utente non e' Partner Pro (myCode, earnings)
 *   - 404: codice referral non trovato o non appartenente a Partner Pro
 *   - 422: auto-referral (utente usa il proprio codice su se stesso)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/ReferralUsage.php — modello utilizzo referral con buyer_id, pro_user_id
 *   - app/Models/WalletMovement.php — movimento portafoglio per commissione
 *   - CouponController.php — calcolo sconto referral al checkout (sola lettura)
 */

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\ReferralUsage;
use App\Models\WalletMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
class ReferralController extends Controller
{
    // Mostra il codice referral del Partner Pro con le statistiche dei guadagni
    // Include anche i link pronti per condividere il codice (link diretto e WhatsApp)
    public function myCode(): JsonResponse
    {
        $user = auth()->user();

        // Solo i Partner Pro possono avere un codice referral
        if (!$user->isPro()) {
            return response()->json(['message' => 'Solo gli account Pro possono avere un codice referral.'], 403);
        }

        // Se l'utente non ha ancora un codice, ne generiamo uno casuale di 8 caratteri
        if (!$user->referral_code) {
            $user->referral_code = strtoupper(Str::random(8));
            $user->save();
        }

        // Calcoliamo le statistiche: guadagni totali e numero di utilizzi
        $totalEarnings = $user->referralUsagesAsPro()->where('status', 'confirmed')->sum('commission_amount');
        $totalUsages = $user->referralUsagesAsPro()->count();

        // Costruiamo i link per condividere il codice facilmente
        $baseUrl = config('app.frontend_url', config('app.url'));
        $referralLink = $baseUrl . '?ref=' . $user->referral_code;
        $whatsappMessage = urlencode("Spedisci con SpediamoFacile e ottieni il 5% di sconto! Usa il mio codice: {$user->referral_code} oppure registrati da qui: {$referralLink}");
        $whatsappLink = "https://wa.me/?text={$whatsappMessage}";

        return response()->json([
            'referral_code' => $user->referral_code,
            'total_earnings' => round($totalEarnings, 2),
            'total_usages' => $totalUsages,
            'referral_link' => $referralLink,
            'whatsapp_link' => $whatsappLink,
        ]);
    }

    // Verifica se un codice referral e' valido
    // Usato dal frontend per mostrare un messaggio di conferma prima di procedere al pagamento
    public function validate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:8'], // Il codice deve essere esattamente di 8 caratteri
        ]);

        // Cerchiamo un Partner Pro con questo codice referral
        $proUser = User::where('referral_code', strtoupper($data['code']))
            ->where('role', 'Partner Pro')
            ->first();

        if (!$proUser) {
            return response()->json(['valid' => false, 'message' => 'Codice non valido.'], 404);
        }

        // L'utente non puo' usare il proprio codice su se stesso
        if ($proUser->id === auth()->id()) {
            return response()->json(['valid' => false, 'message' => 'Non puoi usare il tuo stesso codice.'], 422);
        }

        return response()->json([
            'valid' => true,
            'discount_percent' => 5,
            'pro_name' => $proUser->name,
        ]);
    }

    // Applica il codice referral a un ordine specifico
    // Registra l'utilizzo del codice, calcola lo sconto e accredita la commissione al Partner Pro
    public function apply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:8'],
            'order_id' => ['required', 'integer'],
            'order_amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        // Cerchiamo il Partner Pro proprietario del codice
        $proUser = User::where('referral_code', strtoupper($data['code']))
            ->where('role', 'Partner Pro')
            ->first();

        if (!$proUser) {
            return response()->json(['message' => 'Codice referral non valido.'], 404);
        }

        $buyer = auth()->user();

        if ($proUser->id === $buyer->id) {
            return response()->json(['message' => 'Non puoi usare il tuo stesso codice.'], 422);
        }

        // Calcoliamo lo sconto per il compratore (5% dell'importo dell'ordine)
        $discountAmount = round($data['order_amount'] * 0.05, 2);
        // E la commissione per il Partner Pro (anche il 5%)
        $commissionAmount = round($data['order_amount'] * 0.05, 2);

        // Registriamo l'utilizzo del codice referral nel database
        $usage = ReferralUsage::create([
            'buyer_id' => $buyer->id,
            'pro_user_id' => $proUser->id,
            'referral_code' => strtoupper($data['code']),
            'order_id' => $data['order_id'],
            'order_amount' => $data['order_amount'],
            'discount_amount' => $discountAmount,
            'commission_amount' => $commissionAmount,
            'status' => 'confirmed',
        ]);

        // Accreditiamo la commissione nel portafoglio del Partner Pro
        // Questo movimento di denaro viene registrato nel sistema portafoglio
        WalletMovement::create([
            'user_id' => $proUser->id,
            'type' => 'credit',                    // "credit" = soldi in entrata
            'amount' => $commissionAmount,
            'currency' => 'EUR',
            'status' => 'confirmed',
            'idempotency_key' => 'commission_' . $usage->id,  // Chiave unica per evitare accrediti doppi
            'description' => 'Commissione referral da ' . $buyer->name . ' (ordine #' . $data['order_id'] . ')',
            'source' => 'commission',
            'reference' => 'referral_' . $usage->id,
        ]);

        return response()->json([
            'success' => true,
            'discount_amount' => $discountAmount,
            'usage' => $usage,
        ]);
    }

    /**
     * Salva il codice referral sull'account dell'utente.
     * Viene chiamato quando un utente si registra tramite un link referral (es. ?ref=ABC12345)
     * o quando inserisce manualmente un codice referral.
     * Il codice viene salvato in modo permanente, cosi' lo sconto si applica a tutti gli ordini futuri.
     */
    public function storeReferral(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:8'],
        ]);

        $code = strtoupper($data['code']);

        // Verifichiamo che il codice appartenga a un Partner Pro valido
        $proUser = User::where('referral_code', $code)
            ->where('role', 'Partner Pro')
            ->first();

        if (!$proUser) {
            return response()->json(['message' => 'Codice referral non valido.'], 404);
        }

        $user = auth()->user();

        if ($proUser->id === $user->id) {
            return response()->json(['message' => 'Non puoi usare il tuo stesso codice.'], 422);
        }

        // Salviamo il codice referral sull'utente in modo che sia permanente
        $user->referred_by = $code;
        $user->save();

        return response()->json([
            'success' => true,
            'referred_by' => $code,
            'discount_percent' => 5,
            'pro_name' => $proUser->name,
        ]);
    }

    /**
     * Mostra lo sconto referral attivo dell'utente.
     * Se l'utente e' stato invitato da un Partner Pro (ha un codice salvato),
     * restituisce le informazioni sullo sconto permanente.
     */
    public function myDiscount(): JsonResponse
    {
        $user = auth()->user();

        // Se l'utente non ha un codice referral salvato, non ha sconti attivi
        if (!$user->referred_by) {
            return response()->json([
                'has_discount' => false,
            ]);
        }

        // Verifichiamo che il Partner Pro sia ancora attivo
        $proUser = User::where('referral_code', $user->referred_by)
            ->where('role', 'Partner Pro')
            ->first();

        if (!$proUser) {
            return response()->json([
                'has_discount' => false,
            ]);
        }

        return response()->json([
            'has_discount' => true,
            'referral_code' => $user->referred_by,
            'discount_percent' => 5,
            'pro_name' => $proUser->name,
        ]);
    }

    // Mostra i guadagni del Partner Pro: lista di tutti gli utilizzi del suo codice referral
    // con i dettagli di chi l'ha usato e quanto ha guadagnato
    public function earnings(): JsonResponse
    {
        $user = auth()->user();

        if (!$user->isPro()) {
            return response()->json(['message' => 'Solo account Pro.'], 403);
        }

        // Recuperiamo tutti gli utilizzi del codice referral di questo Partner Pro
        // con i dati dell'acquirente che ha usato il codice
        $usages = $user->referralUsagesAsPro()
            ->with('buyer:id,name,email')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $usages,
            'total_earnings' => round($usages->where('status', 'confirmed')->sum('commission_amount'), 2),
            'total_usages' => $usages->count(),
            'commission_balance' => $user->commissionBalance(),
        ]);
    }
}
