<?php
/**
 * FILE: StripePaymentService.php
 * SCOPO: Logica di pagamento Stripe: creazione PaymentIntent, conferma pagamento,
 *   gestione carte salvate e profili cliente.
 *
 * Estratto da StripeController per separare la logica di business dal layer HTTP.
 *
 * DOVE SI USA:
 *   - StripeController.php -- per tutte le operazioni di pagamento
 *
 * VINCOLI:
 *   - Importi sempre in centesimi (minimo 50 centesimi per Stripe)
 *   - Le chiavi Stripe vengono da StripeConfigService (DB -> .env fallback)
 */

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Stripe\StripeClient;

class StripePaymentService
{
    private StripeConfigService $configService;

    public function __construct(StripeConfigService $configService)
    {
        $this->configService = $configService;
    }

    public function getStripeSecret(): ?string
    {
        return $this->configService->getSecret();
    }

    public function isConfigured(): bool
    {
        return ! empty($this->getStripeSecret());
    }

    private function client(): StripeClient
    {
        return new StripeClient($this->getStripeSecret());
    }

    // ── Customer management ──────────────────────────────────────

    /**
     * Crea un profilo cliente su Stripe per l'utente, o restituisce quello esistente.
     */
    public function createOrGetCustomer(User $user): string
    {
        if (! $user->customer_id) {
            $stripe = $this->client();
            $customer = $stripe->customers->create([
                'email' => $user->email,
                'name' => $user->name . ' ' . $user->surname,
            ]);

            $user->customer_id = $customer->id;
            $user->save();
        }

        return $user->customer_id;
    }

    // ── Payment intents ──────────────────────────────────────────

    /**
     * Crea un PaymentIntent per il checkout con carta.
     *
     * @return array{client_secret: string, payment_intent_id: string}
     * @throws \Exception
     */
    public function createPaymentIntent(Order $order, User $user): array
    {
        $stripe = $this->client();
        $customerId = $this->createOrGetCustomer($user);

        $amount = (int) $order->subtotal->amount();

        $paymentIntent = $stripe->paymentIntents->create([
            'amount' => $amount,
            'currency' => 'eur',
            'customer' => (string) $customerId,
            'metadata' => ['order_id' => (string) $order->id],
            'automatic_payment_methods' => ['enabled' => true],
        ]);

        return [
            'client_secret' => $paymentIntent->client_secret,
            'payment_intent_id' => $paymentIntent->id,
        ];
    }

    /**
     * Crea e conferma un pagamento con carta gia' salvata (off-session).
     */
    public function createOffSessionPayment(Order $order, string $currency, string $paymentMethodId, string $customerId): array
    {
        $stripe = $this->client();

        $paymentIntent = $stripe->paymentIntents->create([
            'amount' => $order->subtotal->amount(),
            'currency' => (string) $currency,
            'customer' => (string) $customerId,
            'payment_method' => (string) $paymentMethodId,
            'confirm' => true,
            'off_session' => true,
            'metadata' => ['order_id' => (string) $order->id],
        ]);

        $order->payment_method = 'stripe';
        $order->stripe_payment_intent_id = $paymentIntent->id;
        $order->save();

        return [
            'payment_intent_id' => $paymentIntent->id,
            'status' => $paymentIntent->status,
        ];
    }

    /**
     * Verifica un pagamento completato e restituisce i dati necessari.
     *
     * @return array{intent: \Stripe\PaymentIntent, payment_type: string}
     */
    public function retrieveAndVerifyPayment(string $paymentIntentId, Order $order): array
    {
        $stripe = $this->client();
        $intent = $stripe->paymentIntents->retrieve($paymentIntentId);

        // Verifica che il payment intent corrisponda all'ordine
        if (isset($intent->metadata['order_id']) && (int) $intent->metadata['order_id'] !== $order->id) {
            throw new \RuntimeException('Payment intent non corrisponde all\'ordine.');
        }

        // Verifica che l'importo corrisponda
        if ((int) $intent->amount !== (int) $order->subtotal->amount()) {
            throw new \RuntimeException('Importo non corrisponde.');
        }

        // Determina il tipo di pagamento
        $type = $intent->payment_method
            ? $stripe->paymentMethods->retrieve($intent->payment_method)->type
            : $intent->payment_method_types[0] ?? 'unknown';

        return [
            'intent' => $intent,
            'payment_type' => $type,
        ];
    }

