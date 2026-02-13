// stores/user.ts
import { defineStore } from "pinia";

export const useUserStore = defineStore("user", () => {
	const stepNumber = ref(1);

	const shipmentDetails = ref({
		origin_city: "",
		origin_postal_code: "",
		destination_city: "",
		destination_postal_code: "",
		date: "",
	});

	const isQuoteStarted = ref(false);

	const totalPrice = ref(0);

	const packages = ref([]);

	const servicesArray = ref([]);

	// Pending shipment payload (used for riepilogo and backward navigation)
	const pendingShipment = ref(null);

	// Address data for pre-filling when navigating back
	const originAddressData = ref(null);
	const destinationAddressData = ref(null);
	const pickupDate = ref("");

	return {
		stepNumber,
		isQuoteStarted,
		shipmentDetails,
		packages,
		totalPrice,
		servicesArray,
		pendingShipment,
		originAddressData,
		destinationAddressData,
		pickupDate,
	};
});
