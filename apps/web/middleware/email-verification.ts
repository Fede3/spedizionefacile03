export default defineNuxtRouteMiddleware((to, _from) => {
	if (!to.query || Object.keys(to.query).length === 0) {
		return navigateTo("/");
	}
});
