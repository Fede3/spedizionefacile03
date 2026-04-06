<?php
/**
 * FILE: User.php
 * SCOPO: Modello utente registrato su SpediamoFacile con ruoli (User, Partner Pro, Admin).
 *
 * DOVE SI USA:
 *   - Tutti i controller (auth()->user() restituisce questo modello)
 *   - WalletController.php — walletBalance(), commissionBalance()
 *   - ReferralController.php — referralUsagesAsPro(), isPro()
 *   - Admin/UserManagementController.php — gestione utenti, ruoli, portafogli
 *
 * DATI IN INGRESSO:
 *   - Dati utente: name, surname, email, telephone_number, password, referral_code, referred_by
 *   Esempio: User::create(['name' => 'Mario', 'email' => 'mario@test.it', 'password' => 'secret'])
 *
 * DATI IN USCITA:
 *   - Relazioni: addresses, packages, orders, walletMovements, referralUsagesAsPro, withdrawalRequests
 *   - Metodi: walletBalance() (saldo portafoglio in euro), commissionBalance() (commissioni Pro in euro)
 *   - Helper: isAdmin() (true se role='Admin'), isPro() (true se role='Partner Pro')
 *   Esempio: $user->walletBalance() => 15.50, $user->isAdmin() => false
 *
 * VINCOLI:
 *   - role NON e' in $fillable (protezione mass assignment): va impostato con $user->role = 'Admin'
 *   - password viene hashata automaticamente tramite cast 'hashed'
 *   - Il referral_code viene generato automaticamente per i Partner Pro (boot creating)
 *   - Ruoli validi: "User", "Partner Pro", "Admin"
 *
 * ERRORI TIPICI:
 *   - Usare User::create(['role' => 'Admin']): il campo role non e' in $fillable
 *   - Hashare la password manualmente: il cast 'hashed' lo fa gia'
 *   - Confondere walletBalance (portafoglio virtuale) con commissionBalance (commissioni referral)
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere un nuovo ruolo: aggiungere il check in isAdmin()/isPro() o creare nuovo metodo
 *   - Per aggiungere campi utente: aggiungere in $fillable e nella migrazione
 *   - Per nascondere campi in JSON: aggiungere in $hidden
 *
 * COLLEGAMENTI:
 *   - app/Models/WalletMovement.php — movimenti portafoglio per calcolo saldo
 *   - app/Models/ReferralUsage.php — utilizzi referral per calcolo commissioni
 *   - app/Models/WithdrawalRequest.php — prelievi per calcolo commissionBalance
 *   - app/Http/Controllers/CustomRegisterController.php — creazione utente con ruolo "User"
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
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

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
        'verification_code',             // Codice di verifica temporaneo per il login
        'verification_code_expires_at',  // Scadenza del codice di verifica
        'user_type',                     // Tipo account: "privato" o "commerciante"
        'avatar',                        // URL dell'avatar (da Google)
        // SICUREZZA: i seguenti campi NON sono in $fillable (assegnare con $user->campo = valore):
        // - role: ruolo utente (User, Partner Pro, Admin)
        // - stripe_account_id: ID account Stripe
        // - customer_id: ID cliente Stripe
        // - google_id, facebook_id, apple_id: ID provider OAuth
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
        'stripe_account_id',
        'customer_id',
        'google_id',
        'facebook_id',
        'apple_id',
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

    /* ===== SCOPES — Query predefinite per ruoli e stati comuni ===== */

    public function scopeAdmins($query)
    {
        return $query->where('role', 'Admin');
    }

    public function scopePartnerPro($query)
    {
        return $query->where('role', 'Partner Pro');
    }

    public function scopeVerified($query)
    {
        return $query->whereNotNull('email_verified_at');
    }

    public function scopeUnverified($query)
    {
        return $query->whereNull('email_verified_at');
    }

    // Relazione: un utente ha MOLTI indirizzi salvati nella sua rubrica
    // Esempio: casa, ufficio, magazzino...
    public function addresses(): HasMany {
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
    public function packages(): HasMany {
        return $this->hasMany(Package::class);
    }

    // Relazione: un utente ha MOLTI ordini
    // Ogni volta che l'utente paga una spedizione, viene creato un ordine
    public function orders(): HasMany {
        return $this->hasMany(Order::class);
    }

    // Controlla se l'utente e' un Partner Pro
    // I Partner Pro hanno un codice referral e guadagnano commissioni
    public function isPro(): bool {
        return $this->role === 'Partner Pro';
    }

    // Relazione: un utente ha MOLTI movimenti nel portafoglio
    // I movimenti possono essere ricariche (credit) o pagamenti (debit)
    public function walletMovements(): HasMany {
        return $this->hasMany(WalletMovement::class);
    }

    // Relazione: un utente Pro ha MOLTI utilizzi del suo codice referral
    // Ogni volta che qualcuno usa il suo codice, viene registrato qui
    public function referralUsagesAsPro(): HasMany {
        return $this->hasMany(ReferralUsage::class, 'pro_user_id');
    }

    // Relazione: un utente ha MOLTE richieste di prelievo delle commissioni guadagnate
    public function withdrawalRequests(): HasMany {
        return $this->hasMany(WithdrawalRequest::class);
    }

    // Relazione: un utente ha MOLTE richieste per diventare Partner Pro
    public function proRequests(): HasMany {
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
     * Se esiste una richiesta pending, la considera come saldo gia' riservato.
     * Il risultato e' quanto puo' ancora prelevare.
     */
    public function commissionBalance(): float {
        $earned = $this->referralUsagesAsPro()
            ->where('status', 'confirmed')
            ->sum('commission_amount');
        $reserved = $this->withdrawalRequests()
            ->where('status', 'pending')
            ->sum('amount');
        $withdrawn = $this->withdrawalRequests()
            ->whereIn('status', ['approved', 'completed'])
            ->sum('amount');
        return round($earned - $reserved - $withdrawn, 2);
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
