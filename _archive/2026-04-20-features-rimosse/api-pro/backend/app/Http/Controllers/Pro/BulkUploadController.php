<?php

/**
 * FILE: Pro/BulkUploadController.php
 * SCOPO: Caricamento bulk di spedizioni via CSV per Partner Pro.
 *
 * ENDPOINT:
 *   - POST /api/pro/bulk-upload/validate    → parse + validazione (no persist)
 *   - POST /api/pro/bulk-upload/create-orders → crea ordini draft a partire da righe valide
 *
 * INPUT VALIDATE:
 *   - rows: array di array associativi (il frontend ha gia' parsato il CSV)
 *
 * VALIDAZIONE PER RIGA:
 *   - tipo_collo, peso_kg (>0 <100), dimensioni cm (>0 <120),
 *     CAP 5 cifre, provincia 2 lettere, email valida (se presente)
 *
 * RATE LIMIT: 10/min
 * AUTH: solo Partner Pro (role === 'Partner Pro')
 */

namespace App\Http\Controllers\Pro;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Package;
use App\Models\PackageAddress;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BulkUploadController extends Controller
{
    /**
     * Header attesi del CSV. Devono corrispondere al template
     * public/templates/spedizioni_bulk_template.csv.
     */
    public const EXPECTED_HEADERS = [
        'tipo_collo', 'peso_kg', 'lunghezza_cm', 'larghezza_cm', 'altezza_cm',
        'origine_nome', 'origine_indirizzo', 'origine_cap', 'origine_citta', 'origine_provincia',
        'destinazione_nome', 'destinazione_indirizzo', 'destinazione_cap', 'destinazione_citta', 'destinazione_provincia',
        'destinazione_email', 'destinazione_telefono',
        'contenuto', 'servizio', 'note',
    ];

    /**
     * Valida le righe inviate (gia' parsate dal frontend).
     * Ritorna per ogni riga: index, valid (bool), errors (array), price_estimate (cents).
     */
    public function validateRows(Request $request): JsonResponse
    {
        $this->ensurePro();

        $rows = $request->input('rows', []);

        if (! is_array($rows)) {
            return response()->json([
                'message' => 'Formato non valido: atteso array di righe.',
            ], 422);
        }

        if (count($rows) === 0) {
            return response()->json([
                'message' => 'Nessuna riga da validare.',
            ], 422);
        }

        if (count($rows) > 500) {
            return response()->json([
                'message' => 'Massimo 500 righe per upload.',
            ], 422);
        }

        $results = [];
        $totalEstimate = 0;
        $validCount = 0;

        foreach ($rows as $index => $row) {
            $validation = $this->validateSingleRow($row);
            $rowResult = [
                'index' => $index,
                'valid' => $validation['valid'],
                'errors' => $validation['errors'],
                'price_estimate_cents' => null,
            ];

            if ($validation['valid']) {
                $estimate = $this->estimatePriceCents($row);
                $rowResult['price_estimate_cents'] = $estimate;
                $totalEstimate += $estimate;
                $validCount++;
            }

            $results[] = $rowResult;
        }

        return response()->json([
            'success' => true,
            'rows' => $results,
            'summary' => [
                'total_rows' => count($rows),
                'valid_rows' => $validCount,
                'invalid_rows' => count($rows) - $validCount,
                'total_price_cents' => $totalEstimate,
            ],
        ]);
    }

    /**
     * Crea ordini draft (status = 'pending') a partire dalle righe valide.
     * Ogni riga diventa un Package + PackageAddress + Service + Order separato.
     */
    public function createOrders(Request $request): JsonResponse
    {
        $this->ensurePro();

        $rows = $request->input('rows', []);

        if (! is_array($rows) || count($rows) === 0) {
            return response()->json(['message' => 'Nessuna riga da elaborare.'], 422);
        }

        if (count($rows) > 500) {
            return response()->json(['message' => 'Massimo 500 righe per upload.'], 422);
        }

        $user = auth()->user();
        $createdOrders = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($rows as $index => $row) {
                $validation = $this->validateSingleRow($row);
                if (! $validation['valid']) {
                    $errors[] = ['index' => $index, 'errors' => $validation['errors']];
                    continue;
                }

                $priceCents = $this->estimatePriceCents($row);

                $service = Service::create([
                    'service_type' => $row['servizio'] ?? 'standard',
                ]);

                // Indirizzi mittente + destinatario (PackageAddress e' linkato dal Package
                // tramite origin_address_id / destination_address_id, NON il contrario)
                $originAddress = PackageAddress::create([
                    'type' => 'privato',
                    'name' => $row['origine_nome'],
                    'address' => $row['origine_indirizzo'],
                    'address_number' => 'snc',
                    'number_type' => 'civico',
                    'country' => 'Italia',
                    'postal_code' => $row['origine_cap'],
                    'city' => $row['origine_citta'],
                    'province' => strtoupper($row['origine_provincia']),
                    'telephone_number' => '0000000000',
                ]);

                $destAddress = PackageAddress::create([
                    'type' => 'privato',
                    'name' => $row['destinazione_nome'],
                    'address' => $row['destinazione_indirizzo'],
                    'address_number' => 'snc',
                    'number_type' => 'civico',
                    'country' => 'Italia',
                    'postal_code' => $row['destinazione_cap'],
                    'city' => $row['destinazione_citta'],
                    'province' => strtoupper($row['destinazione_provincia']),
                    'telephone_number' => $row['destinazione_telefono'] ?? '0000000000',
                    'email' => $row['destinazione_email'] ?? null,
                ]);

                $package = Package::create([
                    'user_id' => $user->id,
                    'package_type' => $row['tipo_collo'],
                    'quantity' => 1,
                    'weight' => (string) $row['peso_kg'],
                    'first_size' => (string) $row['lunghezza_cm'],
                    'second_size' => (string) $row['larghezza_cm'],
                    'third_size' => (string) $row['altezza_cm'],
                    'service_id' => $service->id,
                    'origin_address_id' => $originAddress->id,
                    'destination_address_id' => $destAddress->id,
                    'single_price' => $priceCents,
                ]);

                $order = Order::create([
                    'user_id' => $user->id,
                    'subtotal' => $priceCents,
                    'status' => 'pending',
                ]);

                $order->packages()->attach($package->id);
                $createdOrders[] = $order->id;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($createdOrders) . ' ordini draft creati con successo.',
                'order_ids' => $createdOrders,
                'errors' => $errors,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Errore durante la creazione degli ordini: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verifica che l'utente autenticato sia Partner Pro.
     * Lancia HttpException 403 altrimenti.
     */
    protected function ensurePro(): void
    {
        $user = auth()->user();
        if (! $user || ! $user->isPro()) {
            abort(403, 'Funzionalità riservata ai Partner Pro.');
        }
    }

    /**
     * Validazione di una singola riga del CSV.
     * Ritorna ['valid' => bool, 'errors' => ['campo' => 'messaggio', ...]].
     */
    protected function validateSingleRow(array $row): array
    {
        $validator = Validator::make($row, [
            'tipo_collo' => 'required|string|max:50',
            'peso_kg' => 'required|numeric|min:0.1|max:100',
            'lunghezza_cm' => 'required|numeric|min:1|max:120',
            'larghezza_cm' => 'required|numeric|min:1|max:120',
            'altezza_cm' => 'required|numeric|min:1|max:120',
            'origine_nome' => 'required|string|max:100',
            'origine_indirizzo' => 'required|string|max:200',
            'origine_cap' => ['required', 'regex:/^\d{5}$/'],
            'origine_citta' => 'required|string|max:100',
            'origine_provincia' => ['required', 'regex:/^[A-Za-z]{2}$/'],
            'destinazione_nome' => 'required|string|max:100',
            'destinazione_indirizzo' => 'required|string|max:200',
            'destinazione_cap' => ['required', 'regex:/^\d{5}$/'],
            'destinazione_citta' => 'required|string|max:100',
            'destinazione_provincia' => ['required', 'regex:/^[A-Za-z]{2}$/'],
            'destinazione_email' => 'nullable|email|max:150',
            'destinazione_telefono' => 'nullable|string|max:30',
            'contenuto' => 'nullable|string|max:200',
            'servizio' => 'nullable|string|max:50',
            'note' => 'nullable|string|max:500',
        ], [
            'required' => 'Campo obbligatorio.',
            'numeric' => 'Deve essere un numero.',
            'min' => 'Valore troppo basso.',
            'max' => 'Valore troppo alto.',
            'email' => 'Email non valida.',
            'regex' => 'Formato non valido.',
            'string' => 'Deve essere testo.',
        ]);

        if ($validator->fails()) {
            return [
                'valid' => false,
                'errors' => $validator->errors()->toArray(),
            ];
        }

        return ['valid' => true, 'errors' => []];
    }

    /**
     * Stima prezzo in cents basata su peso + zona (origine vs destinazione).
     * Versione semplificata: 5,90 EUR + 0,50 EUR/kg, +1 EUR se interregione.
     * In produzione collegare a PriceBand o BrtService::quote().
     */
    protected function estimatePriceCents(array $row): int
    {
        $base = 590;
        $perKg = 50;
        $weight = (float) ($row['peso_kg'] ?? 0);
        $price = $base + (int) round($perKg * $weight);

        $originProv = strtoupper($row['origine_provincia'] ?? '');
        $destProv = strtoupper($row['destinazione_provincia'] ?? '');
        if ($originProv && $destProv && $originProv !== $destProv) {
            $price += 100;
        }

        return $price;
    }
}
