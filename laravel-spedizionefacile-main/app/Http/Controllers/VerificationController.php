<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\User;
use Illuminate\Http\Request;
use App\Utils\CustomResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;



class VerificationController extends Controller
{
    public function verify(Request $request, $id) {
        // La firma è già verificata dal middleware 'signed'
        $user = User::findOrFail($id);

        /* if (!$request->hasValidSignature()) {
            return redirect(config('app.frontend_url') . '/verifica-email?status=invalid_signature');
        } */

        if ($user->email_verified_at) {
            // Già verificata
            return redirect(config('app.frontend_url') . '/verifica-email?status=already_verified');
        }

        $user->update([
            'email_verified_at' => now(),
        ]);

        // Redirect al frontend con stato di successo
        return redirect(config('app.frontend_url') . '/verifica-email?status=verified');
    }

}
