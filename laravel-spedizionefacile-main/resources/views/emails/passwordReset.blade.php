<x-mail::message>

<x-mail::button :url="config('app.frontend_url') . '/aggiorna-password?token=' . $token">
Recupera password
</x-mail::button>

{{-- Thanks,<br> --}}
{{-- {{ config('app.name') }} --}}
</x-mail::message>
