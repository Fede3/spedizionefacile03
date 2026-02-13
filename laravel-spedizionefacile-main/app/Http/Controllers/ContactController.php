<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'surname' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'telephone_number' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:255',
            'message' => 'required|string',
        ]);

        $contactMessage = ContactMessage::create($validated);

        return response()->json([
            'message' => 'Messaggio inviato con successo.',
            'data' => $contactMessage,
        ], 201);
    }

    public function index(Request $request)
    {
        $messages = ContactMessage::orderByDesc('created_at')->get();

        return response()->json([
            'data' => $messages,
        ]);
    }

    public function markAsRead($id)
    {
        $contactMessage = ContactMessage::findOrFail($id);

        $contactMessage->update([
            'read_at' => now(),
        ]);

        return response()->json([
            'message' => 'Messaggio segnato come letto.',
            'data' => $contactMessage,
        ]);
    }
}
