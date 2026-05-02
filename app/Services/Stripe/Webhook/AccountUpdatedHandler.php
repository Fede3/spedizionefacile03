<?php

namespace App\Services\Stripe\Webhook;

/**
 * Handler webhook account.updated (Connect):
 * sincronizza capability/requirements/details_submitted del Partner Pro.
 */
class AccountUpdatedHandler
{
    use StripeWebhookHelpersTrait;

    public function handle(object $event): bool
    {
        $intent = $event->data->object;
        $stripeAccountId = $intent->id;

        $user = $this->findUserByStripeAccountId($stripeAccountId);
        if (! $user) {
            return true;
        }

        $user->stripe_charges_enabled = $intent->charges_enabled;
        $user->stripe_payouts_enabled = $intent->payouts_enabled;
        $user->stripe_capabilities = json_encode($intent->capabilities);
        $user->stripe_requirements = json_encode($intent->requirements);
        $user->stripe_details_submitted = $intent->details_submitted;
        $user->save();

        return true;
    }
}