    // ── SetupIntent (card saving) ────────────────────────────────

    /**
     * Crea un SetupIntent per salvare una nuova carta.
     */
    public function createSetupIntent(User $user): array
    {
        $stripe = $this->client();
        $customerId = $this->createOrGetCustomer($user);

        $intent = $stripe->setupIntents->create([
            'customer' => $customerId,
            'payment_method_types' => ['card'],
        ]);

        return ['client_secret' => $intent->client_secret];
    }

    // ── Payment methods (cards) ──────────────────────────────────

    /**
     * Lista delle carte salvate dall'utente.
     */
    public function listPaymentMethods(User $user): array
    {
        if (! $user->customer_id) {
            return ['data' => [], 'default' => null];
        }

        $stripe = $this->client();

        $pmList = $stripe->paymentMethods->all([
            'customer' => $user->customer_id,
            'type' => 'card',
        ]);

        $customer = $stripe->customers->retrieve($user->customer_id);
        $defaultPm = $customer->invoice_settings->default_payment_method ?? null;

        $cards = array_map(function ($pm) use ($defaultPm) {
            return [
                'id' => $pm->id,
                'holder_name' => $pm->billing_details->name,
                'brand' => $pm->card->brand,
                'last4' => $pm->card->last4,
                'exp_month' => $pm->card->exp_month,
                'exp_year' => $pm->card->exp_year,
                'default' => $pm->id === $defaultPm,
            ];
        }, $pmList->data);

        usort($cards, fn ($a, $b) => $b['default'] <=> $a['default']);

        return ['data' => $cards, 'default' => $defaultPm];
    }

    /**
     * Imposta una carta come metodo di pagamento predefinito (attach + update).
     */
    public function setDefaultPaymentMethod(User $user, string $paymentMethodId): array
    {
        $stripe = $this->client();

        $stripe->paymentMethods->attach($paymentMethodId, [
            'customer' => $user->customer_id,
        ]);

        $stripe->customers->update($user->customer_id, [
            'invoice_settings' => [
                'default_payment_method' => $paymentMethodId,
            ],
        ]);

        return ['success' => true, 'default' => $paymentMethodId];
    }

    /**
     * Cambia la carta predefinita (per carte gia' collegate).
     */
    public function changeDefaultPaymentMethod(User $user, string $paymentMethodId): array
    {
        $stripe = $this->client();

        $customer = $stripe->customers->update($user->customer_id, [
            'invoice_settings' => [
                'default_payment_method' => $paymentMethodId,
            ],
        ]);

        return [
            'success' => true,
            'default' => $customer->invoice_settings->default_payment_method,
        ];
    }

    /**
     * Elimina una carta salvata (verifica ownership prima del detach).
     */
    public function deleteCard(User $user, string $paymentMethodId): void
    {
        $stripe = $this->client();

        $pm = $stripe->paymentMethods->retrieve($paymentMethodId);
        if ($pm->customer !== $user->customer_id) {
            throw new \RuntimeException('Non autorizzato.');
        }

        $stripe->paymentMethods->detach($paymentMethodId);
    }

    /**
     * Recupera i dettagli della carta predefinita.
     */
    public function getDefaultPaymentMethod(User $user): ?array
    {
        if (! $user->customer_id) {
            return null;
        }

        $stripe = $this->client();
        $customer = $stripe->customers->retrieve($user->customer_id);
        $defaultPm = $customer->invoice_settings->default_payment_method ?? null;

        if (! $defaultPm) {
            return null;
        }

        $pm = $stripe->paymentMethods->retrieve($defaultPm);

        return [
            'id' => $pm->id,
            'holder_name' => $pm->billing_details->name,
            'brand' => $pm->card->brand,
            'last4' => $pm->card->last4,
            'exp_month' => $pm->card->exp_month,
            'exp_year' => $pm->card->exp_year,
            'default' => true,
        ];
    }
}
