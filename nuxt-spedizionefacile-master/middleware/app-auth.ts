export default defineNuxtRouteMiddleware(async (to) => {
	// SSR: controlla cookie di sessione — se manca, redirect immediato
	if (import.meta.server) {
		const cookie = useRequestHeaders(['cookie'])?.cookie || '';
		if (!cookie.includes('laravel_session') && !cookie.includes('XSRF-TOKEN')) {
			const requestedPath = to.fullPath !== "/" && to.fullPath.endsWith("/")
				? to.fullPath.slice(0, -1)
				: to.fullPath;
			return navigateTo(
				requestedPath === "/"
					? "/autenticazione"
					: { path: "/autenticazione", query: { redirect: requestedPath } },
				{ replace: true },
			);
		}
		return;
	}

	const { init, isAuthenticated } = useSanctumAuth();
	const bootstrapReady = useState("auth-bootstrap-ready", () => false);
	const bootstrapStatus = useState<"idle" | "pending" | "resolved" | "failed">("auth-bootstrap-status", () => "idle");

	if (!(bootstrapReady.value && bootstrapStatus.value === "resolved")) {
		bootstrapReady.value = false;
		bootstrapStatus.value = "pending";

		try {
			await init();
			bootstrapStatus.value = "resolved";
		} catch (error) {
			const err = error as { status?: number; response?: { status?: number } };
			const status = Number(err?.status ?? err?.response?.status ?? 0);

			if ([401, 419].includes(status)) {
				bootstrapStatus.value = "resolved";
			} else {
				bootstrapStatus.value = "failed";
			}
		} finally {
			bootstrapReady.value = true;
		}
	}

	// Se autenticato → procedi normalmente
	if (isAuthenticated.value) {
		return;
	}

	// Se bootstrap fallisce o utente non autenticato → redirect al login
	const requestedPath = to.fullPath !== "/" && to.fullPath.endsWith("/")
		? to.fullPath.slice(0, -1)
		: to.fullPath;

	return navigateTo(
		requestedPath === "/"
			? "/autenticazione"
			: { path: "/autenticazione", query: { redirect: requestedPath } },
		{ replace: true },
	);
});
