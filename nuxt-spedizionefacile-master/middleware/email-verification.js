export default defineNuxtRouteMiddleware((to, from) => {
	if (!to.query || String(to.query).trim() === "") {
		return navigateTo("/");
	}
});
