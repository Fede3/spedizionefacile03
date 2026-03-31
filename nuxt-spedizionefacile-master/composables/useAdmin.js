/**
 * COMPOSABLE: useAdmin (useAdmin.js)
 * SCOPO: Funzioni di utilita' condivise per tutte le pagine del pannello amministrazione.
 *
 * DOVE SI USA: pages/account/amministrazione/*.vue (ordini, utenti, spedizioni, prezzi, ecc.)
 *
 * COSA RESTITUISCE:
 *   - actionLoading: ref con l'ID dell'azione in corso (per spinner)
 *   - actionMessage: ref con il messaggio di feedback ({type, text})
 *   - showSuccess(text): mostra un messaggio verde per 5 secondi
 *   - showError(e, fallback): mostra un messaggio rosso per 5 secondi
 *   - formatCurrency(val): formatta un valore come valuta italiana (es. "12,50")
 *   - formatCents(val): converte centesimi in euro formattati (es. 1250 → "12,50")
 *   - formatDate(dateStr): formatta una data nel formato italiano con ora
 *   - orderStatusConfig: colori/icone/etichette per ogni stato ordine
 *   - withdrawalStatusConfig: colori/etichette per stati prelievo
 *   - referralStatusConfig: colori/etichette per stati referral
 *   - proRequestStatusConfig: colori/etichette per richieste account Pro
 *   - downloadLabel(order): scarica l'etichetta BRT come PDF
 * ESEMPIO D'USO: const { showSuccess, formatCurrency, orderStatusConfig } = useAdmin()
 *
 * VINCOLI: formatCurrency gestisce 3 formati diversi (oggetto MyMoney, stringa, numero)
 * ERRORI TIPICI: confondere centesimi e euro — usare formatCents per valori dal DB
 * COLLEGAMENTI: laravel-spedizionefacile-main/app/Http/Controllers/BrtController.php (etichette)
 */
import { formatEuro } from '~/utils/price.js'

