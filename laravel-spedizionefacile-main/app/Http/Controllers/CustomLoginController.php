<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\User;
use App\Models\PackageAddress;
use App\Models\Package;
use App\Models\Service;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use App\Utils\CustomResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Jobs\SendVerificationEmailJob;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class CustomLoginController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'remember' => 'boolean',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Le credenziali non sono corrette.'],
                'password' => ['Le credenziali non sono corrette.'],
            ]);
        }

        // If account is not verified, require verification code
        if (!$user->email_verified_at) {
            // Generate a new code if expired or missing
            if (!$user->verification_code || ($user->verification_code_expires_at && $user->verification_code_expires_at->isPast())) {
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
                $user->update([
                    'verification_code' => $code,
                    'verification_code_expires_at' => now()->addMinutes(30),
                ]);
            }

            return response()->json([
                'success' => false,
                'requires_verification' => true,
                'message' => 'Account non verificato. Inserisci il codice di verifica a 6 cifre inviato alla tua email.',
            ], 403);
        }

        Auth::login($user, (bool) $request->remember);

        // Migrate guest cart to user's DB cart
        try {
            $packages = session()->get('cart', []);
            if (!empty($packages)) {
                $dbPackages = $this->createPackage($packages);
                foreach ($dbPackages as $package) {
                    DB::table('cart_user')->insert([
                        'user_id' => $user->id,
                        'package_id' => $package->id,
                        'created_at' => now(),
                    ]);
                }
                session()->forget('cart');
            }
        } catch (\Exception $e) {
            // Cart migration is non-critical
        }

        return $user;
    }

    /**
     * Verify the 6-digit code and activate the account.
     */
    public function verifyCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return CustomResponse::setFailResponse('Credenziali non corrette.', Response::HTTP_UNAUTHORIZED);
        }

        if ($user->email_verified_at) {
            return CustomResponse::setSuccessResponse('Account già verificato. Puoi accedere.', Response::HTTP_OK);
        }

        // Check code
        if ($user->verification_code !== $request->code) {
            return CustomResponse::setFailResponse('Codice di verifica non valido.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Check expiration
        if ($user->verification_code_expires_at && $user->verification_code_expires_at->isPast()) {
            // Generate new code
            $newCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $user->update([
                'verification_code' => $newCode,
                'verification_code_expires_at' => now()->addMinutes(30),
            ]);

            return CustomResponse::setFailResponse('Codice scaduto. Nuovo codice generato: ' . $newCode, Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Verify the user
        $user->update([
            'email_verified_at' => now(),
            'verification_code' => null,
            'verification_code_expires_at' => null,
        ]);

        Auth::login($user, true);

        return response()->json([
            'success' => true,
            'message' => 'Account verificato con successo!',
            'user' => $user,
        ]);
    }

    /**
     * Resend the verification code.
     */
    public function resendVerificationEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return CustomResponse::setSuccessResponse('Se l\'account esiste, abbiamo inviato un nuovo codice.', Response::HTTP_OK);
        }

        if ($user->email_verified_at) {
            return CustomResponse::setFailResponse('Questa email risulta già verificata. Puoi accedere normalmente.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->update([
            'verification_code' => $code,
            'verification_code_expires_at' => now()->addMinutes(30),
        ]);

        try {
            SendVerificationEmailJob::dispatchSync($user);
        } catch (\Throwable $e) {
            Log::warning('Invio email fallito.', ['email' => $user->email, 'error' => $e->getMessage()]);
        }

        return CustomResponse::setSuccessResponse('Nuovo codice di verifica inviato alla tua email.', Response::HTTP_OK);
    }

    public function createPackage($packages)
    {
        $createdPackages = [];

        foreach ($packages as $package) {
            $origin = PackageAddress::create($package['origin_address']);
            $destination = PackageAddress::create($package['destination_address']);
            $services = Service::create($package['services']);

            $createdPackages[] = Package::create([
                'package_type' => $package['package_type'],
                'quantity' => $package['quantity'],
                'weight' => $package['weight'],
                'first_size' => $package['first_size'],
                'second_size' => $package['second_size'],
                'third_size' => $package['third_size'],
                'weight_price' => $package['weight_price'] ?? null,
                'volume_price' => $package['volume_price'] ?? null,
                'single_price' => $package['single_price'] ?? null,
                'origin_address_id' => $origin->id,
                'destination_address_id' => $destination->id,
                'service_id' => $services->id,
                'user_id' => auth()->id(),
            ]);
        }

        return $createdPackages;
    }
}
