<?php

/**
 * CONFIGURAZIONE SERVIZI ESTERNI (services.php)
 *
 * Questo file contiene le credenziali e le impostazioni per tutti i servizi
 * esterni usati dal sito. Le credenziali vere sono salvate nel file .env
 * (che NON viene mai condiviso pubblicamente per sicurezza).
 *
 * La funzione env('NOME', 'default') legge il valore dal file .env.
 * Se il valore non esiste nel .env, usa il valore predefinito.
 *
 * Servizi configurati:
 * - Postmark: servizio per inviare email
 * - SES (Amazon): altro servizio per inviare email
 * - Slack: per notifiche interne del team
 * - Google: per il login con Google (OAuth)
 * - Stripe: per i pagamenti con carta di credito
 * - BRT: per le spedizioni con il corriere BRT
 */

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    // Postmark - servizio di invio email professionale
    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    // Amazon SES (Simple Email Service) - altro servizio email
    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // Slack - per inviare notifiche al team tramite bot
    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Google OAuth - permette agli utenti di registrarsi/loggarsi con il loro account Google
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),           // ID dell'app su Google
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),    // Chiave segreta dell'app Google
        'redirect' => env('GOOGLE_REDIRECT_URI'),          // URL dove Google rimanda dopo il login
    ],

    // Facebook OAuth - permette agli utenti di registrarsi/loggarsi con Facebook
    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('FACEBOOK_REDIRECT_URI'),
    ],

    // Apple OAuth - disponibile solo quando credenziali e callback sono configurati
    'apple' => [
        'client_id' => env('APPLE_CLIENT_ID'),
        'client_secret' => env('APPLE_CLIENT_SECRET'),
        'redirect' => env('APPLE_REDIRECT_URI'),
        'team_id' => env('APPLE_TEAM_ID'),
        'key_id' => env('APPLE_KEY_ID'),
        'private_key' => env('APPLE_PRIVATE_KEY'),
    ],

    // Stripe - sistema di pagamento con carta di credito
    'stripe' => [
        'key' => env('STRIPE_KEY'),                        // Chiave pubblica (visibile nel frontend)
        'secret' => env('STRIPE_SECRET'),                  // Chiave segreta (solo backend)
        'client_id' => env('STRIPE_CLIENT_ID'),            // ID client per Stripe Connect
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET')   // Segreto per verificare i webhook
    ],

    // BRT - corriere per le spedizioni
    'brt' => [
        'client_id' => env('BRT_CLIENT_ID'),               // ID cliente BRT
        'password' => env('BRT_PASSWORD'),                  // Password API BRT
        'api_url' => env('BRT_API_URL', 'https://api.brt.it/rest/v1/shipments'), // URL delle API spedizioni
        'pudo_api_url' => env('BRT_PUDO_API_URL', 'https://api.brt.it'),         // URL API punti ritiro
        'pudo_token' => env('BRT_PUDO_TOKEN'),              // Token per le API dei punti ritiro
        'departure_depot' => env('BRT_DEPARTURE_DEPOT', 0), // Filiale BRT di partenza (default: 0)
        'verify_ssl' => env('BRT_VERIFY_SSL', true),          // Verifica SSL (disabilitare solo in sviluppo)
    ],

];
