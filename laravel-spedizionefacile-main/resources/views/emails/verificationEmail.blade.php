<x-mail::message>
# Conferma il tuo indirizzo email

Grazie per esserti registrato su **SpedizioneFacile**.

Per completare l'attivazione del tuo account, clicca sul pulsante qui sotto:

<x-mail::button :url="$url">
Conferma email
</x-mail::button>

Se il pulsante non funziona, copia e incolla questo link nel browser:

{{ $url }}

Il link scade tra 60 minuti.

Grazie,<br>
{{ config('app.name') }}
</x-mail::message>
