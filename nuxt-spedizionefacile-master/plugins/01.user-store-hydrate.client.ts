export default defineNuxtPlugin((nuxtApp) => {
	const userStore = useUserStore()

	nuxtApp.hook('app:mounted', () => {
		userStore.hydrateFromSession()
	})
})
