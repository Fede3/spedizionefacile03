<?php

namespace App\Http\Controllers;

/**
 * FILE: Controller.php
 * SCOPO: Classe base (astratta) da cui ereditano tutti i controller dell'applicazione.
 *
 * DOVE SI USA: Tutti i controller del progetto estendono questa classe.
 *
 * VINCOLI:
 *   - E' una classe astratta: non puo' essere istanziata direttamente.
 *   - Ogni nuovo controller DEVE estendere questa classe (es. "class NuovoController extends Controller").
 *   - Se serve aggiungere logica comune a tutti i controller, va messa qui.
 *
 * COLLEGAMENTI:
 *   - Tutti i file in app/Http/Controllers/ ereditano da questa classe.
 */
abstract class Controller
{
    //
}
