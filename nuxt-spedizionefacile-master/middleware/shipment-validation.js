export default defineNuxtRouteMiddleware((to, from) => {
	/* const { session } = useSession(); */

	if (to.fullPath.endsWith("1") || to.fullPath.endsWith("5")) {
		return navigateTo("/");
	}

	/* if (!to.fullPath.endsWith("1") && !to.fullPath.endsWith("5") && !session.value?.data?.services) {
		return navigateTo("/la-tua-spedizione-2");
	} */
});
