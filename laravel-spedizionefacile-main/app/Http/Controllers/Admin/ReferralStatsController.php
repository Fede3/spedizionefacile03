<?php

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
                'proUser:id,name,surname,email,referral_code',
                'buyer:id,name,surname,email',
            ])
            ->orderByDesc('created_at')
            ->get();

        // Calcoliamo i totali complessivi
        $summary = [
            'total_discount_given' => round($stats->sum('discount_amount'), 2),
            'total_commissions' => round($stats->sum('commission_amount'), 2),
            'total_order_amount' => round($stats->sum('order_amount'), 2),
            'total_usages' => $stats->count(),
        ];

        return response()->json([
            'data' => $stats,
            'summary' => $summary,
        ]);
    }
}
