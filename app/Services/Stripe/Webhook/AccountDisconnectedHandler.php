<?php

namespace App\Services\Stripe\Webhook;

use Illuminate\Support\Facades\Log;

/**
 * Handler webhook account.application.deauthorized:
 * resetta stato Stripe Connect dell'utente quando l'account viene disconnesso.
 */
class AccountDisconnectedHandler
{
    use StripeWebhookHelpersTrait;

    public function handle(object $event): bool
    {
        $account = $event->data->object;
        $stripeAccountId = $account->id ?? null;

        if (! $stripeAccountId) {
            return true;
        }

        $user = $this->findUserByStripeAccountId($stripeAccountId);
        if (! $user) {
            return true;
        }

        $user->stripe_account_id = null;
        $user->stripe_charges_enabled = false;
        $user->stripe_payouts_enabled = false;
        $user->stripe_details_submitted = false;
        $user->stripe_capabilities = null;
        $user->stripe_requirements = null;
        $user->save();

        Log::info('Stripe account disconnected', [
            'user_id' => $user->id,
            'account_id' => $stripeAccountId,
        ]);

        return true;
    }
}
