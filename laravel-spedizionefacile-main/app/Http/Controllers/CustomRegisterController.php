<?php

namespace App\Http\Controllers;

use Exception;
use Carbon\Carbon;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use App\Utils\CustomResponse;
use App\Mail\VerificationEmail;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Http\Requests\RegisterRequest;
use App\Jobs\SendVerificationEmailJob;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;


class CustomRegisterController extends Controller
{
    public function register(RegisterRequest $request) {
        
            /* $user = User::create([
                'name' => $request->name,
                'surname' => $request->surname,
                'telephone_number' => $request->telephone_number,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => $request->role,
                // Temporaneo
                'email_verified_at' => now(),
            ]); */


            $data = $request->validated();

            $data['telephone_number'] = $data['prefix'] . ' ' . $data['telephone_number'];

            // password hashing is handled by User model 'hashed' cast - do NOT hash again

            unset($data['prefix']);

            $user = User::create($data);

            dispatch(new SendVerificationEmailJob($user));

            return CustomResponse::setSuccessResponse('Ti abbiamo inviato un\'email con le istruzioni per completare la registrazione. Se non hai ricevuto la nostra email, controlla nella cartella SPAM.', Response::HTTP_CREATED);

    }

}

