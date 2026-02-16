<?php
/**
 * FILE: AdminController.php
 * SCOPO: Gestisce il pannello di amministrazione (dashboard, utenti, ordini, spedizioni, impostazioni).
 *
 * DOVE SI USA: Pannello admin (pages/account/amministrazione/*), tutte le route /api/admin/*
 *
 * DATI IN INGRESSO:
 *   - dashboard(): nessuno (calcola statistiche da tutto il DB)
 *   - orders/shipments(): {status?, search?} per filtro e ricerca
 *   - updateUserRole(): {role: "User"|"Partner Pro"|"Admin"}
 *   - updateOrderStatus(): {status: "pending"|"completed"|...}
 *   - approveWithdrawal/rejectWithdrawal(): {notes?}
 *   - updateSettings(): chiavi impostazioni (stripe_*, brt_*, site_name, ...)
 *   - storeCoupon(): {code, percentage, active?}
 *
 * DATI IN USCITA:
 *   - dashboard(): {orders: {total, completed, pending, ...}, revenue, users, shipments, daily_orders[]}
 *   - orders/shipments(): dati paginati (20 per pagina) con relazioni
 *   - users(): [{id, name, surname, email, role, user_type, telephone_number, ...}]
 *   - Operazioni: {success: true, message, data?}
 *
 * VINCOLI:
 *   - Tutte le route sono protette dal middleware admin (CheckAdmin)
 *   - L'admin NON puo' eliminare il proprio account (controllo in deleteUser)
 *   - updateSettings() accetta SOLO le chiavi nella whitelist $allowed
 *   - I dati revenue sono in centesimi (sum di Transaction.total)
 *   - Le impostazioni sono salvate nella tabella settings (modello chiave-valore)
 *
 * ERRORI TIPICI:
 *   - 422: richiesta prelievo non pending, admin tenta di eliminare se stesso, BRT non configurato
 *
 * PUNTI DI MODIFICA SICURI:
 *   - Per aggiungere una statistica alla dashboard: aggiungerla nel metodo dashboard()
 *   - Per aggiungere una impostazione: aggiungerla alla lista $allowed in updateSettings()
 *   - Per aggiungere un filtro agli ordini: modificare il blocco search/status in orders()
 *
 * COLLEGAMENTI:
 *   - app/Models/Setting.php — modello chiave-valore per impostazioni dinamiche
 *   - app/Services/BrtService.php — servizio BRT per rigenerazione etichette
 *   - app/Http/Middleware/CheckAdmin.php — middleware che verifica ruolo Admin
 *   - pages/account/amministrazione/ — pagine frontend del pannello admin
 */

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Order;
use App\Models\Package;
use App\Models\Transaction;
use App\Models\ContactMessage;
use App\Models\Setting;
use App\Models\WalletMovement;
use App\Models\WithdrawalRequest;
use App\Models\ReferralUsage;
use App\Models\Coupon;
use App\Services\BrtService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\ShipmentLabelMail;
use Illuminate\Support\Str;
class AdminController extends Controller
{
    // Mostra la panoramica dei portafogli di tutti gli utenti che hanno movimenti
    // Utile per l'admin per controllare chi ha soldi nel portafoglio
    public function walletOverview(): JsonResponse
    {
        // Cerchiamo tutti gli utenti che hanno almeno un movimento nel portafoglio
        $users = User::has('walletMovements')
            ->withCount('walletMovements')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name . ' ' . $user->surname,
                    'email' => $user->email,
                    'role' => $user->role,
                    'referral_code' => $user->referral_code,
                    'wallet_balance' => $user->walletBalance(),
                    'commission_balance' => $user->isPro() ? $user->commissionBalance() : null,
                    'movements_count' => $user->wallet_movements_count,
                ];
            });

        return response()->json(['data' => $users]);
    }

    // Mostra tutti i movimenti del portafoglio di un utente specifico
    public function userMovements(User $user): JsonResponse
    {
        $movements = WalletMovement::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name . ' ' . $user->surname,
                'email' => $user->email,
                'role' => $user->role,
                'wallet_balance' => $user->walletBalance(),
            ],
            'data' => $movements,
        ]);
    }

    // Mostra tutte le richieste di prelievo dei Partner Pro
    // (con i dati dell'utente che ha fatto la richiesta)
    public function withdrawals(): JsonResponse
    {
        $requests = WithdrawalRequest::with('user:id,name,surname,email,role,referral_code')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $requests]);
    }

    // Approva una richiesta di prelievo di un Partner Pro
    // Crea un movimento di uscita (debito) nel portafoglio dell'utente
    public function approveWithdrawal(Request $request, WithdrawalRequest $withdrawal): JsonResponse
    {
        // La richiesta deve essere ancora in attesa
        if ($withdrawal->status !== 'pending') {
            return response()->json(['message' => 'Questa richiesta non e in attesa.'], 422);
        }

        // Aggiorniamo lo stato della richiesta a "approvata"
        $withdrawal->update([
            'status' => 'approved',
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
            'admin_notes' => $request->input('notes'),
        ]);

        // Registriamo l'uscita di denaro dal portafoglio dell'utente
        WalletMovement::create([
            'user_id' => $withdrawal->user_id,
            'type' => 'debit',                         // "debit" = soldi in uscita
            'amount' => $withdrawal->amount,
            'currency' => 'EUR',
            'status' => 'confirmed',
            'idempotency_key' => 'withdrawal_' . $withdrawal->id,
            'description' => 'Prelievo commissioni approvato',
            'source' => 'withdrawal',
            'reference' => 'withdrawal_' . $withdrawal->id,
        ]);

        return response()->json([
            'success' => true,
            'data' => $withdrawal->fresh(),
        ]);
    }

    // Rifiuta una richiesta di prelievo di un Partner Pro
    public function rejectWithdrawal(Request $request, WithdrawalRequest $withdrawal): JsonResponse
    {
        if ($withdrawal->status !== 'pending') {
            return response()->json(['message' => 'Questa richiesta non e in attesa.'], 422);
        }

        $withdrawal->update([
            'status' => 'rejected',
            'reviewed_at' => now(),
            'reviewed_by' => auth()->id(),
            'admin_notes' => $request->input('notes', 'Richiesta rifiutata'),
        ]);

        return response()->json([
            'success' => true,
            'data' => $withdrawal->fresh(),
        ]);
    }

    // Mostra le statistiche di tutti i codici referral utilizzati
    // Include: chi ha usato quale codice, quanto sconto e' stato dato, quante commissioni
    public function referralStats(): JsonResponse
    {
        $stats = ReferralUsage::with([
                'proUser:id,name,surname,email,referral_code',  // Il Partner Pro proprietario del codice
                'buyer:id,name,surname,email',                  // L'acquirente che ha usato il codice
            ])
            ->orderByDesc('created_at')
            ->get();

        // Calcoliamo i totali complessivi
        $summary = [
            'total_discount_given' => round($stats->sum('discount_amount'), 2),   // Totale sconti dati
            'total_commissions' => round($stats->sum('commission_amount'), 2),     // Totale commissioni
            'total_order_amount' => round($stats->sum('order_amount'), 2),         // Totale ordini con referral
            'total_usages' => $stats->count(),                                      // Numero di utilizzi
        ];

        return response()->json([
            'data' => $stats,
            'summary' => $summary,
        ]);
    }

    // Mostra la lista di tutti gli utenti registrati sul sito
    public function users(): JsonResponse
    {
        $users = User::orderByDesc('created_at')
            ->get(['id', 'name', 'surname', 'email', 'role', 'user_type', 'telephone_number', 'email_verified_at', 'created_at']);

        return response()->json(['data' => $users]);
    }

    // Cambia il tipo di account (privato/commerciante)
    public function updateUserType(User $user, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_type' => 'required|in:privato,commerciante',
        ]);

        $user->update(['user_type' => $validated['user_type']]);

        return response()->json(['success' => true, 'message' => "Tipo account aggiornato a {$validated['user_type']}."]);
    }

    // Approva (verifica) manualmente un account utente
    // Utile quando l'utente non riesce a verificare la sua email automaticamente
    public function approveUser(User $user): JsonResponse
    {
        if ($user->email_verified_at) {
            return response()->json([
                'success' => true,
                'message' => 'Account già verificato.',
                'data' => $user,
            ]);
        }

        // Segniamo l'email come verificata
        $user->update([
            'email_verified_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Account verificato con successo.',
            'data' => $user->fresh(),
        ]);
    }

    // Cambia il ruolo di un utente (es. da "User" a "Partner Pro" o "Admin")
    // Se l'utente viene promosso a Partner Pro, gli viene generato un codice referral
    public function updateUserRole(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'role' => ['required', 'string', 'in:User,Partner Pro,Admin'],
        ]);

        $oldRole = $user->role;
        $user->role = $data['role'];

        // Se l'utente diventa Partner Pro, generiamo un codice referral se non ne ha gia' uno
        if ($data['role'] === 'Partner Pro' && !$user->referral_code) {
            $user->referral_code = strtoupper(Str::random(8));
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => "Ruolo aggiornato da '{$oldRole}' a '{$data['role']}'.",
            'data' => $user->fresh(),
        ]);
    }

    // Elimina un utente dal sistema
    // L'admin non puo' eliminare se stesso (per sicurezza)
    public function deleteUser(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Non puoi eliminare il tuo account amministratore attivo.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Utente eliminato con successo.',
        ]);
    }

    /**
     * dashboard — Mostra la panoramica completa del sito con tutte le statistiche.
     *
     * PERCHE': L'admin ha bisogno di una vista d'insieme su ordini, fatturato, utenti e spedizioni.
     * COME LEGGERLO: 1) Statistiche ordini (totali, per periodo)  2) Fatturato da transazioni
     *   3) Statistiche utenti  4) Statistiche spedizioni BRT  5) Grafico ordini 30 giorni
     *   6) Ultimi 5 ordini  7) Conteggio notifiche (messaggi, prelievi, richieste Pro)
     * COME MODIFICARLO: Per aggiungere una statistica, aggiungerla nel blocco appropriato
     *   e includerla nell'array di risposta JSON.
     * COSA EVITARE: Non fare query pesanti senza indici — verificare le performance con molti ordini.
     */
    public function dashboard(): JsonResponse
    {
        $now = now();
        $todayStart = $now->copy()->startOfDay();
        $weekStart = $now->copy()->startOfWeek();
        $monthStart = $now->copy()->startOfMonth();

        // STATISTICHE ORDINI
        $totalOrders = Order::count();
        $completedOrders = Order::where('status', 'completed')->count();
        $pendingOrders = Order::where('status', 'pending')->count();
        $processingOrders = Order::where('status', 'processing')->count();
        $ordersToday = Order::where('created_at', '>=', $todayStart)->count();
        $ordersWeek = Order::where('created_at', '>=', $weekStart)->count();
        $ordersMonth = Order::where('created_at', '>=', $monthStart)->count();
        $paymentFailedOrders = Order::where('status', 'payment_failed')->count();

        // STATISTICHE FATTURATO (somma delle transazioni andate a buon fine)
        $totalRevenue = Transaction::where('status', 'succeeded')->sum('total');
        $revenueMonth = Transaction::where('status', 'succeeded')
            ->where('created_at', '>=', $monthStart)->sum('total');

        // STATISTICHE UTENTI
        $totalUsers = User::count();
        $verifiedUsers = User::whereNotNull('email_verified_at')->count();
        $proUsers = User::where('role', 'Partner Pro')->count();

        // STATISTICHE SPEDIZIONI BRT
        $shipmentsWithLabel = Order::whereNotNull('brt_parcel_id')->count();
        $shipmentsInTransit = Order::where('status', 'in_transit')->count();
        $shipmentsDelivered = Order::where('status', 'delivered')->count();
        $ordersWithoutLabel = Order::whereNull('brt_parcel_id')
            ->whereIn('status', ['completed', 'payed', 'processing'])
            ->count();

        // GRAFICO ORDINI GIORNALIERI (ultimi 30 giorni)
        $dailyOrders = [];
        for ($i = 29; $i >= 0; $i--) {
            $day = $now->copy()->subDays($i)->startOfDay();
            $dayEnd = $day->copy()->endOfDay();
            $dailyOrders[] = [
                'date' => $day->format('d/m'),
                'count' => Order::whereBetween('created_at', [$day, $dayEnd])->count(),
            ];
        }

        // Ultimi 5 ordini (per la sezione "ordini recenti" della dashboard)
        $recentOrders = Order::with('user:id,name,surname,email')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'user_id', 'status', 'subtotal', 'created_at']);

        // NOTIFICHE: conteggio di cose che richiedono attenzione dell'admin
        $unreadMessages = ContactMessage::whereNull('read_at')->count();
        $pendingWithdrawals = WithdrawalRequest::where('status', 'pending')->count();
        $pendingProRequests = \App\Models\ProRequest::where('status', 'pending')->count();

        return response()->json([
            'orders' => [
                'total' => $totalOrders,
                'completed' => $completedOrders,
                'pending' => $pendingOrders,
                'processing' => $processingOrders,
                'today' => $ordersToday,
                'week' => $ordersWeek,
                'month' => $ordersMonth,
                'payment_failed' => $paymentFailedOrders,
            ],
            'revenue' => $totalRevenue,
            'revenue_month' => $revenueMonth,
            'users' => [
                'total' => $totalUsers,
                'verified' => $verifiedUsers,
                'pro' => $proUsers,
            ],
            'shipments' => [
                'with_label' => $shipmentsWithLabel,
                'in_transit' => $shipmentsInTransit,
                'delivered' => $shipmentsDelivered,
                'without_label' => $ordersWithoutLabel,
            ],
            'daily_orders' => $dailyOrders,
            'recent_orders' => $recentOrders,
            'unread_messages' => $unreadMessages,
            'pending_withdrawals' => $pendingWithdrawals,
            'pending_pro_requests' => $pendingProRequests,
        ]);
    }

    // Mostra la lista di tutti gli ordini con possibilita' di filtro e ricerca
    // Supporta filtro per stato e ricerca per ID ordine o dati utente
    public function orders(Request $request): JsonResponse
    {
        $query = Order::with([
            'user:id,name,surname,email,role,user_type',
            'packages',
            'transactions',
        ])->orderByDesc('created_at');

        // Filtro per stato (es. "completed", "pending", "in_transit")
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Ricerca per ID ordine, nome utente o email
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('id', $search)
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('surname', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        // Risultati paginati (20 per pagina) per non caricare troppi dati
        $orders = $query->paginate(20);

        return response()->json($orders);
    }

    // Cambia lo stato di un ordine (es. da "pending" a "completed")
    public function updateOrderStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:pending,processing,completed,payment_failed,cancelled,payed,in_transit,delivered,in_giacenza'],
        ]);

        $oldStatus = $order->status;
        $order->update(['status' => $data['status']]);

        return response()->json([
            'success' => true,
            'message' => "Stato ordine aggiornato da '{$oldStatus}' a '{$data['status']}'.",
            'data' => $order->fresh(),
        ]);
    }

    // Aggiorna o rimuove il punto PUDO associato a un ordine
    // L'admin puo' scegliere un punto di ritiro BRT per conto del cliente
    public function updateOrderPudo(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate([
            'pudo_id' => 'nullable|string|max:100',
            'pudo_name' => 'nullable|string|max:300',
            'pudo_address' => 'nullable|string|max:300',
            'pudo_city' => 'nullable|string|max:200',
            'pudo_zip' => 'nullable|string|max:10',
        ]);

        $order->update(['brt_pudo_id' => $data['pudo_id']]);

        return response()->json([
            'success' => true,
            'message' => $data['pudo_id']
                ? "Punto PUDO '{$data['pudo_id']}' impostato per ordine #{$order->id}."
                : "Punto PUDO rimosso dall'ordine #{$order->id}.",
            'data' => $order->fresh(),
        ]);
    }

    // Mostra la lista delle spedizioni BRT (ordini che hanno un'etichetta BRT)
    // Supporta filtro per stato e ricerca
    public function shipments(Request $request): JsonResponse
    {
        // Escludiamo brt_label_base64 dalla query per performance (e' un campo molto grande)
        // Il frontend lo carica separatamente quando serve scaricarlo
        $query = Order::with('user:id,name,surname,email')
            ->select(['id', 'user_id', 'status', 'subtotal', 'brt_parcel_id', 'brt_numeric_sender_reference', 'brt_tracking_url', 'brt_pudo_id', 'is_cod', 'cod_amount', 'created_at', 'updated_at'])
            ->whereNotNull('brt_parcel_id')  // Solo ordini con spedizione BRT creata
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('brt_parcel_id', 'like', "%{$search}%")
                  ->orWhere('brt_numeric_sender_reference', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('surname', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $shipments = $query->paginate(20);

        return response()->json($shipments);
    }

    // Mostra tutti i messaggi di contatto ricevuti dalla pagina "Contatti"
    public function contactMessages(): JsonResponse
    {
        $messages = ContactMessage::orderByDesc('created_at')->get();

        return response()->json(['data' => $messages]);
    }

    // Segna un messaggio di contatto come letto
    public function markContactMessageRead($id): JsonResponse
    {
        $msg = ContactMessage::findOrFail($id);
        $msg->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'data' => $msg->fresh(),
        ]);
    }

    // Mostra le impostazioni del sito (chiavi API, configurazioni, ecc.)
    public function settings(): JsonResponse
    {
        $keys = [
            'stripe_public_key', 'stripe_secret_key', 'stripe_webhook_secret',
            'brt_customer_id', 'brt_username', 'brt_password',
            'site_name', 'support_email', 'cod_surcharge',
        ];

        $settings = [];
        foreach ($keys as $key) {
            $settings[$key] = Setting::get($key, '');
        }

        return response()->json(['data' => $settings]);
    }

    // Aggiorna le impostazioni del sito
    // Accetta solo le chiavi autorizzate (per sicurezza)
    public function updateSettings(Request $request): JsonResponse
    {
        // Lista delle impostazioni che l'admin puo' modificare
        $allowed = [
            'stripe_public_key', 'stripe_secret_key', 'stripe_webhook_secret',
            'brt_customer_id', 'brt_username', 'brt_password',
            'site_name', 'support_email', 'cod_surcharge',
        ];

        foreach ($allowed as $key) {
            if ($request->has($key)) {
                Setting::set($key, $request->input($key));
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Impostazioni aggiornate con successo.',
        ]);
    }

    // Upload immagine homepage
    public function uploadHomepageImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $file = $request->file('image');
        $filename = 'homepage_' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('attach', $filename, 'public');

        Setting::set('homepage_image_url', '/storage/' . $path);

        return response()->json([
            'success' => true,
            'image_url' => '/storage/' . $path,
            'message' => 'Immagine homepage aggiornata con successo.',
        ]);
    }

    // Recupera l'immagine homepage corrente
    public function getHomepageImage(): JsonResponse
    {
        $url = Setting::get('homepage_image_url', '');
        return response()->json(['image_url' => $url ?: null]);
    }

    // Lista tutti i coupon
    public function coupons(): JsonResponse
    {
        $coupons = Coupon::orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $coupons]);
    }

    // Crea un nuovo coupon
    public function storeCoupon(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => 'required|string|max:50|unique:coupons,code',
            'percentage' => 'required|numeric|min:1|max:100',
            'active' => 'boolean',
        ]);

        $coupon = Coupon::create([
            'code' => strtoupper($data['code']),
            'percentage' => $data['percentage'],
            'active' => $data['active'] ?? true,
        ]);

        return response()->json(['success' => true, 'data' => $coupon], 201);
    }

    // Aggiorna un coupon
    public function updateCoupon(Request $request, Coupon $coupon): JsonResponse
    {
        $data = $request->validate([
            'code' => 'sometimes|string|max:50|unique:coupons,code,' . $coupon->id,
            'percentage' => 'sometimes|numeric|min:1|max:100',
            'active' => 'sometimes|boolean',
        ]);

        if (isset($data['code'])) $data['code'] = strtoupper($data['code']);
        $coupon->update($data);

        return response()->json(['success' => true, 'data' => $coupon->fresh()]);
    }

    // Elimina un coupon
    public function deleteCoupon(Coupon $coupon): JsonResponse
    {
        $coupon->delete();
        return response()->json(['success' => true, 'message' => 'Coupon eliminato.']);
    }

    /**
     * regenerateLabel — Rigenera manualmente l'etichetta BRT per un ordine.
     *
     * PERCHE': La generazione automatica puo' fallire (errore BRT, indirizzo non valido).
     *   L'admin puo' ritentare manualmente dopo aver corretto i dati.
     * COME LEGGERLO: 1) Verifica configurazione BRT  2) Prepara opzioni (contrassegno, PUDO)
     *   3) Chiama BrtService.createShipment()  4) Salva campi brt_*  5) Invia email etichetta
     * COME MODIFICARLO: Per passare opzioni extra a BRT, aggiungerle nell'array $options.
     * COSA EVITARE: Non chiamare su ordini gia' con etichetta senza prima eliminare la vecchia.
     */
    public function regenerateLabel(Order $order): JsonResponse
    {
        if (!config('services.brt.client_id')) {
            return response()->json([
                'success' => false,
                'message' => 'BRT non configurato. Verifica le credenziali nel file .env.',
            ], 422);
        }

        $brt = app(BrtService::class);

        $options = [];
        if ($order->is_cod && $order->cod_amount) {
            $options['is_cod'] = true;
            $options['cod_amount'] = $order->cod_amount;
        }
        if ($order->brt_pudo_id) {
            $options['pudo_id'] = $order->brt_pudo_id;
        }

        $result = $brt->createShipment($order, $options);

        if ($result['success']) {
            $order->brt_parcel_id = $result['parcel_id'];
            $order->brt_numeric_sender_reference = $result['numeric_sender_reference'];
            $order->brt_tracking_url = $result['tracking_url'];
            $order->brt_label_base64 = $result['label_base64'];
            $order->status = 'in_transit';
            $order->save();

            // Invia l'email con l'etichetta
            try {
                $order->loadMissing('user');
                if ($order->user && $order->user->email) {
                    Mail::to($order->user->email)->send(new ShipmentLabelMail($order));
                }
            } catch (\Exception $e) {
                Log::error('Failed to send BRT label email on regenerate', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Etichetta BRT rigenerata con successo.',
                'data' => [
                    'parcel_id' => $result['parcel_id'],
                    'tracking_url' => $result['tracking_url'],
                ],
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Generazione etichetta BRT fallita: ' . ($result['error'] ?? 'Errore sconosciuto'),
        ], 422);
    }
}
