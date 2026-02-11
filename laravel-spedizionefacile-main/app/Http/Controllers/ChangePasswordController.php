<?php

namespace App\Http\Controllers;

use Carbon\Carbon;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Http\Requests\UpdatePasswordRequest;
use Symfony\Component\HttpFoundation\Response;

class ChangePasswordController extends Controller
{
    public function passwordResetProcess(UpdatePasswordRequest $request) {
        return $this->updatePasswordRow($request)->count() > 0 ? $this->resetPassword($request) : $this->tokenNotFoundError();
    }
  
    // Verify if token is valid
    private function updatePasswordRow($request) {
        $record = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        if ($record && Hash::check($request->resetToken, $record->token)) {
            return DB::table('password_reset_tokens')->where([
                'email' => $request->email,
            ]);
        }
    }
  
    // Token not found response  
    private function tokenNotFoundError() {
        return response()->json([
            'success' => false,
            'message' => 'L\'indirizzo email o il link per reimpostare la password non sono corretti.'
        ], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
  
    // Reset password
    private function resetPassword($request) {
        // find email
        $userData = User::whereEmail($request->email)->first();

        $tokenCreatedAt = DB::table('password_reset_tokens')
                ->where('email', $request->email)
                ->value('created_at');

        $isExpired = Carbon::parse($tokenCreatedAt)->lt(Carbon::now()->subMinutes(1));
          
        if ($isExpired) {
            // reset password response
            return response()->json([
                'success' => false,
                'message' => 'Il link per reimpostare la password è scaduto.'
            ], Response::HTTP_UNAUTHORIZED);
        }
        else {

            $userPassword = DB::table('users')
                    ->where('email', $request->email)
                    ->value('password');
            
            $newPassword = $request->password;

            if (Hash::check($newPassword, $userPassword)) {
                return response()->json([
                    'success' => false,
                    'message' => 'La nuova password deve essere diversa da quella precedente.'
                ], Response::HTTP_BAD_REQUEST);
            }
            else {
                // update password
                $userData->update([
                    'password' => bcrypt($request->password)
                ]);
                // remove verification data from db
                $this->updatePasswordRow($request)->delete();
        
                // reset password response
                return response()->json([
                    'success' => true,
                    'message' => 'La password è stata modificata con successo.'
                ], Response::HTTP_CREATED);
            }
        }
    }    
}