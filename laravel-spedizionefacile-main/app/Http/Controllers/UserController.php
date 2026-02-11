<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use App\Utils\CustomResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class UserController extends Controller
{
    public function update(Request $request, User $user)
    {

        if ($user->id !== auth()->user()->id) {
            abort(403, 'Non sei autorizzato a modificare questo utente.');
        }

        $rules = [];

        if ($request->name) {
            $rules['name'] = 'nullable|string';
        }

        if ($request->email) {
            $rules['email'] = 'required|string|email|unique:users,email,' . $user->id;
        }

        if ($request->telephone_number && $request->telephone_number !== $user->telephone_number) {
            $rules['telephone_number'] = 'nullable|string';
        }

        if ($request->password) {
            $rules['password'] = 'string|min:8|confirmed';
        }

        $validated = $request->validate($rules);

        if (!empty($validated['password'])) {
            $validated['password'] = bcrypt($validated['password']);
        }   

        $user->update($validated);

        return CustomResponse::setSuccessResponse('Modifica effettuata con successo', Response::HTTP_OK);
 
    }

    public function uploadFile(Request $request)  {
        $request->validate([
            'admin_image' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048'
        ]);

        if ($request->hasFile('admin_image')) {

            // genera nome sicuro e univoco
            $fileName = uniqid() . '.' . $request->file('admin_image')->extension();

            // salva nel disco "public"
            $path = $request->file('admin_image')->storeAs('attach', $fileName, 'public');

            return response()->json([
                'success' => true,
                'message' => 'File caricato con successo',
                'admin_image' => $path
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Nessun file trovato'
        ], 400);
    }

    public function getAdminImage() {
        // Legge tutti i file nella cartella attach
        $files = Storage::disk('public')->files('attach');

        if (empty($files)) {
            return response()->json(['image_url' => '']);
        }

        // Prendi l’ultimo file caricato (puoi cambiare criterio)
        $lastFile = collect($files)->last();

        // Costruisci l’URL pubblico
        $url = asset('storage/' . $lastFile);

        return response()->json(['image_url' => $url]);
    }


}