export const useAdmin = () => {
	/* Stato delle azioni admin (approvazione, eliminazione, ecc.) */
	const actionLoading = ref(null);
	/* Messaggio di feedback dopo un'azione admin (successo o errore) */
	const actionMessage = ref(null);

	/* Nasconde il messaggio dopo 5 secondi */
	const clearMessage = () => {
		setTimeout(() => { actionMessage.value = null; }, 5000);
	};

	/* Mostra un messaggio verde di successo */
	const showSuccess = (text) => {
		actionMessage.value = { type: "success", text };
		clearMessage();
	};

	/* Mostra un messaggio rosso di errore */
	const showError = (e, fallback) => {
		actionMessage.value = { type: "error", text: e?.response?._data?.message || e?.data?.message || fallback };
		clearMessage();
	};

	/* Formatta un valore come valuta con 2 decimali.
	   Gestisce: oggetto MyMoney {amount (centesimi), formatted}, stringa formattata, numero in euro.
	   Delega a formatEuro (~/utils/price.js) dove possibile. */
	const formatCurrency = (val) => {
		if (val == null) return '0,00';
		// Se e' un oggetto MyMoney serializzato {amount: 1250, formatted: "12,50 EUR"}
		if (typeof val === 'object' && val.amount !== undefined) {
			return formatEuro(Number(val.amount) / 100);
		}
		// Se e' una stringa formattata (es. "12,50 EUR" o "12,50")
		if (typeof val === 'string') {
			const cleaned = val.replace(/[€\s\u00A0EUR]/gi, '').replace(/\./g, '').replace(',', '.');
			const num = Number(cleaned);
			return isNaN(num) ? '0,00' : formatEuro(num);
		}
		// Numero semplice: in euro (wallet, commissioni, prelievi, referral, COD)
		const num = Number(val);
		return isNaN(num) ? '0,00' : formatEuro(num);
	};

	/* Formatta centesimi (da Transaction::sum('total') che restituisce centesimi dal DB).
	   Delega a formatEuro (~/utils/price.js) per la formattazione. */
	const formatCents = (val) => formatEuro(Number(val || 0) / 100);

	/* Formatta una data nel formato italiano con ora */
	const formatDate = (dateStr) => {
		if (!dateStr) return "\u2014";
		return new Date(dateStr).toLocaleDateString("it-IT", {
			day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
		});
	};

	/* Configurazione colori, icone e etichette per ogni stato ordine */
	const orderStatusConfig = {
		pending: { label: "In attesa", bg: "bg-amber-50", text: "text-amber-700", icon: "mdi:clock-outline" },
		processing: { label: "In lavorazione", bg: "bg-blue-50", text: "text-blue-700", icon: "mdi:cog-outline" },
		completed: { label: "Completato", bg: "bg-emerald-50", text: "text-emerald-700", icon: "mdi:check-circle-outline" },
		payed: { label: "Pagato", bg: "bg-green-50", text: "text-green-700", icon: "mdi:credit-card-check-outline" },
		payment_failed: { label: "Pagamento fallito", bg: "bg-red-50", text: "text-red-700", icon: "mdi:credit-card-off-outline" },
		cancelled: { label: "Annullato", bg: "bg-gray-100", text: "text-gray-600", icon: "mdi:close-circle-outline" },
		in_transit: { label: "In transito", bg: "bg-indigo-50", text: "text-indigo-700", icon: "mdi:truck-delivery-outline" },
		delivered: { label: "Consegnato", bg: "bg-teal-50", text: "text-teal-700", icon: "mdi:package-variant-closed-check" },
		in_giacenza: { label: "In giacenza", bg: "bg-orange-50", text: "text-orange-700", icon: "mdi:package-variant" },
	};

	const withdrawalStatusConfig = {
		pending: { label: "In attesa", icon: "mdi:clock-outline", bg: "bg-amber-50", text: "text-amber-700" },
		approved: { label: "Approvata", icon: "mdi:check-circle-outline", bg: "bg-emerald-50", text: "text-emerald-700" },
		rejected: { label: "Rifiutata", icon: "mdi:close-circle-outline", bg: "bg-red-50", text: "text-red-700" },
	};

	const referralStatusConfig = {
		confirmed: { label: "Confermata", bg: "bg-emerald-50", text: "text-emerald-700" },
		paid: { label: "Pagata", bg: "bg-blue-50", text: "text-blue-700" },
		pending: { label: "In attesa", bg: "bg-amber-50", text: "text-amber-700" },
	};

	const proRequestStatusConfig = {
		pending: { label: "In attesa", bg: "bg-amber-50", text: "text-amber-700", icon: "mdi:clock-outline" },
		approved: { label: "Approvata", bg: "bg-emerald-50", text: "text-emerald-700", icon: "mdi:check-circle-outline" },
		rejected: { label: "Rifiutata", bg: "bg-red-50", text: "text-red-700", icon: "mdi:close-circle-outline" },
	};

	/* Scarica l'etichetta BRT di un ordine come file PDF */
	const downloadLabel = async (order) => {
		const sanctum = useSanctumClient();
		if (!order.brt_parcel_id && !order.brt_label_base64) return;
		try {
			if (order.brt_label_base64) {
				const link = document.createElement("a");
				link.href = `data:application/pdf;base64,${order.brt_label_base64}`;
				link.download = `etichetta-ordine-${order.id}.pdf`;
				link.click();
				return;
			}
			const blob = await sanctum(`/api/brt/label/${order.id}`, {
				method: 'GET',
				responseType: 'blob',
			});
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `etichetta-ordine-${order.id}.pdf`;
			document.body.appendChild(link);
			link.click();
			window.URL.revokeObjectURL(url);
			link.remove();
		} catch (e) {
			showError(e, "Errore durante il download dell'etichetta.");
		}
	};

	return {
		actionLoading,
		actionMessage,
		showSuccess,
		showError,
		formatCurrency,
		formatCents,
		formatDate,
		orderStatusConfig,
		withdrawalStatusConfig,
		referralStatusConfig,
		proRequestStatusConfig,
		downloadLabel,
	};
};
