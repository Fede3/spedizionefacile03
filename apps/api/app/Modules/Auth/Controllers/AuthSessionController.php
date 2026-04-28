<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\BuildsSessionPayload;

class AuthSessionController extends Controller
{
    use BuildsSessionPayload;

    public function show()
    {
        return response()->json([
            'data' => $this->buildSessionPayload(),
        ]);
    }
}
