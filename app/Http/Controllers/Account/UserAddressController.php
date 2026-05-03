<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserAddressStoreRequest;
use App\Http\Resources\UserAddressResource;
use App\Models\UserAddress;
use App\Services\Account\UserAddressService;
use App\Support\CustomResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

class UserAddressController extends Controller
{
    public function __construct(private readonly UserAddressService $addresses) {}

    // Mostra la lista di tutti gli indirizzi dell'utente, con il default in cima.
    public function index(Request $request)
    {
        $list = auth()->user()->addresses()->orderBy('default', 'desc')->get();

        return UserAddressResource::collection($list);
    }

    // Mostra i dettagli di un singolo indirizzo.
    public function show(UserAddress $user_address)
    {
        return new UserAddressResource($user_address);
    }

    // Crea un nuovo indirizzo. Massimo 5 per utente, con dedup.
    public function store(UserAddressStoreRequest $request)
    {
        $user = auth()->user();

        if ($this->addresses->hasReachedLimit($user)) {
            return CustomResponse::setFailResponse(
                'Hai raggiunto il numero massimo di indirizzi',
                Response::HTTP_NOT_ACCEPTABLE
            );
        }

        $data = $request->only([
            'type', 'name', 'additional_information', 'address', 'number_type',
            'address_number', 'intercom_code', 'country', 'city', 'postal_code',
            'province', 'telephone_number', 'email', 'default',
        ]);

        // Fallback provincia: se manca la sigla ma c'e' il nome, lo usiamo.
        if (empty($data['province']) && $request->has('province_name')) {
            $data['province'] = $request->input('province_name');
        }

        if ($this->addresses->hasDuplicate($user, $data)) {
            return CustomResponse::setFailResponse(
                'Questo indirizzo è già presente tra gli indirizzi salvati.',
                Response::HTTP_CONFLICT
            );
        }

        return new UserAddressResource($this->addresses->create($user, $data));
    }

    // Modifica un indirizzo esistente: aggiorna i campi oppure imposta come predefinito.
    public function update(Request $request, UserAddress $user_address)
    {
        Gate::authorize('update', $user_address);

        if ($request->has('default')) {
            $this->addresses->setAsDefault($user_address);
        } else {
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
                'default' => 'nullable',
            ]);

            $this->addresses->update($user_address, $validated);
        }

        return CustomResponse::setSuccessResponse('Modifica effettuata con successo', Response::HTTP_OK);
    }

    // Elimina un indirizzo dalla rubrica dell'utente.
    public function destroy(UserAddress $user_address)
    {
        Gate::authorize('delete', $user_address);
        $user_address->delete();
    }
}
