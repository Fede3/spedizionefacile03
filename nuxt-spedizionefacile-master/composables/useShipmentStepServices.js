const DEFAULT_SHIPMENT_SERVICES = [
	{
		key: "senza_etichetta",
		img: "no-label.png",
		width: 78,
		height: 51,
		name: "Spedizione Senza etichetta",
		description: "Etichetta applicata al ritiro.",
		isSelected: false,
		featured: true,
	},
	{
		key: "contrassegno",
		img: "cash-on-delivery.png",
		width: 28,
		height: 24,
		name: "Contrassegno",
		description: "Incasso automatico alla consegna.",
		priceLabel: "",
		statusLabel: "Incasso",
		isSelected: false,
		hasDetails: true,
	},
	{
		key: "assicurazione",
		img: "insurance.png",
		width: 24,
		height: 24,
		name: "Assicurazione",
		description: "Copertura sul valore del collo.",
		priceLabel: "",
		statusLabel: "Copertura",
		isSelected: false,
		hasDetails: true,
	},
	{
		key: "sponda_idraulica",
		img: "tail-lift.png",
		width: 24,
		height: 24,
		name: "Sponda idraulica",
		description: "Pedana per colli pesanti.",
		priceLabel: "",
		statusLabel: "Colli pesanti",
		isSelected: false,
	},
];

const createDefaultServiceData = () => ({
	contrassegno: {
		importo: "",
		modalita_incasso: "",
		modalita_rimborso: "",
		dettaglio_rimborso: "",
	},
	assicurazione: {},
	sponda_idraulica: {
		note: "",
	},
	telefono_notifica: "",
});

const createMergedServiceData = (storedData = {}) => {
	const base = createDefaultServiceData();

	return {
		contrassegno: {
			...base.contrassegno,
			...(storedData.contrassegno || {}),
		},
		assicurazione: {
			...base.assicurazione,
			...(storedData.assicurazione || {}),
		},
		sponda_idraulica: {
			...base.sponda_idraulica,
			...(storedData.sponda_idraulica || {}),
		},
		telefono_notifica: storedData.telefono_notifica || "",
	};
};

