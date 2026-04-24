<?php

/**
 * FILE: ApiDocsController.php
 * SCOPO: Espone documentazione OpenAPI/Swagger per le API Pro v1.
 *
 * ENDPOINT:
 *   - GET /api/docs       HTML con Swagger UI (fetcha lo spec YAML)
 *   - GET /api/docs.yaml  OpenAPI 3.0 raw (application/yaml)
 *
 * NOTE:
 *   - Se in futuro si installa darkaonline/l5-swagger (composer), il
 *     provider gestira' /api/documentation e questo controller puo' essere
 *     rimosso o mantenuto come endpoint legacy.
 *   - Lo spec vive in public/openapi.yaml ed e' versionato in git.
 */

namespace App\Http\Controllers;

use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ApiDocsController extends Controller
{
    /**
     * Ritorna l'HTML di Swagger UI. Usa la CDN swagger-ui-dist.
     */
    public function index(): Response
    {
        // URL relativo al root pubblico.
        $specUrl = url('/api/docs.yaml');

        $html = <<<HTML
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpediamoFacile — API Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    <style>
        body { margin: 0; background: #fafafa; }
        .topbar { display: none; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.addEventListener('load', function () {
            window.ui = SwaggerUIBundle({
                url: {$this->jsString($specUrl)},
                dom_id: '#swagger-ui',
                deepLinking: true,
                persistAuthorization: true,
                layout: 'BaseLayout'
            });
        });
    </script>
</body>
</html>
HTML;

        return response($html, 200, [
            'Content-Type'  => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-store',
        ]);
    }

    /**
     * Ritorna lo spec YAML servito dalla cartella public.
     */
    public function spec(): BinaryFileResponse|Response
    {
        $path = public_path('openapi.yaml');

        if (! is_file($path)) {
            return response('OpenAPI spec non disponibile.', 404, [
                'Content-Type' => 'text/plain; charset=UTF-8',
            ]);
        }

        return response()->file($path, [
            'Content-Type'  => 'application/yaml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=60',
        ]);
    }

    /**
     * Helper: incapsula una stringa PHP in un literal JS sicuro.
     */
    private function jsString(string $value): string
    {
        return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
}
