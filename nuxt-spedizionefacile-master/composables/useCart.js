/**
 * FILE: composables/useCart.js
 * SCOPO: Composable carrello — switch automatico autenticato (DB) / ospite (sessione).
 * API: GET /api/cart (CartController) se autenticato, GET /api/guest-cart (GuestCartController) se ospite.
 * RESTITUISCE: endpoint (computed URL), cart (dati carrello), refresh, status, error.
 * USATO DA: pages/carrello.vue, pages/checkout.vue, pages/riepilogo.vue,
 *           components/Navbar.vue (contatore pacchi).
 */
export const useCart = () => {
	const { isAuthenticated } = useSanctumAuth();
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