const EURO_FORMATTER = new Intl.NumberFormat("it-IT", {
	style: "currency",
	currency: "EUR",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

const formatCurrencyCents = (cents, { withPlus = false } = {}) => {
	const normalizedCents = Math.max(0, Math.round(Number(cents || 0)));
	const formatted = EURO_FORMATTER.format(normalizedCents / 100);
	return withPlus ? `+${formatted}` : formatted;
};

const formatPercentageLabel = (value) => {
	const number = Number(value || 0);
	return Number.isInteger(number) ? String(number) : number.toLocaleString("it-IT");
};

export const useShipmentStepServices = ({
	userStore,
	dateError,
}) => {
	const pickupCalendarAnchor = useState('shipment-pickup-calendar-anchor', () => new Date().toISOString().slice(0, 10));
	const { priceBands, loadPriceBands } = usePriceBands();
	const services = ref({
		service_type: "",
		date: "",
		time: "",
	});

	const servicesList = ref(
		DEFAULT_SHIPMENT_SERVICES.map((service) => ({ ...service })),
	);
	const expandedServiceKey = ref("");
	const serviceData = ref(createMergedServiceData(userStore.serviceData || {}));
	const smsEmailNotification = ref(false);

	const servicePricing = computed(() => priceBands.value?.service_pricing || {});

	const featuredCurrentPriceCents = computed(() => {
		return Math.max(0, Math.round(Number(servicePricing.value?.senza_etichetta?.price_cents ?? 99)));
	});

	const featuredOldPriceCents = computed(() => Math.max(250, featuredCurrentPriceCents.value));

	const featuredCurrentPriceLabel = computed(() => formatCurrencyCents(featuredCurrentPriceCents.value, { withPlus: true }));
	const featuredOldPriceLabel = computed(() => formatCurrencyCents(featuredOldPriceCents.value));
	const featuredSavingsLabel = computed(() => {
		const savings = Math.max(0, featuredOldPriceCents.value - featuredCurrentPriceCents.value);
		return savings > 0 ? `Risparmi ${formatCurrencyCents(savings)}` : "";
	});

	const notificationPriceLabel = computed(() => {
		return formatCurrencyCents(servicePricing.value?.notifications?.price_cents ?? 50, { withPlus: true });
	});

	const getServicePriceLabel = (service) => {
		if (service?.key === "contrassegno") {
			const rule = servicePricing.value?.contrassegno || {};
			return `da ${formatCurrencyCents(rule.min_fee_cents ?? 700)} / ${formatPercentageLabel(rule.percentage_rate ?? 2)}%`;
		}
		if (service?.key === "assicurazione") {
			const rule = servicePricing.value?.assicurazione || {};
			return `da ${formatCurrencyCents(rule.min_fee_cents ?? 700)} / ${formatPercentageLabel(rule.percentage_rate ?? 2)}%`;
		}
		if (service?.key === "sponda_idraulica") {
			return formatCurrencyCents(servicePricing.value?.sponda_idraulica?.price_cents ?? 1500, { withPlus: true });
		}
		return service.priceLabel || "";
	};

	const findServiceByKey = (serviceKey) => (
		servicesList.value.find((service) => service.key === serviceKey) || null
	);

	const syncSelectedServicesVisual = () => {
		servicesList.value.forEach((service) => {
			service.isSelected = userStore.servicesArray.includes(service.name);
		});
	};

	const removeService = (service) => {
		const index = userStore.servicesArray.indexOf(service.name);
		if (index !== -1) {
			userStore.servicesArray.splice(index, 1);
		}

		const visual = findServiceByKey(service.key);
		if (visual) {
			visual.isSelected = false;
		}

		if (expandedServiceKey.value === service.key) {
			expandedServiceKey.value = "";
		}

		services.value.service_type = userStore.servicesArray.join(", ");
	};

	const ensureServiceSelected = (service, serviceIndex) => {
		const visual = servicesList.value[serviceIndex];
		if (visual) {
			visual.isSelected = true;
		}

		if (!userStore.servicesArray.includes(service.name)) {
			userStore.servicesArray.push(service.name);
		}

		services.value.service_type = userStore.servicesArray.join(", ");
	};

	const chooseService = (service, serviceIndex) => {
		const visual = servicesList.value[serviceIndex];
		if (!visual) return;

		const isCurrentlySelected = Boolean(visual.isSelected);
		visual.isSelected = !isCurrentlySelected;

		if (!isCurrentlySelected) {
			if (!userStore.servicesArray.includes(service.name)) {
				userStore.servicesArray.push(service.name);
			}

			if (service.key === "sponda_idraulica") {
				userStore.serviceData = userStore.serviceData || {};
				userStore.serviceData.sponda_idraulica = { ...serviceData.value.sponda_idraulica };
			}
		} else {
			const index = userStore.servicesArray.indexOf(service.name);
			if (index !== -1) {
				userStore.servicesArray.splice(index, 1);
			}
			if (expandedServiceKey.value === service.key) {
				expandedServiceKey.value = "";
			}
		}

		services.value.service_type = userStore.servicesArray.join(", ");
	};

	const toggleServiceDetails = (service) => {
		if (!service?.hasDetails) return;
		expandedServiceKey.value = expandedServiceKey.value === service.key ? "" : service.key;
	};

	const toggleServiceSelection = (service, serviceIndex) => {
		const visual = servicesList.value[serviceIndex];
		const isSelected = Boolean(visual?.isSelected);
		const shouldToggleDirectly = service.featured || !service.hasDetails;

		if (shouldToggleDirectly) {
			chooseService(service, serviceIndex);
			return;
		}

		if (isSelected) {
			removeService(service);
			return;
		}

		ensureServiceSelected(service, serviceIndex);
		if (!service.hasDetails) {
			expandedServiceKey.value = "";
		}
	};

	const removeServiceFromSidebar = (idx) => {
		const removed = userStore.servicesArray[idx];
		userStore.servicesArray.splice(idx, 1);
		services.value.service_type = userStore.servicesArray.join(", ");

		const service = servicesList.value.find((item) => item.name === removed);
		if (service) {
			service.isSelected = false;
		}
	};

	const chooseDate = (day) => {
		const nextDate = day.formattedDate || day.date.toLocaleDateString("it-IT");
		if (!services.value.date || services.value.date !== nextDate) {
			services.value.date = nextDate;
			dateError.value = null;
			return;
		}

		services.value.date = "";
	};

	const daysInMonth = computed(() => {
		const result = [];
		const today = new Date(`${pickupCalendarAnchor.value}T12:00:00`);
		const year = today.getFullYear();
		const month = today.getMonth();
		const day = today.getDate() + 1;

		const appendWorkingDays = (targetYear, targetMonth, startDay, endDay) => {
			for (let index = startDay; index <= endDay; index++) {
				const date = new Date(targetYear, targetMonth, index);
				const weekdayIndex = date.getDay();
				const isWeekend = weekdayIndex === 0 || weekdayIndex === 6;
				const weekday = date.toLocaleString("it-IT", { weekday: "short" });
				const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
				const monthAbbr = date.toLocaleString("it-IT", { month: "short" });
				const formattedMonthAbbr = monthAbbr.charAt(0).toUpperCase() + monthAbbr.slice(1);
				const formattedDate = date.toLocaleDateString("it-IT");

				if (isWeekend) continue;

				result.push({
					date,
					weekday: formattedWeekday,
					dayNumber: date.getDate(),
					monthAbbr: formattedMonthAbbr,
					formattedDate,
				});
			}
		};

		appendWorkingDays(year, month, day, new Date(year, month + 1, 0).getDate());

		const nextMonth = month + 1;
		appendWorkingDays(year, nextMonth, 1, new Date(year, nextMonth + 1, 0).getDate());

		return result;
	});

	const featuredService = computed(() => {
		const service = servicesList.value.find((entry) => entry.featured);
		if (!service) return null;

		return {
			...service,
			currentPriceLabel: featuredCurrentPriceLabel.value,
			oldPriceLabel: featuredOldPriceLabel.value,
			savingsLabel: featuredSavingsLabel.value,
		};
	});

	const regularServices = computed(() => servicesList.value
		.filter((service) => !service.featured)
		.map((service) => ({
			...service,
			priceLabel: getServicePriceLabel(service),
		})));

	const resetServicesState = () => {
		userStore.servicesArray = [];
		services.value.service_type = "";
		smsEmailNotification.value = false;
		serviceData.value = createMergedServiceData();
		userStore.serviceData = createMergedServiceData();
		expandedServiceKey.value = "";
		syncSelectedServicesVisual();
	};

	if (userStore.pickupDate) {
		services.value.date = userStore.pickupDate;
	}

	if (userStore.servicesArray.length > 0) {
		services.value.service_type = userStore.servicesArray.join(", ");
		syncSelectedServicesVisual();
	}

	if (userStore.smsEmailNotification !== undefined) {
		smsEmailNotification.value = userStore.smsEmailNotification;
	}

	onMounted(() => {
		loadPriceBands().catch(() => {
			// Warning already logged inside usePriceBands
		});
	});

	watch(
		() => services.value.date,
		(newDate) => {
			const normalizedDate = newDate || "";
			if (userStore.pickupDate !== normalizedDate) {
				userStore.pickupDate = normalizedDate;
			}

			const currentDetails = userStore.shipmentDetails || {};
			if ((currentDetails.date || "") !== normalizedDate) {
				userStore.shipmentDetails = {
					...currentDetails,
					date: normalizedDate,
				};
			}
		},
		{ immediate: true },
	);

	watch(
		smsEmailNotification,
		(enabled) => {
			userStore.smsEmailNotification = Boolean(enabled);
		},
		{ immediate: true },
	);

	watch(
		serviceData,
		(nextValue) => {
			userStore.serviceData = {
				contrassegno: { ...(nextValue?.contrassegno || {}) },
				assicurazione: { ...(nextValue?.assicurazione || {}) },
				sponda_idraulica: { ...(nextValue?.sponda_idraulica || {}) },
				telefono_notifica: nextValue?.telefono_notifica || "",
			};
		},
		{ immediate: true, deep: true },
	);

	watch(
		() => [...userStore.servicesArray],
		() => {
			syncSelectedServicesVisual();
			services.value.service_type = userStore.servicesArray.join(", ");
			if (!expandedServiceKey.value) return;
			const expandedService = findServiceByKey(expandedServiceKey.value);
			if (!expandedService) {
				expandedServiceKey.value = "";
			}
			if (expandedService?.isSelected === false) return;
		},
		{ immediate: true },
	);

	return {
		chooseDate,
		chooseService,
		daysInMonth,
		ensureServiceSelected,
		expandedServiceKey,
		featuredService,
		regularServices,
		removeServiceFromSidebar,
		resetServicesState,
		serviceData,
		services,
		servicesList,
		smsEmailNotification,
		notificationPriceLabel,
		syncSelectedServicesVisual,
		toggleServiceDetails,
		toggleServiceSelection,
	};
};
