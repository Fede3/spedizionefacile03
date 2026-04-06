<?php

/**
 * ReferralController -- Thin orchestrator that delegates to focused controllers.
 *
 * Split into:
 *   - ReferralCodeController   (myCode, validate, storeReferral, myDiscount)
 *   - ReferralRewardController (apply, earnings)
 *
 * This file is kept for backward compatibility. All route files now point directly
 * to the new controllers. If any code resolves ReferralController via the container,
 * the methods below delegate transparently.
 *
 * @deprecated Use ReferralCodeController or ReferralRewardController directly.
 */

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferralController extends Controller
{
    public function myCode(): JsonResponse
    {
        return app(ReferralCodeController::class)->myCode();
    }

    public function validate(Request $request): JsonResponse
    {
        return app(ReferralCodeController::class)->validate($request);
    }

    public function apply(Request $request): JsonResponse
    {
        return app(ReferralRewardController::class)->apply($request);
    }

    public function storeReferral(Request $request): JsonResponse
    {
        return app(ReferralCodeController::class)->storeReferral($request);
    }

    public function myDiscount(): JsonResponse
    {
        return app(ReferralCodeController::class)->myDiscount();
    }

    public function earnings(): JsonResponse
    {
        return app(ReferralRewardController::class)->earnings();
    }
}
