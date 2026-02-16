/**
 * COMPOSABLE: useCart (useCart.js)
 * SCOPO: Gestisce il carrello con switch automatico autenticato (DB) / ospite (sessione).
 *
 * DOVE SI USA: pages/carrello.vue, pages/checkout.vue, pages/riepilogo.vue,
 *              components/Navbar.vue (contatore pacchi nel badge)
 *
 * COSA RESTITUISCE:
 *   - endpoint: computed URL dell'API ("/api/cart" o "/api/guest-cart")
 *   - cart: dati del carrello (ref reattivo con lista pacchi)
 *   - refresh: funzione per ricaricare i dati dal server
 *   - status: stato della richiesta ("idle", "pending", "success", "error")
 *   - error: eventuale errore della richiesta
 * ESEMPIO D'USO: const { cart, refresh, status } = useCart()
 *
 * VINCOLI: l'endpoint cambia automaticamente quando cambia isAuthenticated
 *          (login/logout). Il watch su endpoint garantisce il ri-fetch.
 * ERRORI TIPICI: dimenticare di chiamare refresh() dopo modifiche al carrello
 * COLLEGAMENTI: laravel-spedizionefacile-main/app/Http/Controllers/CartController.php,
 *               laravel-spedizionefacile-main/app/Http/Controllers/GuestCartController.php
 */
export const useCart = () => {
	const { isAuthenticated } = useSanctumAuth();

	// L'endpoint cambia in base allo stato di autenticazione:
	// - Utente loggato → usa /api/cart (dati salvati nel DB, legati all'utente)
	// - Ospite → usa /api/guest-cart (dati salvati nella sessione del browser)
	const endpoint = computed(() => (isAuthenticated.value ? "/api/cart" : "/api/guest-cart"));

	const {
		data: cart,
		refresh,
		status,
		error,
	} = useSanctumFetch(
		endpoint,
		{
			method: "GET",
			key: "cart",
			lazy: true,
			dedupe: "defer",
			watch: [endpoint],
		},
	);

	return { endpoint, cart, refresh, status, error };
};
