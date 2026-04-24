import { formatEuro } from '~/utils/price.js'
import type { AdminActionMessage, AdminStatusConfig } from '~/types'

interface AdminCurrencyObject {
	amount?: number | string
	formatted?: string
	[key: string]: unknown
}

interface AdminApiError {
	response?: { _data?: { message?: string } }
	data?: { message?: string }
	[key: string]: unknown
}

interface AdminDownloadableOrder {
	id: number | string
	brt_parcel_id?: string | number | null
	brt_label_base64?: string | null
	[key: string]: unknown
}

export const useAdmin = () => {
	/* Stato delle azioni admin (approvazione, eliminazione, ecc.) */
	const actionLoading = ref<string | number | null>(null);
	/* Messaggio di feedback dopo un'azione admin (successo o errore) */
	const actionMessage = ref<AdminActionMessage | null>(null);

	/* Nasconde il messaggio dopo 5 secondi */
	const clearMessage = (): void => {
		setTimeout(() => { actionMessage.value = null; }, 5000);
	};

	/* Mostra un messaggio verde di successo */
	const showSuccess = (text: string): void => {
		actionMessage.value = { type: "success", text };
		clearMessage();
	};

	/* Mostra un messaggio rosso di errore */
	const showError = (e: AdminApiError | null | unknown, fallback: string): void => {
		const err = e as AdminApiError | null;
		actionMessage.value = {
			type: "error",
			text: err?.response?._data?.message || err?.data?.message || fallback,
		};
		clearMessage();
	};

	/* Formatta un valore come valuta con 2 decimali.
	   Gestisce: oggetto MyMoney {amount (centesimi), formatted}, stringa formattata, numero in euro.
	   Delega a formatEuro (~/utils/price.js) dove possibile. */
	const formatCurrency = (val: unknown): string => {
		if (val == null) return '0,00';
		// Se è un oggetto MyMoney serializzato {amount: 1250, formatted: "12,50 EUR"}
		if (typeof val === 'object' && val !== null && 'amount' in val && (val as AdminCurrencyObject).amount !== undefined) {
			return formatEuro(Number((val as AdminCurrencyObject).amount) / 100);
		}
		// Se è una stringa formattata (es. "12,50 EUR" o "12,50")
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
	const formatCents = (val: unknown): string => formatEuro(Number(val || 0) / 100);

	/* Formatta una data nel formato italiano con ora */
	const formatDate = (dateStr: string | null | undefined): string => {
		if (!dateStr) return "\u2014";
		return new Date(dateStr).toLocaleDateString("it-IT", {
			day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
		});
	};

	/* Configurazione colori, icone e etichette per ogni stato ordine */
	const orderStatusConfig: AdminStatusConfig = {
		pending: { label: "In attesa", bg: "bg-amber-50", text: "text-amber-700", icon: "mdi:clock-outline" },
		awaiting_bank_transfer: { label: "In attesa bonifico", bg: "bg-orange-50", text: "text-[#C2410C]", icon: "mdi:bank-transfer" },
		processing: { label: "In lavorazione", bg: "bg-[#eef8fa]", text: "text-[#095866]", icon: "mdi:cog-outline" },
		label_generated: { label: "Etichetta generata", bg: "bg-[#eef8fa]", text: "text-[#095866]", icon: "mdi:barcode" },
		completed: { label: "Completato", bg: "bg-[#f0fdf4]", text: "text-[#0a8a7a]", icon: "mdi:check-circle-outline" },
		payed: { label: "Pagato", bg: "bg-[#f0fdf4]", text: "text-[#0a8a7a]", icon: "mdi:credit-card-check-outline" },
		payment_failed: { label: "Pagamento fallito", bg: "bg-red-50", text: "text-red-700", icon: "mdi:credit-card-off-outline" },
		cancelled: { label: "Annullato", bg: "bg-gray-100", text: "text-gray-600", icon: "mdi:close-circle-outline" },
		refunded: { label: "Rimborsato", bg: "bg-orange-50", text: "text-orange-700", icon: "mdi:cash-refund" },
		in_transit: { label: "In transito", bg: "bg-[#eef8fa]", text: "text-[#095866]", icon: "mdi:truck-delivery-outline" },
		out_for_delivery: { label: "In consegna", bg: "bg-[#dff0f3]", text: "text-[#074a56]", icon: "mdi:truck-fast-outline" },
		delivered: { label: "Consegnato", bg: "bg-[#f0fdf4]", text: "text-[#0a8a7a]", icon: "mdi:package-variant-closed-check" },
		in_giacenza: { label: "In giacenza", bg: "bg-orange-50", text: "text-orange-700", icon: "mdi:package-variant" },
		returned: { label: "Reso", bg: "bg-orange-50", text: "text-[#E44203]", icon: "mdi:package-variant-remove" },
		refused: { label: "Rifiutato", bg: "bg-red-50", text: "text-red-700", icon: "mdi:package-variant-closed-minus" },
	};

	const withdrawalStatusConfig: AdminStatusConfig = {
		pending: { label: "In attesa", icon: "mdi:clock-outline", bg: "bg-amber-50", text: "text-amber-700" },
		approved: { label: "Approvata", icon: "mdi:check-circle-outline", bg: "bg-[#f0fdf4]", text: "text-[#0a8a7a]" },
		rejected: { label: "Rifiutata", icon: "mdi:close-circle-outline", bg: "bg-red-50", text: "text-red-700" },
	};

	const referralStatusConfig: AdminStatusConfig = {
		confirmed: { label: "Confermata", bg: "bg-[#f0fdf4]", text: "text-[#0a8a7a]" },
		paid: { label: "Pagata", bg: "bg-[#eef8fa]", text: "text-[#095866]" },
		pending: { label: "In attesa", bg: "bg-amber-50", text: "text-amber-700" },
	};

	const proRequestStatusConfig: AdminStatusConfig = {
		pending: { label: "In attesa", bg: "bg-amber-50", text: "text-amber-700", icon: "mdi:clock-outline" },
		approved: { label: "Approvata", bg: "bg-[#f0fdf4]", text: "text-[#0a8a7a]", icon: "mdi:check-circle-outline" },
		rejected: { label: "Rifiutata", bg: "bg-red-50", text: "text-red-700", icon: "mdi:close-circle-outline" },
	};

	/* Scarica l'etichetta BRT di un ordine come file PDF */
	const downloadLabel = async (order: AdminDownloadableOrder): Promise<void> => {
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
			}) as Blob;
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
