<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Routing\Exceptions\InvalidSignatureException;
use App\Http\Middleware\CheckAdmin;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function ($middleware) {
        $middleware->statefulApi();

        $middleware->validateCsrfTokens(except: [
            'stripe/webhook',     
        ]);

        // Aggiungi il tuo middleware al gruppo web senza sovrascrivere
        /* $middleware->appendToGroup('web', \App\Http\Middleware\CustomRememberCookie::class); */
    })
    ->withExceptions(function ($exceptions) {
        $exceptions->render(function (InvalidSignatureException $e, $request) {
            return redirect(config('app.frontend_url') . '/verifica-email?status=invalid_signature');
        });

        $exceptions->render(function (ThrottleRequestsException $e, $request) {
            return response()->json([
                'message' => 'Hai superato il numero massimo di tentativi. Riprova tra ' . ($e->getHeaders()['Retry-After'] ?? 60) . ' secondi.'
            ], 429);
        });
    })->create();

