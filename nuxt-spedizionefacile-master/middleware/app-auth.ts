export default defineNuxtRouteMiddleware(async (to) => {
	if (import.meta.server) {
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
				console.error("[auth] bootstrap failed on protected route", error);
			}
		} finally {
			bootstrapReady.value = true;
		}
	}

	if (bootstrapStatus.value === "failed" || isAuthenticated.value) {
		return;
	}

	const requestedPath = to.fullPath !== "/" && to.fullPath.endsWith("/")
		? to.fullPath.slice(0, -1)
		: to.fullPath;

	return navigateTo(
		requestedPath === "/"
			? "/autenticazione"
			: {
					path: "/autenticazione",
					query: { redirect: requestedPath },
				},
		{ replace: true },
	);
});
