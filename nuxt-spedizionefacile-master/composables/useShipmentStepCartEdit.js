/**
 * Composable: useShipmentStepCartEdit
 *
 * Gestisce il caricamento e la pre-compilazione dei dati
 * quando l'utente modifica un elemento gia' presente nel carrello
 * (parametro ?edit=<id> nella URL).
 */
export const useShipmentStepCartEdit = ({
	sanctumClient,
	session,
	syncSelectedServicesVisual,
	userStore,
}) => {
	const route = useRoute();
	const editCartId = route.query.edit ? Number(route.query.edit) : null;
	const loadingEditData = ref(!!editCartId);

	const editablePackages = computed(() => {
		if (editCartId && userStore.packages?.length > 0 && !session.value?.data?.packages?.length) {
			return userStore.packages;
		}
		if (session.value?.data?.packages?.length) return session.value.data.packages;
		if (userStore.packages?.length) return userStore.packages;
		return [];
	});

	const populateAddress = (target, source) => {
		if (!source) return;
		target.value.full_name = source.name || "";
		target.value.address = source.address || "";
		target.value.address_number = source.address_number || "";
		target.value.city = source.city || "";
		target.value.postal_code = source.postal_code || "";
		target.value.province = source.province || "";
		target.value.telephone_number = source.telephone_number || "";
		target.value.email = source.email || "";
		target.value.additional_information = source.additional_information || "";
		target.value.intercom_code = source.intercom_code || "";
	};

	/**
	 * Carica i dati di un elemento del carrello per la modifica.
	 * I ref degli indirizzi e di showAddressFields vengono passati come argomento
	 * perche' vengono creati da un composable successivo (useShipmentStepAddresses).
	 */
	const loadCartItemForEdit = async ({ originAddress, destinationAddress, services, showAddressFields }) => {
		if (!editCartId) return;
		try {
			const result = await sanctumClient(`/api/cart/${editCartId}`);
			const item = result?.data || result;

			userStore.editingCartItemId = editCartId;

			populateAddress(originAddress, item.origin_address);
			populateAddress(destinationAddress, item.destination_address);

			if (item.services) {
				services.value.date = item.services.date || "";
				services.value.time = item.services.time || "";
				services.value.service_type = item.services.service_type || "";
				userStore.pickupDate = item.services.date || "";

				const serviceTypes = (item.services.service_type || "")
					.split(", ")
					.filter(s => s && s !== "Nessuno");
				userStore.servicesArray = serviceTypes;
				syncSelectedServicesVisual();
			}

			if (item.content_description) {
				userStore.contentDescription = item.content_description;
			}

			if (item.services?.serviceData) {
				userStore.serviceData = { ...item.services.serviceData };
			}

			const priceInEuro = item.single_price ? (Number(item.single_price) / 100) : 0;
			userStore.packages = [{
				package_type: item.package_type || "Pacco",
				quantity: item.quantity || 1,
				weight: item.weight,
				first_size: item.first_size,
				second_size: item.second_size,
				third_size: item.third_size,
				weight_price: item.weight_price,
				volume_price: item.volume_price,
				single_price: priceInEuro,
			}];

			userStore.shipmentDetails = {
				origin_city: item.origin_address?.city || "",
				origin_postal_code: item.origin_address?.postal_code || "",
				destination_city: item.destination_address?.city || "",
				destination_postal_code: item.destination_address?.postal_code || "",
				date: item.services?.date || "",
			};

			showAddressFields.value = true;
		} catch (e) {
			// Errore silenzioso: l'utente vedra' il form vuoto
		} finally {
			loadingEditData.value = false;
		}
	};

	return {
		editCartId,
		editablePackages,
		loadCartItemForEdit,
		loadingEditData,
	};
};
