<?php

/**
 * JOB: SendSmsJob
 *
 * Invia un SMS in background tramite SmsService.
 * - Coda di default (queue worker richiesto in produzione).
 * - 3 retry con backoff esponenziale (10s, 30s, 90s).
 * - Failure loggato; nessuna eccezione propagata oltre il job.
 */

namespace App\Jobs;

use App\Services\SmsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10; // base; con backoff esponenziale viene ricalcolato

    public function __construct(
        public readonly string $to,
        public readonly string $message,
    ) {}

    public function handle(SmsService $sms): void
    {
        $result = $sms->sendNow($this->to, $this->message);

        Log::info('[SMS] job result', [
            'to' => $this->maskPhone($this->to),
            'status' => $result->status,
            'provider' => $result->providerName,
            'message' => $result->message,
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('[SMS] job failed dopo retries', [
            'to' => $this->maskPhone($this->to),
            'error' => $e->getMessage(),
        ]);
    }

    private function maskPhone(string $phone): string
    {
        return preg_replace('/(\+\d{2})\d+(\d{3})/', '$1*****$2', $phone) ?? '***';
    }
}
