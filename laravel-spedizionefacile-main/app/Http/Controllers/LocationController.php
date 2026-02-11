<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;
use App\Utils\CustomResponse;
use Illuminate\Support\Facades\Session;
use App\Http\Resources\LocationResource;
use Symfony\Component\HttpFoundation\Response;


class LocationController extends Controller
{
    /* public function index(Request $request) {
        $locations = Location::all();
        return LocationResource::collection($locations);
    } */

    public function postLocation(Request $request) {

        /* Session::flush(); */
        Session::put('city', $request->city);



        return CustomResponse::setSuccessResponse('Tutto ok', Response::HTTP_OK);
    }

    public function getLocations() {

        $city = Session::get('city');

        $result = Location::where('place_name', $city)
            ->select('postal_code', 'place_name', 'province')
            ->first(); // oppure ->get() se vuoi tutti i record corrispondenti

        return response()->json($result);
    }
}
