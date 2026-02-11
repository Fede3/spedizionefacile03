<?php

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
    public function index(Request $request) {
        
        $addresses = auth()->user()->addresses()->orderBy('default', 'desc')->get();

        return UserAddressResource::collection($addresses);
    }

    public function show(UserAddress $user_address) {
        
        return new UserAddressResource($user_address);
    }

    public function store(UserAddressStoreRequest $request) {

        if (auth()->user()->addresses()->count() >= 5) {
            $errorMsg = "Hai raggiunto il numero massimo di indirizzi";

            return CustomResponse::setFailResponse($errorMsg, Response::HTTP_NOT_ACCEPTABLE);
        }


        $user_address = UserAddress::make($request->only(
            [
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
        ));

        auth()->user()->addresses()->save($user_address);

        return new UserAddressResource($user_address);
    }


    public function update(Request $request, UserAddress $user_address) {

        Gate::authorize('update', $user_address);

        if ($request->has('default')) {
            $user_address->update(['default' => true]);
        } else {
            // Se l'utente modifica gli altri campi
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

            // Aggiorna solo i campi che sono diversi
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

    public function destroy(UserAddress $user_address) {

        Gate::authorize('delete', $user_address);
        $user_address->delete();
    }
}
