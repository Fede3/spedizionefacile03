<?php

/**
 * MIDDLEWARE: INTESTAZIONI DI SICUREZZA
 *
 * Questo middleware aggiunge delle intestazioni (headers) di sicurezza
 * a TUTTE le risposte del server. Le intestazioni di sicurezza dicono
 * al browser dell'utente come comportarsi per proteggerlo da attacchi.
 *
 * In pratica:
 * - Impedisce che il sito venga caricato dentro un altro sito (clickjacking)
 * - Protegge da attacchi XSS (script malevoli iniettati nella pagina)
 * - Forza l'uso di HTTPS (connessione sicura/criptata)
 * - Blocca l'accesso a fotocamera, microfono e GPS
 * - Definisce quali script e risorse possono essere caricati (CSP)
 */

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Impedisce al browser di "indovinare" il tipo di file (previene attacchi MIME)
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        // Impedisce che il sito venga caricato in un iframe di un altro sito
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        // Attiva la protezione XSS del browser
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        // Controlla quali informazioni vengono inviate quando si clicca un link esterno
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        // Blocca l'accesso a fotocamera, microfono e geolocalizzazione
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        // Forza il browser a usare sempre HTTPS per un anno
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        // Content Security Policy: definisce quali risorse esterne sono permesse
        // (script di Stripe per i pagamenti, stili inline, immagini da qualsiasi HTTPS)
        $response->headers->set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; object-src 'none'; base-uri 'self'");

        return $response;
    }
}
