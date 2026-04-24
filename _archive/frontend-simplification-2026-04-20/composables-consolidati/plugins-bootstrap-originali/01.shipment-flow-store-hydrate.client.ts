export default defineNuxtPlugin((nuxtApp) => {
	const shipmentFlowStore = useShipmentFlowStore()

	nuxtApp.hook('app:mounted', () => {
		shipmentFlowStore.hydrateFromSession()
	})
})
