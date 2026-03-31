import { calculateShipmentServiceSurcharge } from "~/utils/shipmentServicePricing";

export const useShipmentStepSummary = ({
	destinationAddress,
	editablePackages,
	normalizeLocationText,
	originAddress,
	session,
	showAddressFields,
	status,
	stepsRef,
	userStore,
}) => {
	const { priceBands, loadPriceBands } = usePriceBands();
	const stepsVisible = ref(true);
	let stepsObserver = null;
	let stepsVisibilityRaf = null;

	onMounted(() => {
		loadPriceBands();
	});

	const parsePriceAmount = (value) => {
		if (value === null || value === undefined) return null;
		if (typeof value === 'number') {
			return Number.isFinite(value) ? value : null;
		}

		const raw = String(value).trim();
		if (!raw) return null;

		let normalized = raw.replace(/[€\s]/g, '');
		if (normalized.includes(',') && normalized.includes('.')) {
			if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
				normalized = normalized.replace(/\./g, '').replace(',', '.');
			} else {
				normalized = normalized.replace(/,/g, '');
			}
		} else if (normalized.includes(',')) {
			normalized = normalized.replace(',', '.');
		}

		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : null;
	};

	const formatPriceAmount = (amount) => Number(amount).toFixed(2).replace('.', ',');

	const pickBestPriceAmount = (candidates) => {
		const valid = candidates.filter((value) => value !== null && Number.isFinite(value));
		const positive = valid.find((value) => value > 0);
		if (positive !== undefined) return positive;
		return valid.length ? valid[0] : 0;
	};

	const normalizePackagePrice = (rawAmount) => {
		const amount = Number(rawAmount) || 0;
		if (!amount) return 0;
		return amount > 1000 ? amount / 100 : amount;
	};

	const getPackageLineAmount = (pack) => {
		const single = parsePriceAmount(pack?.single_price);
		if (single !== null && single > 0) return normalizePackagePrice(single);

		const singleOrig = parsePriceAmount(pack?.single_priceOrig);
		if (singleOrig !== null && singleOrig > 0) return normalizePackagePrice(singleOrig);

		const weightPrice = parsePriceAmount(pack?.weight_price) || 0;
		const volumePrice = parsePriceAmount(pack?.volume_price) || 0;
		const base = Math.max(weightPrice, volumePrice);
		if (base <= 0) return 0;

		const qty = Number(pack?.quantity) || 1;
		return base * qty;
	};

	const getPackagesTotal = (packages) => {
		if (!Array.isArray(packages) || !packages.length) return null;
		const total = packages.reduce((sum, pack) => sum + getPackageLineAmount(pack), 0);
		return total > 0 ? total : null;
	};

	const summaryPackageLabel = computed(() => {
		const count = editablePackages.value.length;
		return `${count} ${count === 1 ? 'collo' : 'colli'}`;
	});

	const normalizePackageTypeLabel = (value) => {
		if (!value) return 'pacco';
		return String(value).trim().toLowerCase();
	};

	const packageTypeVisualMap = {
		pacco: { label: 'Pacco', icon: '/img/quote/first-step/pack.png' },
		pallet: { label: 'Pallet', icon: '/img/quote/first-step/pallet.png' },
		valigia: { label: 'Valigia', icon: '/img/quote/first-step/suitcase.png' },
		busta: { label: 'Busta', icon: '/img/quote/first-step/envelope.png' },
		wallet: { label: 'Wallet', icon: '/img/quote/first-step/suitcase.png' },
	};

	const getPackageTypeLabel = (pack) => {
		const normalized = normalizePackageTypeLabel(pack?.package_type || 'Pacco');
		const mapped = packageTypeVisualMap[normalized];
		if (mapped?.label) return mapped.label;
		return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Pacco';
	};

	const getPackageTypeIcon = (pack) => {
		const normalized = normalizePackageTypeLabel(pack?.package_type || 'Pacco');
		const mapped = packageTypeVisualMap[normalized];
		return mapped?.icon || packageTypeVisualMap.pacco.icon;
	};

	const summaryPackageTypeInfo = computed(() => {
		const types = (editablePackages.value || [])
			.map((pack) => normalizePackageTypeLabel(pack?.package_type || 'Pacco'))
			.filter(Boolean);

		if (!types.length) {
			return packageTypeVisualMap.pacco;
		}

		const uniqueTypes = [...new Set(types)];
		if (uniqueTypes.length === 1) {
			const match = packageTypeVisualMap[uniqueTypes[0]];
			if (match) return match;

			const normalized = uniqueTypes[0];
			const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
			return { label, icon: packageTypeVisualMap.pacco.icon };
		}

		return { label: 'Misto', icon: packageTypeVisualMap.pacco.icon };
	});

	const summaryOriginCity = computed(() => {
		const liveCity = String(originAddress.value?.city || '').trim();
		if (liveCity) return liveCity;
		if (showAddressFields.value) return '—';
		return (
			userStore.originAddressData?.city
			|| userStore.shipmentDetails?.origin_city
			|| session.value?.data?.shipment_details?.origin_city
			|| '—'
		);
	});

	const summaryDestinationCity = computed(() => {
		const pudoCity = String(userStore.selectedPudo?.city || '').trim();
		if (pudoCity) return pudoCity;

		const liveCity = String(destinationAddress.value?.city || '').trim();
		if (liveCity) return liveCity;
		if (showAddressFields.value) return '—';
		return (
			userStore.destinationAddressData?.city
			|| userStore.shipmentDetails?.destination_city
			|| session.value?.data?.shipment_details?.destination_city
			|| '—'
		);
	});

	const summaryRouteLabel = computed(() => `${summaryOriginCity.value} → ${summaryDestinationCity.value}`);
	const normalizeRouteText = (value) => normalizeLocationText(String(value || '').replace(/\s+/g, ' '));
	const normalizeRouteNumber = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '');
	const routeConsistencyState = computed(() => {
		const originCity = normalizeRouteText(originAddress.value?.city);
		const destinationCity = normalizeRouteText(
			userStore.selectedPudo?.city
			|| destinationAddress.value?.city
			|| userStore.shipmentDetails?.destination_city
		);
		if (!originCity || !destinationCity) {
			return { blocking: false, warning: false, message: '' };
		}

		const originCap = String(originAddress.value?.postal_code || '').trim();
		const destinationCap = String(
			userStore.selectedPudo?.zip_code
			|| destinationAddress.value?.postal_code
			|| userStore.shipmentDetails?.destination_postal_code
			|| ''
		).trim();
		const sameCity = originCity === destinationCity;
		const sameCap = !!originCap && !!destinationCap && originCap === destinationCap;

		const originStreet = normalizeRouteText(originAddress.value?.address);
		const destinationStreet = normalizeRouteText(
			userStore.selectedPudo?.address
			|| destinationAddress.value?.address
		);
		const originNumber = normalizeRouteNumber(originAddress.value?.address_number);
		const destinationNumber = normalizeRouteNumber(
			userStore.selectedPudo ? 'SNC' : destinationAddress.value?.address_number
		);
		const sameAddress =
			sameCity
			&& sameCap
			&& !!originStreet
			&& !!destinationStreet
			&& originStreet === destinationStreet
			&& !!originNumber
			&& !!destinationNumber
			&& originNumber === destinationNumber;

		if (sameAddress) {
			return {
				blocking: true,
				warning: true,
				message: 'Partenza e destinazione coincidono. Inserisci una destinazione diversa prima di continuare.',
			};
		}

		if (sameCity && sameCap) {
			return {
				blocking: false,
				warning: true,
				message: 'Tratta locale: verifica disponibilità del servizio BRT per questa combinazione di indirizzi.',
			};
		}

		return { blocking: false, warning: false, message: '' };
	});

	const routeWarningMessage = computed(() => (
		routeConsistencyState.value.warning ? routeConsistencyState.value.message : ''
	));
	const summaryServicesLabel = computed(() => {
		const selected = Array.isArray(userStore.servicesArray) ? userStore.servicesArray.filter(Boolean) : [];
		return selected.length ? selected.join(', ') : 'Nessun servizio';
	});
	const summaryServicesItems = computed(() => {
		const selected = Array.isArray(userStore.servicesArray) ? userStore.servicesArray.filter(Boolean) : [];
		return selected.length ? selected : ['Nessun servizio selezionato'];
	});

	const normalizeDimensionValue = (value) => {
		const parsed = Number(value);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
	};

	const getPackageDimensionLabel = (pack) => {
		const side1 = normalizeDimensionValue(pack?.first_size ?? pack?.length);
		const side2 = normalizeDimensionValue(pack?.second_size ?? pack?.width);
		const side3 = normalizeDimensionValue(pack?.third_size ?? pack?.height);
		if (!side1 || !side2 || !side3) return null;
		return `${side1}×${side2}×${side3} cm`;
	};

	const summaryDimensionsLabel = computed(() => {
		const dimensionRows = [];
		for (const pack of editablePackages.value || []) {
			const label = getPackageDimensionLabel(pack);
			if (!label) continue;
			const qty = Math.max(1, Number(pack?.quantity) || 1);
			dimensionRows.push({ label, qty });
		}

		if (!dimensionRows.length) return '—';

		const totalQty = dimensionRows.reduce((sum, item) => sum + item.qty, 0);
		const primary = dimensionRows[0].label;

		if (dimensionRows.length === 1 && totalQty === 1) return primary;
		if (dimensionRows.length === 1) return `${primary} × ${totalQty}`;
		return `${primary} +${Math.max(totalQty - 1, 1)}`;
	});
	const summaryDimensionsItems = computed(() => {
		const grouped = new Map();
		for (const pack of (editablePackages.value || [])) {
			const dimensionLabel = getPackageDimensionLabel(pack) || 'Misure non definite';
			const qty = Math.max(1, Number(pack?.quantity) || 1);
			const typeLabel = getPackageTypeLabel(pack);
			const groupKey = `${normalizePackageTypeLabel(typeLabel)}|${dimensionLabel}`;
			if (!grouped.has(groupKey)) {
				grouped.set(groupKey, {
					type: typeLabel,
					dimension: dimensionLabel,
					icon: getPackageTypeIcon(pack),
					count: 0,
				});
			}
			const current = grouped.get(groupKey);
			current.count += qty;
		}

		const rows = Array.from(grouped.values()).map((item) => ({
			label: item.count > 1 ? `${item.count}x ${item.type}: ${item.dimension}` : `${item.type}: ${item.dimension}`,
			icon: item.icon,
			type: item.type,
		}));

		return rows.length
			? rows
			: [{ label: 'Misure non disponibili', icon: packageTypeVisualMap.pacco.icon, type: 'Pacco' }];
	});

	const canExpandSummaryServices = computed(() => (
		summaryServicesItems.value.length > 1 || summaryServicesLabel.value.length > 26
	));
	const canExpandSummaryDimensions = computed(() => (
		summaryDimensionsItems.value.length > 1 || summaryDimensionsLabel.value.length > 20
	));

	const summaryTotalPrice = computed(() => {
		const sessionPackagesAmount = getPackagesTotal(session.value?.data?.packages);
		const storePackagesAmount = getPackagesTotal(userStore.packages?.value || userStore.packages);
		const pendingAmount = getPackagesTotal(userStore.pendingShipment?.packages);
		const editableAmount = getPackagesTotal(editablePackages.value);

		const baseAmount = pickBestPriceAmount([
			pendingAmount,
			editableAmount,
			sessionPackagesAmount,
			storePackagesAmount,
			parsePriceAmount(userStore.totalPrice),
			parsePriceAmount(session.value?.data?.total_price),
		]);

		const pendingServices = userStore.pendingShipment?.services || {};
		const sessionServices = session.value?.data?.services || {};
		const selectedServices = Array.isArray(userStore.servicesArray) && userStore.servicesArray.length
			? userStore.servicesArray
			: (pendingServices.service_type || sessionServices.service_type || "");
		const selectedServiceData = Object.keys(userStore.serviceData || {}).length
			? userStore.serviceData
			: (pendingServices.serviceData || sessionServices.serviceData || {});
		const notificationsEnabled = Boolean(
			userStore.smsEmailNotification
			|| pendingServices.sms_email_notification
			|| pendingServices.serviceData?.sms_email_notification
			|| session.value?.data?.sms_email_notification
			|| sessionServices.sms_email_notification
			|| sessionServices.serviceData?.sms_email_notification
		);

		const serviceSurcharge = calculateShipmentServiceSurcharge({
			selectedServices,
			serviceData: selectedServiceData,
			smsEmailNotification: notificationsEnabled,
			pricingConfig: priceBands.value,
			packages: editablePackages.value?.length
				? editablePackages.value
				: (userStore.pendingShipment?.packages || session.value?.data?.packages || []),
			originAddress: originAddress.value || userStore.originAddressData || session.value?.data?.origin_address || {},
			destinationAddress: destinationAddress.value || userStore.destinationAddressData || session.value?.data?.destination_address || {},
			deliveryMode: userStore.deliveryMode || userStore.pendingShipment?.delivery_mode || session.value?.data?.delivery_mode || "home",
			selectedPudo: userStore.selectedPudo || userStore.pendingShipment?.selected_pudo || session.value?.data?.selected_pudo || null,
		}).total;

		return formatPriceAmount(baseAmount + serviceSurcharge);
	});

	const currentShipmentStep = computed(() => (
		showAddressFields.value ? 3 : 2
	));

	const summaryMiniSteps = computed(() => {
		const defs = [
			{ id: 1, label: 'Misure', to: '/#preventivo' },
			{ id: 2, label: 'Servizi', to: '/la-tua-spedizione/2' },
			{ id: 3, label: 'Indirizzi', to: '/la-tua-spedizione/2?step=ritiro' },
			{ id: 4, label: 'Conferma', to: '/riepilogo' },
			{ id: 5, label: 'Pagamento', to: '/checkout' },
		];

		return defs.map((step) => {
			const isActive = step.id === currentShipmentStep.value;
			const isCompleted = step.id < currentShipmentStep.value;
			return {
				...step,
				isActive,
				isCompleted,
				isClickable: isCompleted,
			};
		});
	});

	const showSummaryMiniSteps = computed(() => !stepsVisible.value);

	const goToSummaryMiniStep = async (step) => {
		if (!step?.isClickable) return;
		await navigateTo(step.to);
	};

	const updateStepsVisibility = () => {
		if (!process.client || !stepsRef.value) return;
		const rect = stepsRef.value.getBoundingClientRect();
		const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
		const visibleTop = Math.max(rect.top, 0);
		const visibleBottom = Math.min(rect.bottom, viewportHeight);
		const visibleHeight = Math.max(0, visibleBottom - visibleTop);
		const visibleRatio = rect.height > 0 ? visibleHeight / rect.height : 0;
		const isClearlyVisible = rect.bottom > 0 && rect.top < viewportHeight && visibleRatio >= 0.55;
		stepsVisible.value = isClearlyVisible;
	};

	const scheduleStepsVisibilityUpdate = () => {
		if (!process.client) return;
		if (stepsVisibilityRaf) cancelAnimationFrame(stepsVisibilityRaf);
		stepsVisibilityRaf = requestAnimationFrame(() => {
			updateStepsVisibility();
			stepsVisibilityRaf = null;
		});
	};

	const teardownStepsVisibilityObserver = () => {
		if (!process.client) return;
		window.removeEventListener('scroll', scheduleStepsVisibilityUpdate);
		window.removeEventListener('resize', scheduleStepsVisibilityUpdate);
		if (stepsVisibilityRaf) {
			cancelAnimationFrame(stepsVisibilityRaf);
			stepsVisibilityRaf = null;
		}
		if (stepsObserver) {
			stepsObserver.disconnect();
			stepsObserver = null;
		}
	};

	const initStepsVisibilityObserver = () => {
		if (!process.client || !stepsRef.value) return;
		teardownStepsVisibilityObserver();

		if ('IntersectionObserver' in window) {
			stepsObserver = new IntersectionObserver(
				() => {
					scheduleStepsVisibilityUpdate();
				},
				{
					root: null,
					threshold: [0, 0.2, 0.4, 0.55, 0.75, 1],
					rootMargin: '0px',
				}
			);
			stepsObserver.observe(stepsRef.value);
		}

		window.addEventListener('scroll', scheduleStepsVisibilityUpdate, { passive: true });
		window.addEventListener('resize', scheduleStepsVisibilityUpdate);
		scheduleStepsVisibilityUpdate();
	};

	const summaryExpanded = ref(false);
	const summaryDetailPanel = ref(null);

	const toggleSummaryDetailPanel = (panel) => {
		summaryDetailPanel.value = summaryDetailPanel.value === panel ? null : panel;
	};

	watch(summaryExpanded, (isOpen) => {
		if (!isOpen) summaryDetailPanel.value = null;
		scheduleStepsVisibilityUpdate();
	});

	watch(
		() => stepsRef.value,
		(el) => {
			if (!process.client || !el) return;
			nextTick(() => initStepsVisibilityObserver());
		},
		{ flush: 'post' }
	);

	watch(
		() => status.value,
		(newStatus) => {
			if (!process.client || newStatus === 'pending') return;
			nextTick(() => initStepsVisibilityObserver());
		}
	);

	onMounted(() => {
		nextTick(() => initStepsVisibilityObserver());
	});

	onBeforeUnmount(() => {
		teardownStepsVisibilityObserver();
	});

	const onAccordionEnter = (el) => {
		el.style.height = '0';
		el.style.overflow = 'hidden';
	};

	const onAccordionAfterEnter = (el) => {
		el.style.height = 'auto';
		el.style.overflow = 'visible';
	};

	const onAccordionLeave = (el) => {
		el.style.height = `${el.scrollHeight}px`;
		el.style.overflow = 'hidden';
		requestAnimationFrame(() => {
			el.style.height = '0';
		});
	};

	return {
		canExpandSummaryDimensions,
		canExpandSummaryServices,
		currentShipmentStep,
		goToSummaryMiniStep,
		onAccordionAfterEnter,
		onAccordionEnter,
		onAccordionLeave,
		routeConsistencyState,
		routeWarningMessage,
		showSummaryMiniSteps,
		summaryDetailPanel,
		summaryDimensionsItems,
		summaryDimensionsLabel,
		summaryDestinationCity,
		summaryExpanded,
		summaryMiniSteps,
		summaryOriginCity,
		summaryPackageLabel,
		summaryPackageTypeInfo,
		summaryRouteLabel,
		summaryServicesItems,
		summaryServicesLabel,
		summaryTotalPrice,
		toggleSummaryDetailPanel,
	};
};
