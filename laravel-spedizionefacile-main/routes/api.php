<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\WithdrawalController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ProRequestController;
use App\Http\Middleware\CheckAdmin;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/logout', function (Request $request) {
    Auth::guard('web')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return response()->json(['message' => 'Logged out']);
})->middleware('auth:sanctum');

// Wallet
Route::middleware('auth:sanctum')->prefix('wallet')->group(function () {
    Route::get('/balance', [WalletController::class, 'balance']);
    Route::get('/movements', [WalletController::class, 'movements']);
    Route::post('/top-up', [WalletController::class, 'topUp']);
    Route::post('/pay', [WalletController::class, 'payWithWallet']);
});

// Referral
Route::middleware('auth:sanctum')->prefix('referral')->group(function () {
    Route::get('/my-code', [ReferralController::class, 'myCode']);
    Route::post('/validate', [ReferralController::class, 'validate']);
    Route::post('/apply', [ReferralController::class, 'apply']);
    Route::post('/store', [ReferralController::class, 'storeReferral']);
    Route::get('/my-discount', [ReferralController::class, 'myDiscount']);
    Route::get('/earnings', [ReferralController::class, 'earnings']);
});

// Withdrawals (Pro users)
Route::middleware('auth:sanctum')->prefix('withdrawals')->group(function () {
    Route::get('/', [WithdrawalController::class, 'index']);
    Route::post('/', [WithdrawalController::class, 'store']);
});

// Pro Request
Route::middleware('auth:sanctum')->prefix('pro-request')->group(function () {
    Route::post('/', [ProRequestController::class, 'store']);
    Route::get('/status', [ProRequestController::class, 'status']);
});

// Admin routes
Route::middleware(['auth:sanctum', CheckAdmin::class])->prefix('admin')->group(function () {
    Route::get('/wallet/overview', [AdminController::class, 'walletOverview']);
    Route::get('/wallet/users/{user}/movements', [AdminController::class, 'userMovements']);
    Route::get('/withdrawals', [AdminController::class, 'withdrawals']);
    Route::post('/withdrawals/{withdrawal}/approve', [AdminController::class, 'approveWithdrawal']);
    Route::post('/withdrawals/{withdrawal}/reject', [AdminController::class, 'rejectWithdrawal']);
    Route::get('/referrals', [AdminController::class, 'referralStats']);
    Route::get('/pro-requests', [ProRequestController::class, 'index']);
    Route::patch('/pro-requests/{proRequest}/approve', [ProRequestController::class, 'approve']);
    Route::patch('/pro-requests/{proRequest}/reject', [ProRequestController::class, 'reject']);
    Route::get('/users', [AdminController::class, 'users']);
    Route::patch('/users/{user}/approve', [AdminController::class, 'approveUser']);
    Route::patch('/users/{user}/role', [AdminController::class, 'updateUserRole']);
    Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);
});
