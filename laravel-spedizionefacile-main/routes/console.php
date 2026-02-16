<?php

/**
 * ROTTE CONSOLE (console.php)
 *
 * Questo file definisce i comandi che possono essere eseguiti da terminale
 * (riga di comando) e i task pianificati che vengono eseguiti automaticamente.
 *
 * I task pianificati funzionano come una sveglia: ad orari prestabiliti,
 * Laravel esegue automaticamente delle operazioni di manutenzione.
 */

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// Comando "inspire": mostra una citazione motivazionale (gia' incluso in Laravel)
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Task pianificato: ogni giorno alle 3:00 di notte, pulisce gli ordini vuoti
// (ordini senza pacchi validi che non servono piu')
Schedule::command('orders:cleanup')->dailyAt('03:00');
