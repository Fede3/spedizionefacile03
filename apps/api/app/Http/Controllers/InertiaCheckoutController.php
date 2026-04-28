<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InertiaCheckoutController extends Controller
{
    public function carrello(Request $request): Response
    {
        return Inertia::render('Checkout/Carrello', [
            'items' => [],
            'total' => '0,00 €',
        ]);
    }

    public function success(Request $request): Response
    {
        $orderId = (int) $request->query('order_id', 0);
        $order = $orderId ? Order::find($orderId) : null;

        return Inertia::render('Checkout/Success', [
            'order' => $order ? [
                'id' => $order->id,
                'total' => number_format($order->payable_total_cents / 100, 2, ',', '.') . ' €',
                'tracking' => $order->tracking_number,
            ] : ['id' => 0, 'total' => '—', 'tracking' => null],
        ]);
    }
}
