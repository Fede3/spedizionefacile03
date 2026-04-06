<?php

namespace App\Http\Controllers;

use App\Services\StripePaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StripeCustomerController extends Controller
{
    public function __construct(
        private readonly StripePaymentService $stripe,
    ) {}

    public function createOrGetCustomer($user)
    {
        return $this->stripe->createOrGetCustomer($user);
    }

    public function createSetupIntent(Request $request)
    {
        if (!$this->stripe->isConfigured()) return response()->json(['error' => 'Stripe non configurato.'], 503);
        try {
            return response()->json($this->stripe->createSetupIntent($request->user()));
        } catch (\Exception $e) {
            Log::error('SetupIntent creation error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Errore durante la configurazione del metodo di pagamento.'], 500);
        }
    }

    public function listPaymentMethods(Request $request)
    {
        $user = $request->user();
        if (!$user->customer_id || !$this->stripe->isConfigured()) return response()->json(['data' => [], 'default' => null]);
        return response()->json($this->stripe->listPaymentMethods($user));
    }

    public function setDefaultPaymentMethod(Request $request)
    {
        $request->validate(['payment_method' => 'required|string']);
        $user = $request->user();
        if (!$user->customer_id) return response()->json(['error' => 'No Stripe customer'], 400);
        try { return response()->json($this->stripe->setDefaultPaymentMethod($user, $request->payment_method)); }
        catch (\Exception $e) {
            Log::warning('setDefaultPaymentMethod failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Impostazione metodo di pagamento non riuscita.'], 400);
        }
    }

    public function changeDefaultPaymentMethod(Request $request)
    {
        $request->validate(['payment_method_id' => 'required|string']);
        $user = $request->user();
        if (!$user->customer_id) return response()->json(['error' => 'No Stripe customer'], 400);
        try { return response()->json($this->stripe->changeDefaultPaymentMethod($user, $request->payment_method_id)); }
        catch (\Exception $e) {
            Log::warning('changeDefaultPaymentMethod failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Modifica metodo di pagamento non riuscita.'], 400);
        }
    }

    public function deleteCard(Request $request)
    {
        $request->validate(['payment_method_id' => 'required|string']);
        $user = $request->user();
        if (!$user->customer_id) return response()->json(['error' => 'Nessun profilo Stripe associato.'], 400);
        try {
            $this->stripe->deleteCard($user, $request->payment_method_id);
            return response()->json(['success' => true]);
        } catch (\RuntimeException $e) {
            Log::warning('deleteCard ownership/permission error', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Non autorizzato a eliminare questa carta.'], 403);
        } catch (\Exception $e) {
            Log::warning('deleteCard failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            return response()->json(['error' => 'Eliminazione carta non riuscita.'], 400);
        }
    }

    public function getDefaultPaymentMethod(Request $request)
    {
        $user = $request->user();
        if (!$user->customer_id || !$this->stripe->isConfigured()) return response()->json(['card' => null]);
        return response()->json(['card' => $this->stripe->getDefaultPaymentMethod($user)]);
    }
}
