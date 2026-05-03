<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\OrderRefundCompensationNeeded;
use App\Events\OrderRefundCompleted;
use App\Events\OrderRefundFailed;
use App\Events\OrderRefundRequested;
use Illuminate\Support\Facades\Log;

/**
 * Listener che traccia ogni transizione di refund_state nel canale log
 * standard. La tabella audit dedicata non esiste (vedi ADR 006: per ora
 * channel log e' sufficiente, una tabella saga_audit_log e' candidata
 * futura quando il volume di compensation_needed crescera').
 */
class LogOrderRefundLifecycle
{
    public function handleRequested(OrderRefundRequested $event): void
    {
        Log::info('order.refund.requested', [
            'order_id' => $event->order->id,
            'reason' => $event->reason,
            'refund_state' => 'requested',
        ]);
    }

    public function handleCompleted(OrderRefundCompleted $event): void
    {
        Log::info('order.refund.completed', [
            'order_id' => $event->order->id,
            'refund_amount_cents' => $event->refundAmountCents,
            'refund_method' => $event->refundMethod,
            'refund_state' => 'refunded',
        ]);
    }

    public function handleFailed(OrderRefundFailed $event): void
    {
        Log::warning('order.refund.failed', [
            'order_id' => $event->order->id,
            'stage' => $event->stage,
            'error' => $event->errorMessage,
            'refund_state' => 'failed',
        ]);
    }

    public function handleCompensationNeeded(OrderRefundCompensationNeeded $event): void
    {
        // CRITICO: BRT cancellato ma Stripe refund fallito. L'ordine richiede
        // intervento manuale per emettere il rimborso al cliente.
        Log::critical('order.refund.compensation_needed', [
            'order_id' => $event->order->id,
            'intended_refund_cents' => $event->intendedRefundCents,
            'error' => $event->errorMessage,
            'refund_state' => 'compensation_needed',
            'action_required' => 'manual_refund_via_stripe_dashboard_or_wallet_credit',
        ]);
    }
}
