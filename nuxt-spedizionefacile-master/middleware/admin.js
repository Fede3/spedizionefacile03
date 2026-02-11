export default defineNuxtRouteMiddleware((to, from) => {
	const { user } = useSanctumAuth();

	if (user.value?.role !== "Admin") {
		return navigateTo("/account");
	}
});
