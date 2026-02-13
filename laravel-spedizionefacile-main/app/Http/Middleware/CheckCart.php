<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckCart
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Allow requests that reference an existing order (e.g. "Paga ora" for pending orders)
        if ($request->has('order_id') && $request->order_id) {
            return $next($request);
        }

        $cart = DB::table('cart_user')
            ->where('user_id', auth()->id())
            ->get();

        if ($cart->isEmpty()) {
            return response()->json([
                'message' => 'Carrello vuoto',
            ], 400);
        }

        return $next($request);
    }
}
