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

	return {
		stepNumber,
		isQuoteStarted,
		shipmentDetails,
		packages,
		totalPrice,
		servicesArray,
	};
});
