<?php

/**
 * CartController -- Thin orchestrator that delegates to focused controllers.
 *
 * Split into:
 *   - CartTotalController (index, mergeIdentical, emptyCart, meta/totals)
 *   - CartItemController  (store, show, update, updateQuantity, destroy)
 *
 * This file is kept for backward compatibility. All route files now point directly
 * to the new controllers. If any code resolves CartController via the container,
 * the methods below delegate transparently.
 *
 * @deprecated Use CartTotalController or CartItemController directly.
 */

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class CartController extends Controller
{
    public function index(Request $request)
    {
        return app(CartTotalController::class)->index($request);
    }

    public function mergeIdentical()
    {
        return app(CartTotalController::class)->mergeIdentical();
    }

    public function emptyCart()
    {
        return app(CartTotalController::class)->emptyCart();
    }
}
