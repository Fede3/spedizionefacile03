<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\User;
use App\Mail\ResetPasswordEmail;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\HttpFoundation\Response;

class PasswordResetRequestController extends Controller
{
    // this is most important function to send mail and inside of that there are another function
    public function sendEmail(Request $request) {

        if (!$this->validateEmail($request->email)) { 
            return $this->failedResponse();
        }
        
        $this->send($request->email);  //this is a function to send mail 

        $data = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        return $this->successResponse($data);
    }

    //this is a function to send mail 
    public function send($email) {
        $token = $this->createToken($email);

        Mail::to($email)->queue(new ResetPasswordEmail($token, $email));  // token is important in send mail 
    }

    public function createToken($email) {
        // Controlla se esiste già un record per l'email
        $oldToken = DB::table('password_reset_tokens')->where('email', $email)->first();

        $token = Str::random(64);
        $hashedToken = Hash::make($token);

        if ($oldToken) {
            // Aggiorna il record con il nuovo token
            $this->updateToken($hashedToken, $email);
        } 
        else {
            // Salva un nuovo record
            $this->saveToken($hashedToken, $email);
        }

        return $token;
    }


    // this function save new password
    public function saveToken($token, $email) {
        DB::table('password_reset_tokens')->insert([
            'email' => $email,
            'token' => $token,
            'created_at' => Carbon::now()
        ]);
    }

    // this function save new password
    public function updateToken($token, $email) {
        DB::table('password_reset_tokens')
                ->where('email', $email)
                ->update([
                    'token' => $token,
                    'created_at' => Carbon::now()
                ]);
    }


    //this is a function to get your email from database    
    public function validateEmail($email) {
        /* return !!User::where('email', $email)->first(); */
        return User::where('email', $email)->exists();
    }

    public function failedResponse() {
        return response()->json([
            'success' => false,
            'message' => 'L\'indirizzo email inserito non è stato trovato.'
        ], Response::HTTP_NOT_FOUND);
    }

    public function successResponse($data) {

        return response()->json([
            'success' => true,
            'message' => 'Ti è stata inviata un\'email per il recupero della password. Controlla la tua casella di posta.',
            'data' => $data
        ], Response::HTTP_OK);
    }
}