<?php

namespace App\Http\Controllers;

/**
 * CONTROLLER BASE
 *
 * Questo e' il "padre" di tutti i controller del sito.
 * Ogni altro controller (es. OrderController, CartController, ecc.)
 * "estende" questa classe, cioe' eredita le sue funzionalita' di base.
 *
 * E' una classe astratta, il che significa che non puo' essere usata direttamente,
 * ma serve solo come punto di partenza per creare altri controller.
 */
abstract class Controller
{
    //
}
