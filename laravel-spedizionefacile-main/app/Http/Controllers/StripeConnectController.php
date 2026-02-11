<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Stripe\StripeClient;

class StripeConnectController extends Controller
{
    public function connect()
    {
        $query = http_build_query([
            'client_id' => config('services.stripe.client_id'),
            'response_type' => 'code',
            'scope' => 'read_write',
            'redirect_uri' => url('/api/stripe/callback'),
        ]);

        return response()->json([
            'url' => 'https://connect.stripe.com/oauth/authorize?' . $query,
        ]);
    }

    public function callback(Request $request)
    {
        $response = Http::asForm()->post('https://connect.stripe.com/oauth/token', [
            'client_secret' => config('services.stripe.secret'),
            'code' => $request->code,
            'grant_type' => 'authorization_code',
        ]);

        if ($response->failed()) {
            return redirect(config('app.frontend_url') . '/account?stripe_error=1');
        }

        $stripeAccountId = $response['stripe_user_id'];

        $user = Auth::user();
        $user->stripe_account_id = $stripeAccountId;
        $user->save();

        return redirect(config('app.frontend_url') . '/account?stripe_connected=1');
    }

    public function createAccount()
    {
        $user = Auth::user();
        $stripe = new StripeClient(config('services.stripe.secret'));

        $account = $stripe->accounts->create([
            'type' => 'express',
            'country' => 'IT',
            'email' => $user->email,
            'capabilities' => [
                'transfers' => ['requested' => true],
            ],
        ]);

        $user->stripe_account_id = $account->id;
        $user->save();

        $accountLink = $stripe->accountLinks->create([
            'account' => $account->id,
            'refresh_url' => config('app.frontend_url') . '/account/account-pro?refresh=1',
            'return_url' => config('app.frontend_url') . '/account/account-pro?connected=1',
            'type' => 'account_onboarding',
        ]);

        return response()->json([
            'url' => $accountLink->url,
            'account_id' => $account->id,
        ]);
    }
}
