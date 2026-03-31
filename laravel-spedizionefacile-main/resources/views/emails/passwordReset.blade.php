<x-mail::message>

<x-mail::button :url="config('app.frontend_url') . '/aggiorna-password?token=' . urlencode($token) . '&email=' . urlencode($email)">
Recupera password
</x-mail::button>

{{-- Thanks,<br> --}}
{{-- {{ config('app.name') }} --}}
</x-mail::message>
