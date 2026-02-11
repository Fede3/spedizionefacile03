<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Order;
use App\Models\Package;
use App\Events\OrderPaid;
use App\Events\OrderCreated;
use Illuminate\Http\Request;
use App\Utils\CustomResponse;
use App\Events\OrderPaymentFailed;
use App\Http\Middleware\CheckAdmin;
use App\Http\Requests\OrderRequest;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Lang;
use App\Http\Resources\OrderResource;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Gate;


class OrderController extends Controller
{
    public function index(Request $request) {

        /* $textFilter = $request->query('textFilter');

        $orders = [];

        if ($textFilter === 'Tutti') {
            
            $orders = Order::with([
                'user',
                'packages',
                'transactions',
            ])->get();

        } else {

            $orders = Order::with([
                'user',
                'packages',
                'transactions',
            ])->where('status', $textFilter)->get();
                        
        } */

        Gate::authorize('viewAny', Order::class);

        $orders = null;

        $user = $request->user();

        if ($user->isAdmin()) {
            $orders = Order::with([
                'user',
                'packages',
                'transactions',
            ])->get();
            
        }
        else {
            $orders = Order::where('user_id', $user->id)->get();
        }

        return OrderResource::collection($orders);


        /* event(new OrderCreated($order));

        event(new OrderPaid($order, $result->transaction));

        event(new OrderPaymentFailed($order)); */
    }

    public function show(Order $order) {

        Gate::authorize('view', $order);

        return new OrderResource($order);
    }
}
