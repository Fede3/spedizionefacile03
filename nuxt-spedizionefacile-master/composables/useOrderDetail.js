/**
 * Composable: useOrderDetail
 * Logica completa per la pagina dettaglio ordine /account/spedizioni/[id].
 *
 * Gestisce: fetch ordine, formattazione dati, etichette BRT, annullamento/rimborso,
 * aggiunta collo, label download/rigenerazione.
 */
export default function useOrderDetail(orderId) {
	const sanctum = useSanctumClient();

	/* --- Fetch ordine --- */
	const { data: order, status: orderStatus, refresh } = useSanctumFetch(`/api/orders/${orderId}`, { lazy: true });

	/* --- Helpers di formattazione --- */
	const formatDate = (dateStr) => {
		if (!dateStr) return '\u2014';
		try {
			return new Date(dateStr).toLocaleDateString('it-IT', {
				day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
			});
		} catch { return dateStr; }
	};

	const statusColor = (status) => {
		const map = {
			'In attesa': 'bg-yellow-100 text-yellow-700',
			'In lavorazione': 'bg-blue-100 text-blue-700',
			'Completato': 'bg-emerald-100 text-emerald-700',
			'Fallito': 'bg-red-100 text-red-700',
			'Pagato': 'bg-emerald-100 text-emerald-700',
			'Annullato': 'bg-gray-200 text-gray-600',
			'Rimborsato': 'bg-orange-100 text-orange-700',
			'In transito': 'bg-blue-100 text-blue-700',
			'Consegnato': 'bg-emerald-100 text-emerald-700',
			'In giacenza': 'bg-orange-100 text-orange-700',
		};
		return map[status] || 'bg-gray-100 text-gray-700';
	};

	const formatPrice = (cents) => {
		if (!cents && cents !== 0) return '0,00\u20AC';
		const euros = Number(cents) / 100;
		return euros.toFixed(2).replace('.', ',') + '\u20AC';
	};

	const paymentMethodLabel = (method) => {
		const map = { stripe: 'Carta di credito (Stripe)', wallet: 'Portafoglio', bonifico: 'Bonifico' };
		return map[method] || method || 'Non specificato';
	};

	/* --- Computed derivati dall'ordine --- */
	const orderData = computed(() => order.value?.data || order.value || null);

	const orderSubtotalLabel = computed(() => {
		const subtotal = orderData.value?.subtotal;
		if (typeof subtotal === 'string' && subtotal.trim()) return subtotal.replace(/\s*EUR$/i, '\u20AC');
		return formatPrice(orderData.value?.subtotal_cents || 0);
	});

	const orderRouteLabel = computed(() => {
		const firstPackage = orderData.value?.packages?.[0];
		if (!firstPackage) return '\u2014';
		const oc = firstPackage.origin_address?.city || '';
		const op = firstPackage.origin_address?.province || '';
		const dc = firstPackage.destination_address?.city || '';
		const dp = firstPackage.destination_address?.province || '';
		return `${oc}${op ? ` (${op})` : ''} \u2192 ${dc}${dp ? ` (${dp})` : ''}`;
	});

	const orderPackageCountLabel = computed(() => {
		const count = Number(orderData.value?.packages?.length || 0);
		if (!count) return 'Nessun collo';
		return count === 1 ? '1 collo' : `${count} colli`;
	});

	const isPendingPayment = computed(() => {
		const raw = orderData.value?.raw_status;
		return raw === 'pending' || raw === 'payment_failed';
	});

	const isCancellable = computed(() => orderData.value?.cancellable === true);

	const isCancelledOrRefunded = computed(() => {
		const raw = orderData.value?.raw_status;
		return raw === 'cancelled' || raw === 'refunded';
	});

	/* --- Aggiungi collo --- */
	const showAddPackageForm = ref(false);
	const addingPackage = ref(false);
	const addPackageError = ref(null);
	const addPackageSuccess = ref(false);
	const newPackage = ref({
		package_type: 'Pacco', quantity: 1, weight: '', first_size: '', second_size: '', third_size: '', content_description: '',
	});

	const submitAddPackage = async () => {
		addPackageError.value = null;
		addPackageSuccess.value = false;
		addingPackage.value = true;
		try {
			await sanctum(`/api/orders/${orderId}/add-package`, { method: 'POST', body: newPackage.value });
			addPackageSuccess.value = true;
			showAddPackageForm.value = false;
			newPackage.value = { package_type: 'Pacco', quantity: 1, weight: '', first_size: '', second_size: '', third_size: '', content_description: '' };
			await refresh();
		} catch (e) {
			const data = e?.response?._data || e?.data;
			addPackageError.value = data?.error || data?.message || 'Errore durante l\'aggiunta del collo.';
		} finally {
			addingPackage.value = false;
		}
	};

	/* --- BRT etichetta --- */
	const regenerating = ref(false);
	const regenerateError = ref(null);
	const regenerateSuccess = ref(false);

	const downloadLabel = async () => {
		if (!orderData.value?.id) return;
		try {
			const blob = await sanctum(`/api/brt/label/${orderData.value.id}`, { method: 'GET', responseType: 'blob' });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `etichetta-brt-${orderData.value.id}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			a.remove();
		} catch {}
	};

	const regenerateLabel = async () => {
		if (!orderData.value?.id) return;
		regenerating.value = true;
		regenerateError.value = null;
		regenerateSuccess.value = false;
		try {
			await sanctum('/api/brt/create-shipment', { method: 'POST', body: { order_id: orderData.value.id } });
			regenerateSuccess.value = true;
			await refresh();
		} catch (e) {
			const data = e?.response?._data || e?.data;
			regenerateError.value = data?.error || 'Errore durante la rigenerazione dell\'etichetta.';
		} finally {
			regenerating.value = false;
		}
	};

	/* --- Annullamento e rimborso --- */
	const showCancelModal = ref(false);
	const refundEligibility = ref(null);
	const loadingEligibility = ref(false);
	const cancelling = ref(false);
	const cancelError = ref(null);
	const cancelSuccess = ref(null);
	const cancelReason = ref('');

	const openCancelModal = async () => {
		cancelError.value = null;
		cancelSuccess.value = null;
		loadingEligibility.value = true;
		showCancelModal.value = true;
		try {
			refundEligibility.value = await sanctum(`/api/orders/${orderId}/refund-eligibility`, { method: 'GET' });
		} catch (e) {
			const data = e?.response?._data || e?.data;
			cancelError.value = data?.error || 'Errore nel controllo dell\'idoneita\' al rimborso.';
		} finally {
			loadingEligibility.value = false;
		}
	};

	const confirmCancellation = async () => {
		cancelling.value = true;
		cancelError.value = null;
		try {
			const result = await sanctum(`/api/orders/${orderId}/cancel`, {
				method: 'POST', body: { reason: cancelReason.value || undefined },
			});
			cancelSuccess.value = result?.message || 'Ordine annullato con successo.';
			showCancelModal.value = false;
			cancelReason.value = '';
			await refresh();
		} catch (e) {
			const data = e?.response?._data || e?.data;
			cancelError.value = data?.error || data?.message || 'Errore durante l\'annullamento dell\'ordine.';
		} finally {
			cancelling.value = false;
		}
	};

	return {
		// Data
		order, orderStatus, orderData, refresh,
		// Labels
		orderSubtotalLabel, orderRouteLabel, orderPackageCountLabel,
		// State flags
		isPendingPayment, isCancellable, isCancelledOrRefunded,
		// Formatters
		formatDate, statusColor, formatPrice, paymentMethodLabel,
		// Add package
		showAddPackageForm, addingPackage, addPackageError, addPackageSuccess, newPackage, submitAddPackage,
		// BRT label
		regenerating, regenerateError, regenerateSuccess, downloadLabel, regenerateLabel,
		// Cancellation
		showCancelModal, refundEligibility, loadingEligibility, cancelling, cancelError, cancelSuccess, cancelReason,
		openCancelModal, confirmCancellation,
	};
}
