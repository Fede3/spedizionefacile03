<?php

/**
 * CustomLoginController -- Thin orchestrator that delegates to focused controllers.
 *
 * Split into:
 *   - LoginController    (login, confirmPassword)
 *   - RegisterController (verifyCode, resendVerificationEmail)
 *
 * This file is kept for backward compatibility. All route files now point directly
 * to the new controllers. If any code resolves CustomLoginController via the container,
 * the methods below delegate transparently.
 *
 * @deprecated Use LoginController or RegisterController directly.
 */

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class CustomLoginController extends Controller
{
    public function login(Request $request)
    {
        return app(LoginController::class)->login($request);
    }

    public function verifyCode(Request $request)
    {
        return app(RegisterController::class)->verifyCode($request);
    }

    public function confirmPassword(Request $request)
    {
        return app(LoginController::class)->confirmPassword($request);
    }

    public function resendVerificationEmail(Request $request)
    {
        return app(RegisterController::class)->resendVerificationEmail($request);
    }
}
