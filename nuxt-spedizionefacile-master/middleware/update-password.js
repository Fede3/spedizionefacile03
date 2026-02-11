export default defineNuxtRouteMiddleware((to, from) => {
	if (!to.query.token || String(to.query.token).trim() === "") {
		return navigateTo("/");
	}
});
