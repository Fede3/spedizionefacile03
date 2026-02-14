<?php
/**
 * FILE: UserAddressController.php
 * SCOPO: Gestisce la rubrica indirizzi dell'utente (max 5 indirizzi, con predefinito).
 *
 * COSA ENTRA:
 *   - UserAddressStoreRequest per store (nome, via, CAP, citta', provincia, telefono, email)
 *   - Request per update (tutti i campi o solo {default: true})
 *   - UserAddress tramite route model binding per show/update/destroy
 *
 * COSA ESCE:
 *   - UserAddressResource collection (index) o singolo (show)
 *   - CustomResponse success/fail per update/destroy
 *
 * CHIAMATO DA:
 *   - routes/api.php — GET/POST /api/user-addresses, GET/PUT/DELETE /api/user-addresses/{id}
 *   - nuxt: pages/account/indirizzi/index.vue, pages/la-tua-spedizione/[step].vue
 *
 * EFFETTI COLLATERALI:
 *   - Database: crea/modifica/elimina record in user_addresses
 *   - Il modello UserAddress gestisce automaticamente il flag "default" (vedi UserAddress::boot)
 *
 * ERRORI TIPICI:
 *   - 406: raggiunto il limite massimo di 5 indirizzi
 *   - 403: tentativo di modificare/eliminare indirizzo di un altro utente (Gate)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/UserAddress.php — logica automatica del predefinito (boot events)
 *   - AddressController.php — controller base (segnaposto non utilizzato)
 */

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserAddress;
use Illuminate\Http\Request;
use App\Utils\CustomResponse;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Gate;
use App\Http\Resources\UserAddressResource;
use App\Http\Requests\UserAddressStoreRequest;
use Symfony\Component\HttpFoundation\Response;
class UserAddressController extends Controller
{
    // Mostra la lista di tutti gli indirizzi dell'utente
    // Li ordina mettendo prima quello predefinito (default)
    public function index(Request $request) {

        $addresses = auth()->user()->addresses()->orderBy('default', 'desc')->get();

        return UserAddressResource::collection($addresses);
    }

    // Mostra i dettagli di un singolo indirizzo
    public function show(UserAddress $user_address) {

        return new UserAddressResource($user_address);
    }

    // Crea un nuovo indirizzo nella rubrica dell'utente
    // L'utente puo' avere al massimo 5 indirizzi salvati
    public function store(UserAddressStoreRequest $request) {

        // Controlliamo che l'utente non abbia gia' raggiunto il limite di 5 indirizzi
        if (auth()->user()->addresses()->count() >= 5) {
            $errorMsg = "Hai raggiunto il numero massimo di indirizzi";

            return CustomResponse::setFailResponse($errorMsg, Response::HTTP_NOT_ACCEPTABLE);
        }

        // Prendiamo solo i campi che ci servono dalla richiesta
        $data = $request->only(
            [
                'type',
                'name',
                'additional_information',
                'address',
                'number_type',
                'address_number',
                'intercom_code',
                'country',
                'city',
                'postal_code',
                'province',
                'telephone_number',
                'email',
                'default'
            ]
        );

        // Se la provincia non e' stata fornita ma c'e' il nome della provincia, usiamo quello
        if (empty($data['province']) && $request->has('province_name')) {
            $data['province'] = $request->input('province_name');
        }

        // Impostiamo valori predefiniti per i campi che il frontend potrebbe non inviare
        $data['type'] = $data['type'] ?? 'shipping';        // Tipo: spedizione (default)
        $data['country'] = $data['country'] ?? 'IT';        // Paese: Italia (default)
        $data['number_type'] = $data['number_type'] ?? 'civico';  // Tipo numero: civico (default)
        $data['address_number'] = $data['address_number'] ?? '';   // Numero: vuoto se non specificato

        // Creiamo l'indirizzo e lo colleghiamo all'utente
        $user_address = UserAddress::make($data);
        auth()->user()->addresses()->save($user_address);

        return new UserAddressResource($user_address);
    }


    // Modifica un indirizzo esistente dell'utente
    // Puo' aggiornare tutti i campi oppure solo impostare l'indirizzo come predefinito
    public function update(Request $request, UserAddress $user_address) {

        // Controllo di sicurezza: verifica che l'utente abbia il permesso di modificare questo indirizzo
        // (ogni utente puo' modificare solo i PROPRI indirizzi)
        Gate::authorize('update', $user_address);

        // Se la richiesta contiene solo il campo "default", impostiamo l'indirizzo come predefinito
        if ($request->has('default')) {
            $user_address->update(['default' => true]);
        } else {
            // Se l'utente sta modificando gli altri campi dell'indirizzo
            $validated = $request->validate([
                'name' => 'required|string',
                'additional_information' => 'nullable|string',
                'address' => 'required|string',
                'number_type' => 'required|string',
                'address_number' => 'required|string',
                'intercom_code' => 'nullable|string',
                'country' => 'required|string',
                'city' => 'required|string',
                'postal_code' => 'required|string',
                'province' => 'required|string',
                'telephone_number' => 'required|string',
                'email' => 'nullable|string',
                'default' => 'nullable'
            ]);

            // Aggiorniamo solo i campi che sono effettivamente cambiati
            // (per evitare di fare scritture inutili nel database)
            $updateData = [];
            foreach ($validated as $key => $value) {
                if ($user_address->$key !== $value) {
                    $updateData[$key] = $value;
                }
            }

            if (!empty($updateData)) {
                $user_address->update($updateData);
            }
        }

        return CustomResponse::setSuccessResponse('Modifica effettuata con successo', Response::HTTP_OK);

    }

    // Elimina un indirizzo dalla rubrica dell'utente
    public function destroy(UserAddress $user_address) {

        // Controllo di sicurezza: verifica che l'utente abbia il permesso di eliminare questo indirizzo
        Gate::authorize('delete', $user_address);
        $user_address->delete();
    }
}
