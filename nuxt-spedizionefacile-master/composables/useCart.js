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
		},
		{
			watch: [endpoint],
		},
		"cart"
	);

	return { endpoint, cart, refresh, status, error };
};
