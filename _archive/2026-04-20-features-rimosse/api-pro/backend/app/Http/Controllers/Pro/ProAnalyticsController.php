<?php

/**
 * FILE: Pro/ProAnalyticsController.php
 * SCOPO: Endpoint analytics per la dashboard Pro.
 *
 * ENDPOINT:
 *   - GET /api/pro/analytics/dashboard
 *
 * RITORNA JSON:
 *   - kpi: { shipments_30d, total_value_cents, avg_per_shipment_cents, delivered_within_48h_rate }
 *   - monthly_chart: [ { month: "2026-01", count: int, value_cents: int }, ... ] (12 mesi)
 *   - top_destinations: [ { province: "MI", count: int }, ... ] (top 5)
 *   - top_services: [ { service_type: "express", count: int }, ... ] (top 5)
 *   - latest_shipments: [ ultimi 20 ordini ridotti ]
 *
 * AUTH: solo Partner Pro
 */

namespace App\Http\Controllers\Pro;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ProAnalyticsController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $this->ensurePro();

        $userId = auth()->id();
        $now = now();
        $thirtyDaysAgo = $now->copy()->subDays(30);

        /* ===== KPI ===== */
        $kpiQuery = Order::where('user_id', $userId)
            ->where('created_at', '>=', $thirtyDaysAgo);

        $shipmentsCount = (clone $kpiQuery)->count();
        $totalValueCents = (int) (clone $kpiQuery)->sum('subtotal');
        $avgPerShipment = $shipmentsCount > 0 ? (int) round($totalValueCents / $shipmentsCount) : 0;

        // Tasso consegna entro 48h: ordini delivered con (delivered_at - created_at) <= 48h
        // Se la colonna delivered_at non esiste, fallback a 0
        $deliveredWithin48hRate = 0;
        try {
            $deliveredCount = (clone $kpiQuery)->where('status', 'delivered')->count();
            if ($deliveredCount > 0) {
                $within = (clone $kpiQuery)
                    ->where('status', 'delivered')
                    ->whereRaw('TIMESTAMPDIFF(HOUR, created_at, COALESCE(updated_at, NOW())) <= 48')
                    ->count();
                $deliveredWithin48hRate = round(($within / $deliveredCount) * 100, 1);
            }
        } catch (\Throwable $e) {
            $deliveredWithin48hRate = 0;
        }

        /* ===== Chart mensile (12 mesi) ===== */
        $startChart = $now->copy()->subMonths(11)->startOfMonth();
        $monthlyRows = Order::where('user_id', $userId)
            ->where('created_at', '>=', $startChart)
            ->select(
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month"),
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(subtotal) as value_cents')
            )
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $monthlyChart = [];
        for ($i = 0; $i < 12; $i++) {
            $monthKey = $startChart->copy()->addMonths($i)->format('Y-m');
            $row = $monthlyRows->get($monthKey);
            $monthlyChart[] = [
                'month' => $monthKey,
                'count' => $row ? (int) $row->count : 0,
                'value_cents' => $row ? (int) $row->value_cents : 0,
            ];
        }

        /* ===== Top 5 destinazioni (province) ===== */
        $topDestinations = DB::table('orders')
            ->join('package_order', 'orders.id', '=', 'package_order.order_id')
            ->join('package_addresses', function ($join) {
                $join->on('package_order.package_id', '=', 'package_addresses.package_id')
                    ->where('package_addresses.type', '=', 'destination');
            })
            ->where('orders.user_id', $userId)
            ->where('orders.created_at', '>=', $thirtyDaysAgo)
            ->whereNull('orders.deleted_at')
            ->select('package_addresses.province', DB::raw('COUNT(DISTINCT orders.id) as count'))
            ->groupBy('package_addresses.province')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        /* ===== Top 5 servizi ===== */
        $topServices = DB::table('orders')
            ->join('package_order', 'orders.id', '=', 'package_order.order_id')
            ->join('packages', 'package_order.package_id', '=', 'packages.id')
            ->join('services', 'packages.service_id', '=', 'services.id')
            ->where('orders.user_id', $userId)
            ->where('orders.created_at', '>=', $thirtyDaysAgo)
            ->whereNull('orders.deleted_at')
            ->select('services.service_type', DB::raw('COUNT(DISTINCT orders.id) as count'))
            ->groupBy('services.service_type')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        /* ===== Ultimi 20 ordini ===== */
        $latest = Order::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'status', 'subtotal', 'created_at']);

        return response()->json([
            'kpi' => [
                'shipments_30d' => $shipmentsCount,
                'total_value_cents' => $totalValueCents,
                'avg_per_shipment_cents' => $avgPerShipment,
                'delivered_within_48h_rate' => $deliveredWithin48hRate,
            ],
            'monthly_chart' => $monthlyChart,
            'top_destinations' => $topDestinations,
            'top_services' => $topServices,
            'latest_shipments' => $latest,
        ]);
    }

    protected function ensurePro(): void
    {
        $user = auth()->user();
        if (! $user || ! $user->isPro()) {
            abort(403, 'Funzionalità riservata ai Partner Pro.');
        }
    }
}
