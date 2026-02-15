<?php
/**
 * FILE: User.php
 * SCOPO: Modello utente registrato su SpedizioneFacile con ruoli (User, Partner Pro, Admin).
 *
 * COSA ENTRA:
 *   - Dati utente: name, surname, email, telephone_number, password, referral_code, referred_by
 *
 * COSA ESCE:
 *   - Relazioni: addresses, packages, orders, walletMovements, referralUsagesAsPro, withdrawalRequests, proRequests
 *   - Metodi: walletBalance() (saldo portafoglio), commissionBalance() (saldo commissioni Pro)
 *   - Helper: isAdmin(), isPro()
 *
 * CHIAMATO DA:
 *   - Tutti i controller (auth()->user() restituisce questo modello)
 *   - WalletController.php — walletBalance(), commissionBalance()
 *   - ReferralController.php — referralUsagesAsPro(), isPro()
 *   - AdminController.php — gestione utenti, ruoli, portafogli
 *
 * EFFETTI COLLATERALI:
 *   - Boot: se ruolo "Partner Pro" e referral_code vuoto, genera codice 8 caratteri alla creazione
 *   - password: hashata automaticamente tramite cast 'hashed'
 *
 * ERRORI TIPICI:
 *   - role non e' in $fillable (protezione mass assignment): va impostato manualmente ($user->role = ...)
 *
 * DOCUMENTI CORRELATI:
 *   - app/Models/WalletMovement.php — movimenti portafoglio per calcolo saldo
 *   - app/Models/ReferralUsage.php — utilizzi referral per calcolo commissioni
 *   - app/Models/WithdrawalRequest.php — prelievi per calcolo commissionBalance
 *   - CustomRegisterController.php — creazione utente con ruolo "User"
 */

namespace App\Models;

