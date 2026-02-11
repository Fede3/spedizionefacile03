<?php

namespace App\Http\Controllers;

use App\Models\BillingAddress;
use Illuminate\Http\Request;
use App\Http\Resources\BillingAddressResource;
use App\Http\Requests\BillingAddressStoreRequest;

class BillingAddressController extends Controller
{
    public function index(Request $request) {
        
        return BillingAddressResource::collection(
            $request->addresses
        );
    }

    public function show(BillingAddress $address) {
        
        return new BillingAddressResource($address);
    }

    public function store(BillingAddressStoreRequest $request) {

        $address = BillingAddress::create($request->validated());   

        return new BillingAddressResource($address);
    }
}
