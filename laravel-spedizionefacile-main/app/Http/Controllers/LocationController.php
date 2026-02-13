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

    /**
     * Search locations by city name or postal code.
     * GET /api/locations/search?q=xxx
     */
    public function search(Request $request)
    {
        $query = $request->input('q', '');

        if (strlen($query) < 2) {
            return response()->json([]);
        }

        $results = Location::where('place_name', 'LIKE', '%' . $query . '%')
            ->orWhere('postal_code', 'LIKE', '%' . $query . '%')
            ->select('postal_code', 'place_name', 'province')
            ->limit(20)
            ->get();

        return response()->json($results);
    }

    /**
     * Get locations by exact postal code (CAP).
     * GET /api/locations/by-cap?cap=xxxxx
     */
    public function byCap(Request $request)
    {
        $cap = $request->input('cap', '');

        if (empty($cap)) {
            return response()->json([]);
        }

        $results = Location::where('postal_code', $cap)
            ->select('postal_code', 'place_name', 'province')
            ->get();

        return response()->json($results);
    }
}