use App\Models\Order;
use App\Models\Package;
use App\Models\UserAddress;
use App\Models\WalletMovement;
use App\Models\ReferralUsage;
use App\Models\ProRequest;
use App\Models\WithdrawalRequest;
use Illuminate\Support\Str;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /* HasApiTokens, */

    /**
     * Campi compilabili dall'esterno (mass assignment).
     * Sono i dati che possono essere inseriti o modificati quando si crea/aggiorna un utente.
     * E' una protezione di Laravel: solo questi campi possono essere scritti in massa,
     * cosi' nessuno puo' modificare campi sensibili (come il ruolo) senza autorizzazione.
     */
    protected $fillable = [
        'name',                          // Nome dell'utente
        'surname',                       // Cognome dell'utente
        'email',                         // Indirizzo email (usato anche per il login)
        'telephone_number',              // Numero di telefono
        'password',                      // Password (viene salvata criptata)
        'referral_code',                 // Codice referral personale (solo per utenti Pro)
        'referred_by',                   // Codice referral di chi lo ha invitato
        'identifier',                    // Identificativo univoco dell'utente
        'email_verified_at',             // Data e ora in cui l'email e' stata verificata
        'stripe_account_id',             // ID dell'account Stripe (per pagamenti)
        'customer_id',                   // ID cliente su Stripe
        'verification_code',             // Codice di verifica temporaneo per il login
        'verification_code_expires_at',  // Scadenza del codice di verifica
        'user_type',                     // Tipo account: "privato" o "commerciante"
        'google_id',                     // ID Google OAuth (per login con Google)
        'avatar',                        // URL dell'avatar (da Google)
    ];

    /**
     * Campi nascosti nelle risposte JSON.
     * Quando i dati dell'utente vengono inviati al frontend (al browser),
     * questi campi NON vengono inclusi per motivi di sicurezza.
     * Ad esempio, la password non deve mai essere visibile.
     */
    protected $hidden = [
        'password',
        'updated_at',
        'remember_token',
        'verification_code',
        'verification_code_expires_at',
    ];

    /**
     * Conversioni automatiche dei tipi di dato.
     * Laravel converte automaticamente questi campi nel tipo giusto:
     * - Le date vengono trasformate in oggetti Carbon (per gestire facilmente le date)
     * - La password viene automaticamente criptata quando viene salvata
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'verification_code_expires_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /* protected static function booted()
    {
        static::creating(function ($user) {
            $user->identifier = (string) Str::uuid();
        });
    } */

    // Controlla se l'utente e' un amministratore del sito
    // Restituisce true (vero) se il ruolo dell'utente e' "Admin"
    public function isAdmin(): bool {
        return $this->role === 'Admin';
    }

    // Relazione: un utente ha MOLTI indirizzi salvati nella sua rubrica
    // Esempio: casa, ufficio, magazzino...
    public function addresses() {
        return $this->hasMany(UserAddress::class);
    }

    /* public function cart() {
        return $this->belongsToMany(Package::class, 'cart_user')
                    ->withPivot('quantity')
                    ->withTimestamps();
    } */

    /* public function cart() {
        return $this->hasMany(CartUser::class); // carrello dell'utente
    } */

    // Relazione: un utente ha MOLTI pacchi configurati
    // Sono i pacchi che l'utente ha preparato per la spedizione
    public function packages() {
        return $this->hasMany(Package::class);
    }

    // Relazione: un utente ha MOLTI ordini
    // Ogni volta che l'utente paga una spedizione, viene creato un ordine
    public function orders() {
        return $this->hasMany(Order::class);
    }

    // Controlla se l'utente e' un Partner Pro
    // I Partner Pro hanno un codice referral e guadagnano commissioni
    public function isPro(): bool {
        return $this->role === 'Partner Pro';
    }

    // Relazione: un utente ha MOLTI movimenti nel portafoglio
    // I movimenti possono essere ricariche (credit) o pagamenti (debit)
    public function walletMovements() {
        return $this->hasMany(WalletMovement::class);
    }

    // Relazione: un utente Pro ha MOLTI utilizzi del suo codice referral
    // Ogni volta che qualcuno usa il suo codice, viene registrato qui
    public function referralUsagesAsPro() {
        return $this->hasMany(ReferralUsage::class, 'pro_user_id');
    }

    // Relazione: un utente ha MOLTE richieste di prelievo delle commissioni guadagnate
    public function withdrawalRequests() {
        return $this->hasMany(WithdrawalRequest::class);
    }

    // Relazione: un utente ha MOLTE richieste per diventare Partner Pro
    public function proRequests() {
        return $this->hasMany(ProRequest::class);
    }

    /**
     * Calcola il saldo del portafoglio dell'utente.
     * Prende tutti i movimenti confermati, somma le ricariche (credit)
     * e sottrae i pagamenti (debit). Il risultato e' il saldo disponibile.
     */
    public function walletBalance(): float {
        $credits = $this->walletMovements()
            ->where('status', 'confirmed')
            ->where('type', 'credit')
            ->sum('amount');
        $debits = $this->walletMovements()
            ->where('status', 'confirmed')
            ->where('type', 'debit')
            ->sum('amount');
        return round($credits - $debits, 2);
    }

    /**
     * Calcola il saldo delle commissioni guadagnate dall'utente Pro.
     * Prende le commissioni confermate e sottrae i prelievi gia' approvati o completati.
     * Il risultato e' quanto puo' ancora prelevare.
     */
    public function commissionBalance(): float {
        $earned = $this->referralUsagesAsPro()
            ->where('status', 'confirmed')
            ->sum('commission_amount');
        $withdrawn = $this->withdrawalRequests()
            ->whereIn('status', ['approved', 'completed'])
            ->sum('amount');
        return round($earned - $withdrawn, 2);
    }

    /**
     * Azioni automatiche quando viene creato un nuovo utente.
     * Se l'utente e' un Partner Pro e non ha ancora un codice referral,
     * gliene viene generato uno casuale di 8 caratteri (es. "AB3K9XZ2").
     */
    protected static function booted()
    {
        static::creating(function ($user) {
            if ($user->role === 'Partner Pro' && empty($user->referral_code)) {
                $user->referral_code = strtoupper(Str::random(8));
            }
        });
    }
}
