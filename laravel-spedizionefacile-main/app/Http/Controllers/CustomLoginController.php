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
use App\Jobs\SendVerificationEmailJob;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class CustomLoginController extends Controller
{
    /* public function destroy(Request $request) {

        $request->user()->currentAccessToken()->delete();

    } */
    
    public function login(Request $request) {

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

        /* $oldToken = DB::table('email_verification')
            ->where('identifier', $user->identifier)
            ->first();

        $token = Str::random(64);

        if ($oldToken) {
            DB::table('email_verification')
                ->where('identifier', $user->identifier)
                ->update([
                    'token' => Hash::make($token),
                    'created_at' => Carbon::now()
                ]);
        }
        else {
            DB::table('email_verification')->insert([
                'identifier' => $user->identifier,
                'token' => Hash::make($token),
                'created_at' => Carbon::now()
            ]);
        } */

        if (!$user->email_verified_at) {

            SendVerificationEmailJob::dispatchSync($user);

            return CustomResponse::setFailResponse('Per proseguire devi verificare l\'email. Ti abbiamo appena inviato un\'email con il link per confermare il tuo indirizzo.', Response::HTTP_UNAUTHORIZED);
        
        }

        if ($user->email_verified_at) {
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
                // Cart migration is non-critical, don't block login
            }

            return $user;

            /* return [
                'token' => $user->createToken('token-name')->plainTextToken
            ]; */
        }

        /* if ($request->remember) {
            // Genera un nuovo token remember personalizzato
            $token = Str::random(60);
            $user->setRememberToken($token);
            $user->save();

            // Nome del cookie remember
            $rememberCookieName = Auth::getRecallerName();

            // Valore cookie: user_id|token|hash(email)
            $cookieValue = $user->id.'|'.$token.'|'.sha1($user->email);

            // Crea il cookie con durata custom, es. 30 giorni
            $minutes = 1;

            Cookie::queue($rememberCookieName, $cookieValue, $minutes);
        } */
    }


    public function resendVerificationEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return CustomResponse::setSuccessResponse('Se l\'account esiste e non è verificato, abbiamo inviato una nuova email di conferma.', Response::HTTP_OK);
        }

        if ($user->email_verified_at) {
            return CustomResponse::setFailResponse('Questa email risulta già verificata. Puoi accedere normalmente.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        SendVerificationEmailJob::dispatchSync($user);

        return CustomResponse::setSuccessResponse('Ti abbiamo inviato una nuova email di conferma. Controlla anche SPAM/Promozioni.', Response::HTTP_OK);
    }

    public function createPackage($packages) {

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

    /* public function destroy(Request $request) {

        $request->user()->currentAccessToken()->delete();

    } */


        /* $request->validate([
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

        if ($request->remember) {
            // Login con remember = true
            Auth::login($user, true);

            // Sovrascrivi la durata del cookie remember_web
            $rememberCookieName = Auth::getRecallerName(); // normalmente 'remember_web_{id}'
            $cookieValue = Cookie::get($rememberCookieName);

            // Ricrea il cookie con una durata personalizzata
            Cookie::queue($rememberCookieName, $cookieValue, 1); 
        }
        else {
            Auth::login($user);
        }

        return $user; */
}
