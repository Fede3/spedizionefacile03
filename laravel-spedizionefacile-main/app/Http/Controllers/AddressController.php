<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index()
    {
        return response()->json([]);
    }

    public function store(Request $request)
    {
        return response()->json([], 201);
    }

    public function show($id)
    {
        return response()->json(null, 404);
    }

    public function update(Request $request, $id)
    {
        return response()->json([], 200);
    }

    public function destroy($id)
    {
        return response()->json([], 204);
    }
}
