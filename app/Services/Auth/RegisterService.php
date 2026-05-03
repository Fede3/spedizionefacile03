<?php

namespace App\Services\Auth;

use App\Jobs\SendVerificationEmailJob;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Business logic per registrazione utente, generazione/invio codice di verifica
 * e gestione tentativi falliti. Estratto da RegisterController per restare thin.
 */
class RegisterService
{
    public const VERIFY_TTL_MIN = 30;

    public const MAX_ATTEMPTS = 5;

    /**
     * Crea utente e invia codice verifica. Non lancia mai (logga eventuale fallimento mail).
     */
    public function createUserAndSendCode(array $data): User
    {
        $data['telephone_number'] = $data['prefix'].' '.$data['telephone_number'];
        unset($data['prefix']);

        $data['referred_by'] = $this->resolveReferral($data['referred_by'] ?? null);

        unset($data['role'], $data['email_confirmation'], $data['password_confirmation']);

        return DB::transaction(function () use ($data) {
            $user = new User($data);
            $user->role = 'User';
            $user->verification_code = $this->newCode();
            $user->verification_code_expires_at = now()->addMinutes(self::VERIFY_TTL_MIN);
            $user->save();

            $this->dispatchVerificationMail($user);

            return $user;
        });
    }

    /**
     * Rigenera codice e invia email (usato sia da resend sia da scadenza in verifyCode).
     */
    public function regenerateCode(User $user): void
    {
        $user->update([
            'verification_code' => $this->newCode(),
            'verification_code_expires_at' => now()->addMinutes(self::VERIFY_TTL_MIN),
        ]);

        $this->dispatchVerificationMail($user);
    }

    public function attemptsKey(User $user): string
    {
        return 'verify_attempts_'.$user->id;
    }

    public function attempts(User $user): int
    {
        return (int) Cache::get($this->attemptsKey($user), 0);
    }

    public function recordFailedAttempt(User $user, int $attempts): void
    {
        Cache::put($this->attemptsKey($user), $attempts + 1, now()->addMinutes(self::VERIFY_TTL_MIN));
    }

    public function clearAttempts(User $user): void
    {
        Cache::forget($this->attemptsKey($user));
    }

    public function invalidateCode(User $user): void
    {
        $user->update([
            'verification_code' => null,
            'verification_code_expires_at' => null,
        ]);
        $this->clearAttempts($user);
    }

    public function markVerified(User $user): void
    {
        $user->update([
            'email_verified_at' => now(),
            'verification_code' => null,
            'verification_code_expires_at' => null,
        ]);
    }

    private function resolveReferral(?string $code): ?string
    {
        if (empty($code)) {
            return null;
        }
        $referralCode = strtoupper($code);
        $proUser = User::where('referral_code', $referralCode)
            ->where('role', 'Partner Pro')
            ->first();

        return $proUser ? $referralCode : null;
    }

    private function newCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function dispatchVerificationMail(User $user): void
    {
        try {
            SendVerificationEmailJob::dispatchSync($user);
        } catch (\Throwable $e) {
            Log::warning('Invio email verifica fallito.', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
