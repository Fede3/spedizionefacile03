<?php
/**
 * FILE: BillingAddressController.php
 * SCOPO: Gestisce gli indirizzi di fatturazione degli utenti (CRUD senza delete/update).
 *
 * COSA ENTRA:
 *   - BillingAddressStoreRequest per store (nome, via, citta', provincia, CAP)
 *   - BillingAddress tramite route model binding per show
 *
 * COSA ESCE:
 *   - BillingAddressResource collection (index) o singolo (show/store)
 *
 * CHIAMATO DA:
 *   - routes/api.php — GET/POST /api/billing-addresses, GET /api/billing-addresses/{id}
 *   - nuxt: pages/checkout.vue
 *
 * EFFETTI COLLATERALI:
 *   - Database: crea record in billing_addresses
 *
 * ERRORI TIPICI:
 *   - 422: dati di validazione non corretti (BillingAddressStoreRequest)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/BillingAddress.php — modello indirizzo fatturazione
 */

namespace App\Http\Controllers;

use App\Models\BillingAddress;
use Illuminate\Http\Request;
use App\Http\Resources\BillingAddressResource;
use App\Http\Requests\BillingAddressStoreRequest;
class BillingAddressController extends Controller
{
    // Mostra la lista di tutti gli indirizzi di fatturazione dell'utente
    public function index(Request $request) {

        return BillingAddressResource::collection(
            $request->addresses
        );
    }

    // Mostra i dettagli di un singolo indirizzo di fatturazione
    public function show(BillingAddress $address) {

        return new BillingAddressResource($address);
    }

    // Crea un nuovo indirizzo di fatturazione
    // I dati vengono prima controllati (validati) tramite BillingAddressStoreRequest
    // e poi salvati nel database
    public function store(BillingAddressStoreRequest $request) {

        $address = BillingAddress::create($request->validated());

        return new BillingAddressResource($address);
    }
}
