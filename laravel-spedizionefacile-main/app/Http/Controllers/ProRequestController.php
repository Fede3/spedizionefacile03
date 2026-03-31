<?php

/**
 * FILE: ProRequestController.php
 * SCOPO: Gestisce le richieste per diventare Partner Pro (invio, stato, approvazione/rifiuto admin).
 *
 * COSA ENTRA:
 *   - Request con company_name, vat_number, message per store
 *   - ProRequest (route model binding) per approve/reject
 *
 * COSA ESCE:
 *   - JSON con success, data (richiesta creata) per store
 *   - JSON con has_request, data (richiesta piu' recente) per status
 *   - JSON con data (lista tutte le richieste con utente) per index (admin)
 *   - JSON con success, data (richiesta aggiornata + utente con ruolo) per approve/reject
 *
 * CHIAMATO DA:
 *   - routes/api.php — POST /api/pro-request, GET /api/pro-request/status
 *   - routes/api.php — GET /api/admin/pro-requests (admin)
 *   - routes/api.php — POST /api/admin/pro-requests/{id}/approve|reject (admin)
 *   - nuxt: pages/account/account-pro.vue, pannello admin
 *
 * EFFETTI COLLATERALI:
 *   - Database: crea record in pro_requests con status "pending"
 *   - Database (approve): aggiorna ruolo utente a "Partner Pro", genera referral_code 8 caratteri
 *   - Database (reject): aggiorna status a "rejected", salva reviewed_at
 *
 * VINCOLI:
 *   - Un utente puo' avere al massimo UNA richiesta pending alla volta
 *   - L'approvazione genera automaticamente un referral_code di 8 caratteri
 *   - Il codice referral viene generato SOLO se l'utente non ne ha gia' uno
 *   - Solo le richieste con status "pending" possono essere approvate o rifiutate
 *
 * ERRORI TIPICI:
 *   - 422: utente gia' Partner Pro, oppure richiesta gia' in attesa, oppure richiesta non pending
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere campi alla richiesta: aggiungerli in store() e nel modello ProRequest
 *   - Per cambiare la lunghezza del codice referral: modificare Str::random(8) in approve()
 *
 * COLLEGAMENTI:
 *   - app/Models/ProRequest.php — modello richiesta con company_name, vat_number, status
 *   - ReferralController.php — funzionalita' referral disponibili dopo approvazione
 *   - pages/account/account-pro.vue — pagina frontend richiesta Pro
 */

namespace App\Http\Controllers;

use App\Models\ProRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProRequestController extends Controller
{
    /**
     * Invia una nuova richiesta per diventare Partner Pro.
     * L'utente non deve gia' essere Pro e non deve avere una richiesta in attesa.
     */
    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();

        // Se l'utente e' gia' Partner Pro, non puo' fare un'altra richiesta
        if ($user->isPro()) {
            return response()->json([
                'message' => 'Sei già un Partner Pro.',
            ], 422);
        }

        // Controlliamo che non ci sia gia' una richiesta in attesa di revisione
        $pendingRequest = ProRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($pendingRequest) {
            return response()->json([
                'message' => 'Hai già una richiesta in attesa di revisione.',
            ], 422);
        }

        // Creiamo la richiesta con i dati dell'azienda
        $proRequest = ProRequest::create([
            'user_id' => $user->id,
            'company_name' => $request->input('company_name') ?? '',
            'vat_number' => $request->input('vat_number') ?? '',
            'message' => $request->input('message') ?? '',
            'status' => 'pending', // In attesa di revisione da parte dell'admin
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Richiesta Pro inviata con successo.',
            'data' => $proRequest,
        ], 201);
    }

    /**
     * Mostra lo stato della richiesta Pro dell'utente corrente.
     * L'utente puo' vedere se ha una richiesta in attesa, approvata o rifiutata.
     */
    public function status(): JsonResponse
    {
        $user = auth()->user();

        // Cerchiamo la richiesta piu' recente dell'utente
        $proRequest = ProRequest::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->first();

        if (! $proRequest) {
            return response()->json([
                'has_request' => false,
                'data' => null,
            ]);
        }

        return response()->json([
            'has_request' => true,
            'data' => $proRequest,
        ]);
    }

    /**
     * Funzione per l'AMMINISTRATORE: mostra la lista di tutte le richieste Pro
     * di tutti gli utenti, con i dati dell'utente che ha fatto la richiesta.
     */
    public function index(): JsonResponse
    {
        $proRequests = ProRequest::with('user:id,name,surname,email,role')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $proRequests]);
    }

    /**
     * Funzione per l'AMMINISTRATORE: approva una richiesta Pro.
     * Cambia lo stato della richiesta in "approvato" e aggiorna il ruolo dell'utente
     * a "Partner Pro", generando anche un codice referral unico.
     */
    public function approve(ProRequest $proRequest): JsonResponse
    {
        // La richiesta deve essere ancora in attesa per poter essere approvata
        if ($proRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Questa richiesta non è in attesa.',
            ], 422);
        }

        // Aggiorniamo lo stato della richiesta a "approvata"
        $proRequest->update([
            'status' => 'approved',
            'reviewed_at' => now(),
        ]);

        // Aggiorniamo il ruolo dell'utente a "Partner Pro"
        // e generiamo un codice referral se non ne ha gia' uno
        /** @var User $user */
        $user = $proRequest->user;
        $user->update([
            'role' => 'Partner Pro',
            'referral_code' => $user->referral_code ?: strtoupper(Str::random(8)),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Richiesta approvata. L\'utente è ora Partner Pro.',
            'data' => $proRequest->fresh()->load('user:id,name,surname,email,role,referral_code'),
        ]);
    }

    /**
     * Funzione per l'AMMINISTRATORE: rifiuta una richiesta Pro.
     */
    public function reject(ProRequest $proRequest): JsonResponse
    {
        if ($proRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Questa richiesta non è in attesa.',
            ], 422);
        }

        $proRequest->update([
            'status' => 'rejected',
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Richiesta rifiutata.',
            'data' => $proRequest->fresh(),
        ]);
    }
}
