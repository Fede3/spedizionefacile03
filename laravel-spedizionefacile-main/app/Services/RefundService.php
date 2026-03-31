<?php

namespace App\Services;

use App\Models\Order;
use App\Models\WalletMovement;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class RefundService
{
    public const CANCELLATION_FEE_CENTS = 200;

    private StripeConfigService $stripeConfig;

    public function __construct(?StripeConfigService $stripeConfig = null)
    {
        $this->stripeConfig = $stripeConfig ?? app(StripeConfigService::class);
    }

    public function calculateEligibility(Order $order): array
    {
        $status = $order->getAttributes()['status'] ?? $order->status;

        if (in_array($status, ['cancelled', 'refunded'])) {
            return $this->ineligible('L\'ordine e\' gia\' stato annullato o rimborsato.', $order, 'already_cancelled');
        }

        if (in_array($status, [Order::PENDING, Order::PAYMENT_FAILED])) {
            return $this->eligible('L\'ordine non e\' ancora stato pagato. Verra\' annullato senza rimborso.', $order, 'cancel_unpaid', 0, 0);
        }

        if ($status === Order::IN_TRANSIT) {
            return $this->ineligible('La spedizione e\' gia\' partita e in transito. Non e\' possibile richiedere il rimborso.', $order, 'in_transit');
        }

        if (in_array($status, [Order::COMPLETED, Order::PROCESSING])) {
            $subtotalCents = (int) $order->subtotal->amount();
            $commission = self::CANCELLATION_FEE_CENTS;
            $refund = max(0, $subtotalCents - $commission);
            return $this->eligible(
                'L\'ordine puo\' essere annullato. Verra\' applicata una commissione di annullamento di ' . number_format($commission / 100, 2, ',', '.') . ' EUR.',
                $order, 'refund_with_commission', $refund, $commission
            );
        }

        if (in_array($status, ['delivered', 'in_giacenza'])) {
            return $this->ineligible('L\'ordine e\' gia\' stato consegnato o e\' in giacenza. Non e\' possibile richiedere il rimborso.', $order, 'not_refundable');
        }

        return $this->ineligible('Non e\' possibile annullare questo ordine.', $order, 'unknown');
    }

    public function processStripeRefund(Order $order, int $amountCents): void
    {
        $secret = $this->stripeConfig->getSecret();
        if (!$secret) throw new \Exception('Stripe non configurato. Impossibile processare il rimborso.');

        $stripe = new StripeClient($secret);

        try {
            $refund = $stripe->refunds->create([
                'payment_intent' => $order->stripe_payment_intent_id,
                'amount' => $amountCents, 'reason' => 'requested_by_customer',
                'metadata' => ['order_id' => (string) $order->id, 'cancellation_fee_cents' => (string) self::CANCELLATION_FEE_CENTS],
            ]);

            Log::info('Stripe refund processed', ['order_id' => $order->id, 'refund_id' => $refund->id, 'amount' => $amountCents, 'status' => $refund->status]);
            if ($refund->status === 'failed') throw new \Exception('Rimborso Stripe fallito. Status: ' . $refund->status);
        } catch (ApiErrorException $e) {
            Log::error('Stripe refund API error', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            throw new \Exception('Errore Stripe durante il rimborso: ' . $e->getMessage());
        }
    }

    public function processWalletRefund(Order $order, int $amountCents): void
    {
        WalletMovement::create([
            'user_id' => $order->user_id, 'type' => 'credit',
            'amount' => round($amountCents / 100, 2), 'currency' => 'EUR', 'status' => 'confirmed',
            'idempotency_key' => 'refund_' . $order->id . '_' . Str::uuid(),
            'reference' => (string) $order->id,
            'description' => 'Rimborso ordine #SF-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
            'source' => 'refund',
        ]);
        Log::info('Wallet refund processed', ['order_id' => $order->id, 'user_id' => $order->user_id, 'amount_eur' => round($amountCents / 100, 2)]);
    }

    private function eligible(string $reason, Order $order, string $type, int $refund, int $commission): array
    {
        return [
            'eligible' => true, 'reason' => $reason,
            'refund_amount_cents' => $refund, 'commission_cents' => $commission,
            'refund_amount_eur' => number_format($refund / 100, 2, ',', '.'),
            'commission_eur' => number_format($commission / 100, 2, ',', '.'),
            'payment_method' => $order->payment_method, 'type' => $type,
        ];
    }

    private function ineligible(string $reason, Order $order, string $type): array
    {
        return [
            'eligible' => false, 'reason' => $reason,
            'refund_amount_cents' => 0, 'commission_cents' => 0,
            'refund_amount_eur' => '0,00', 'commission_eur' => '0,00',
            'payment_method' => $order->payment_method, 'type' => $type,
        ];
    }
}
