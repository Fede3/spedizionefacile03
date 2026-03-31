<?php
/**
 * Admin Referral Stats Controller
 *
 * Provides a read-only overview of referral code usage across the platform:
 * who used which code, discounts given, and commissions earned.
 */

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReferralUsage;
use Illuminate\Http\JsonResponse;

class ReferralStatsController extends Controller
{
    // Mostra le statistiche di tutti i codici referral utilizzati
    // Include: chi ha usato quale codice, quanto sconto e' stato dato, quante commissioni
    public function referralStats(): JsonResponse
    {
        $stats = ReferralUsage::with([
                'proUser:id,name,surname,email,referral_code',  // Il Partner Pro proprietario del codice
                'buyer:id,name,surname,email',                  // L'acquirente che ha usato il codice
            ])
            ->orderByDesc('created_at')
            ->get();

        // Calcoliamo i totali complessivi
        $summary = [
            'total_discount_given' => round($stats->sum('discount_amount'), 2),   // Totale sconti dati
            'total_commissions' => round($stats->sum('commission_amount'), 2),     // Totale commissioni
            'total_order_amount' => round($stats->sum('order_amount'), 2),         // Totale ordini con referral
            'total_usages' => $stats->count(),                                      // Numero di utilizzi
        ];

        return response()->json([
            'data' => $stats,
            'summary' => $summary,
        ]);
    }
}
