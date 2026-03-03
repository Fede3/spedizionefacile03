<!--
  FILE: pages/account/account-pro.vue
  SCOPO: Pagina Partner Pro — due viste in base al ruolo utente.
         Non Pro: informazioni e form per richiedere il ruolo Partner Pro all'admin.
         Gia' Pro: codice referral, link da condividere, statistiche commissioni,
         saldo prelevabile e storico commissioni.
  API: POST /api/pro-requests — invia richiesta Partner Pro,
       GET /api/referral-stats — statistiche referral (solo Pro),
       GET /api/commissions — storico commissioni (solo Pro).
  COMPONENTI: nessun componente custom.
  ROUTE: /account/account-pro (middleware sanctum:auth).

  DATI IN INGRESSO:
    - user (da useSanctumAuth) — ruolo, codice referral.
    - referralStats, commissions (da API, solo Pro).

  DATI IN USCITA:
    - POST /api/pro-requests — richiesta Partner Pro.

  VINCOLI:
    - L'utente deve essere autenticato.
    - La richiesta Pro richiede nome azienda e P.IVA.
    - Il codice referral e' generato dal backend al momento dell'approvazione.

  ERRORI TIPICI:
    - Richiesta gia' inviata → messaggio "in attesa di approvazione".
    - Campi aziendali mancanti → errore validazione.

  PUNTI DI MODIFICA SICURI:
    - Aggiungere campi alla richiesta Pro: modificare il form e il body API.
    - Cambiare le statistiche mostrate: modificare il template card.

  COLLEGAMENTI:
    - pages/account/prelievi.vue → prelievo commissioni.
    - pages/account/amministrazione/utenti.vue → admin approva/rifiuta richieste.
-->
<script setup>
/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["sanctum:auth"],
});

const { user } = useSanctumAuth();
const sanctum = useSanctumClient();

/* Controlla se l'utente e' gia' Partner Pro */
const isPro = computed(() => user.value?.role === "Partner Pro");

/* === RICHIESTA ACCOUNT PRO (per chi non e' ancora Pro) === */
/* Stato della richiesta Pro (pending, approved, rejected) */
const proRequestStatus = ref(null);
/* Indica se l'invio della richiesta e' in corso */
const proRequestLoading = ref(false);
/* Dati del form di richiesta Pro */
const proRequestForm = ref({
	company_name: "",
	vat_number: "",
	message: "",
});
/* Errore durante l'invio della richiesta */
const proRequestError = ref(null);
/* Indica se la richiesta e' stata inviata con successo */
const proRequestSuccess = ref(false);

/* Controlla se l'utente ha gia' inviato una richiesta Pro e il suo stato */
const fetchProRequestStatus = async () => {
	try {
		const result = await sanctum("/api/pro-request/status");
		proRequestStatus.value = result;
	} catch (e) { /* ignore */ }
};

/* Invia la richiesta per diventare Partner Pro all'amministratore */
const submitProRequest = async () => {
	proRequestError.value = null;
	proRequestLoading.value = true;
	try {
		await sanctum("/api/pro-request", {
			method: "POST",
			body: proRequestForm.value,
		});
		proRequestSuccess.value = true;
		await fetchProRequestStatus();
	} catch (e) {
		const data = e?.response?._data || e?.data;
		proRequestError.value = data?.message || "Errore nell'invio della richiesta. Riprova.";
	} finally {
		proRequestLoading.value = false;
	}
};

/* === DATI PARTNER PRO (visibili solo se gia' Pro) === */
/* Contiene il codice referral, link, guadagni totali e utilizzi */
const referralData = ref(null);
/* Dati sulle commissioni (saldo prelevabile, storico) */
const earnings = ref(null);
/* Indica se i dati sono in fase di caricamento */
const isLoading = ref(true);

/* Carica il codice referral e le statistiche guadagni dal server */
const fetchData = async () => {
	if (!isPro.value) {
		isLoading.value = false;
		return;
	}
	try {
		const [refData, earningsData] = await Promise.all([
			sanctum("/api/referral/my-code"),
			sanctum("/api/referral/earnings"),
		]);
		referralData.value = refData;
		earnings.value = earningsData;
	} catch (e) {
		// Silently handle
	} finally {
		isLoading.value = false;
	}
};

onMounted(() => {
	fetchData();
	if (!isPro.value) fetchProRequestStatus();
});

/* Indicatori per mostrare "Copiato!" temporaneamente dopo un click */
const copied = ref(false);
const copiedAccountCode = ref(false);
const copiedLink = ref(false);

/* Copia il codice referral negli appunti dell'utente */
const copyCode = async () => {
	if (!referralData.value?.referral_code) return;
	try {
		await navigator.clipboard.writeText(referralData.value.referral_code);
		copied.value = true;
		setTimeout(() => (copied.value = false), 2000);
	} catch {
		fallbackCopy(referralData.value.referral_code);
		copied.value = true;
		setTimeout(() => (copied.value = false), 2000);
	}
};

/* Copia il link referral completo negli appunti */
const copyReferralLink = async () => {
	if (!referralData.value?.referral_link) return;
	try {
		await navigator.clipboard.writeText(referralData.value.referral_link);
		copiedLink.value = true;
		setTimeout(() => (copiedLink.value = false), 2000);
	} catch {
		fallbackCopy(referralData.value.referral_link);
		copiedLink.value = true;
		setTimeout(() => (copiedLink.value = false), 2000);
	}
};

/* Apre WhatsApp con un messaggio precompilato con il link referral */
const shareWhatsApp = () => {
	if (referralData.value?.whatsapp_link) {
		window.open(referralData.value.whatsapp_link, '_blank');
	}
};

/* Copia il codice account (es. "SF-PRO-000123") negli appunti */
const copyAccountCode = async () => {
	const code = `SF-PRO-${user.value?.id?.toString().padStart(6, '0')}`;
	try {
		await navigator.clipboard.writeText(code);
		copiedAccountCode.value = true;
		setTimeout(() => (copiedAccountCode.value = false), 2000);
	} catch {
		fallbackCopy(code);
		copiedAccountCode.value = true;
		setTimeout(() => (copiedAccountCode.value = false), 2000);
	}
};

/* Metodo alternativo per copiare testo nei browser piu' vecchi */
const fallbackCopy = (text) => {
	const el = document.createElement("textarea");
	el.value = text;
	document.body.appendChild(el);
	el.select();
	document.execCommand("copy");
	document.body.removeChild(el);
};

const formatDate = (dateStr) => {
	return new Date(dateStr).toLocaleDateString("it-IT", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<!-- Breadcrumb -->
			<div class="mb-[28px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Account Pro</span>
			</div>

			<!-- Not Pro -->
			<div v-if="!isPro" class="bg-white rounded-[20px] p-[32px] desktop:p-[48px] shadow-sm border border-[#E9EBEC]">
				<div class="text-center mb-[32px]">
					<div class="w-[80px] h-[80px] mx-auto mb-[24px] bg-gradient-to-br from-amber-50 to-amber-100 rounded-full flex items-center justify-center">
						<Icon name="mdi:star-outline" class="text-[36px] text-amber-500" />
					</div>
					<h2 class="text-[1.5rem] font-bold text-[#252B42] mb-[12px]">Diventa Partner Pro</h2>
					<p class="text-[#737373] text-[0.9375rem] max-w-[480px] mx-auto leading-[1.6]">
						Ottieni un codice referral personale e guadagna una commissione del 5% su ogni spedizione acquistata tramite il tuo codice. I clienti che usano il tuo codice ricevono uno sconto del 5%.
					</p>
				</div>

				<!-- Pending request status -->
				<div v-if="proRequestStatus?.has_request && proRequestStatus?.data?.status === 'pending'" class="bg-amber-50 border border-amber-200 rounded-[12px] p-[20px] text-center mb-[24px]">
					<Icon name="mdi:clock-outline" class="text-[24px] text-amber-600 mx-auto mb-[8px]" />
					<p class="text-[0.9375rem] font-semibold text-amber-800">Richiesta in attesa di approvazione</p>
					<p class="text-[0.8125rem] text-amber-700 mt-[4px]">La tua richiesta Pro è in fase di revisione. Ti comunicheremo l'esito al più presto.</p>
				</div>

				<!-- Approved -->
				<div v-else-if="proRequestStatus?.has_request && proRequestStatus?.data?.status === 'approved'" class="bg-emerald-50 border border-emerald-200 rounded-[12px] p-[20px] text-center mb-[24px]">
					<p class="text-[0.9375rem] font-semibold text-emerald-800">Richiesta approvata! Ricarica la pagina per vedere il tuo account Pro.</p>
				</div>

				<!-- Rejected -->
				<div v-else-if="proRequestStatus?.has_request && proRequestStatus?.data?.status === 'rejected'" class="bg-red-50 border border-red-200 rounded-[12px] p-[20px] text-center mb-[24px]">
					<p class="text-[0.9375rem] font-semibold text-red-800">La tua richiesta precedente è stata rifiutata. Puoi inviarne una nuova.</p>
				</div>

				<!-- Pro request button -->
				<div v-if="!proRequestStatus?.has_request || proRequestStatus?.data?.status === 'rejected'">
					<div v-if="proRequestSuccess" class="bg-emerald-50 border border-emerald-200 rounded-[12px] p-[20px] text-center">
						<Icon name="mdi:check-circle-outline" class="text-[32px] text-emerald-500 mx-auto mb-[8px]" />
						<p class="text-[1rem] font-semibold text-emerald-800">Richiesta inviata con successo!</p>
						<p class="text-[0.8125rem] text-emerald-700 mt-[4px]">Riceverai una risposta dall'amministratore al più presto.</p>
					</div>
					<div v-else class="text-center">
						<p v-if="proRequestError" class="text-red-500 text-[0.8125rem] bg-red-50 p-[10px] rounded-[6px] mb-[16px]">{{ proRequestError }}</p>
						<button @click="submitProRequest" :disabled="proRequestLoading" :class="proRequestLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#095866] hover:bg-[#074a56] cursor-pointer'" class="inline-flex items-center gap-[8px] px-[40px] py-[16px] rounded-[12px] text-white font-semibold text-[1.125rem] transition-all">
							<Icon name="mdi:star-outline" class="text-[22px]" />
							{{ proRequestLoading ? 'Invio in corso...' : 'Richiedi accesso Pro' }}
						</button>
						<p class="text-[0.8125rem] text-[#737373] mt-[12px]">L'amministratore potrà visualizzare i tuoi dati dal tuo profilo.</p>
					</div>
				</div>
			</div>

			<!-- Pro User Content -->
			<template v-else>
				<!-- Account Code & Referral Code -->
				<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[20px] mb-[24px]">
					<!-- Account Code -->
					<div class="bg-white rounded-[20px] p-[28px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[10px] mb-[16px]">
							<div class="w-[40px] h-[40px] rounded-[50px] bg-purple-50 flex items-center justify-center">
								<Icon name="mdi:identifier" class="text-[22px] text-purple-600" />
							</div>
							<p class="text-[0.8125rem] text-[#737373] uppercase tracking-[1px] font-medium">Codice Account</p>
						</div>
						<div class="flex items-center gap-[12px]">
							<span class="text-[1.25rem] font-mono font-bold text-[#252B42] tracking-[2px]">
								SF-PRO-{{ user?.id?.toString().padStart(6, '0') }}
							</span>
							<button @click="copyAccountCode" class="p-[8px] rounded-[8px] hover:bg-[#F8F9FB] transition-colors cursor-pointer" title="Copia codice account">
								<Icon :name="copiedAccountCode ? 'mdi:check' : 'mdi:content-copy'" :class="['text-[18px]', copiedAccountCode ? 'text-emerald-600' : 'text-[#737373]']" />
							</button>
						</div>
						<p class="text-[0.8125rem] text-[#737373] mt-[8px]">Il tuo identificativo univoco account.</p>
					</div>

					<!-- Referral Code -->
					<div class="relative bg-gradient-to-br from-[#095866] to-[#0b6d7d] rounded-[20px] p-[28px] text-white shadow-[0_8px_24px_rgba(9,88,102,0.2)] overflow-hidden">
						<div class="absolute top-0 right-0 w-[160px] h-[160px] rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2"></div>
						<div class="relative z-1">
							<div class="flex items-center gap-[10px] mb-[16px]">
								<div class="w-[40px] h-[40px] rounded-[50px] bg-white/15 flex items-center justify-center">
									<Icon name="mdi:share-variant-outline" class="text-[22px]" />
								</div>
								<p class="text-[0.8125rem] uppercase tracking-[1px] opacity-80 font-medium">Codice Referral</p>
							</div>
							<div class="flex items-center gap-[12px]">
								<span class="text-[1.5rem] desktop:text-[1.75rem] font-mono font-bold tracking-[4px]">
									{{ referralData?.referral_code || "--------" }}
								</span>
								<button
									@click="copyCode"
									class="px-[14px] py-[6px] bg-white/20 hover:bg-white/30 rounded-[8px] text-[0.8125rem] font-medium transition-all cursor-pointer">
									{{ copied ? "Copiato!" : "Copia codice" }}
								</button>
							</div>
							<p class="text-[0.8125rem] opacity-60 mt-[8px]">Condividi per dare il 5% di sconto ai tuoi contatti.</p>
							<div class="flex flex-wrap items-center gap-[10px] mt-[14px]">
								<button
									@click="copyReferralLink"
									class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-white/20 hover:bg-white/30 rounded-[8px] text-[0.8125rem] font-medium transition-all cursor-pointer">
									<Icon :name="copiedLink ? 'mdi:check' : 'mdi:link-variant'" class="text-[16px]" />
									{{ copiedLink ? "Link copiato!" : "Copia link" }}
								</button>
								<button
									@click="shareWhatsApp"
									class="inline-flex items-center gap-[6px] px-[14px] py-[8px] bg-[#25D366]/80 hover:bg-[#25D366] rounded-[8px] text-[0.8125rem] font-medium transition-all cursor-pointer">
									<Icon name="mdi:whatsapp" class="text-[18px]" />
									Condividi su WhatsApp
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Stats Cards -->
				<div class="grid grid-cols-1 account-pages:grid-cols-3 gap-[16px] mb-[24px]">
					<div class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[12px]">
							<Icon name="mdi:currency-eur" class="text-[18px] text-emerald-600" />
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Commissioni totali</p>
						</div>
						<p class="text-[1.75rem] font-bold text-[#252B42]">
							&euro;{{ referralData ? Number(referralData.total_earnings || 0).toFixed(2) : "0.00" }}
						</p>
					</div>
					<div class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[12px]">
							<Icon name="mdi:account-group-outline" class="text-[18px] text-blue-600" />
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Utilizzi codice</p>
						</div>
						<p class="text-[1.75rem] font-bold text-[#252B42]">
							{{ referralData?.total_usages || 0 }}
						</p>
					</div>
					<div class="bg-white rounded-[16px] p-[24px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[12px]">
							<Icon name="mdi:cash-check" class="text-[18px] text-teal-600" />
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Saldo prelevabile</p>
						</div>
						<p class="text-[1.75rem] font-bold text-emerald-600">
							&euro;{{ earnings ? Number(earnings.commission_balance || 0).toFixed(2) : "0.00" }}
						</p>
						<NuxtLink to="/account/prelievi" class="inline-flex items-center gap-[4px] text-[0.8125rem] text-[#095866] font-medium hover:underline mt-[6px]">
							Richiedi prelievo
							<Icon name="mdi:arrow-right" class="text-[14px]" />
						</NuxtLink>
					</div>
				</div>

				<!-- Earnings History -->
				<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
					<div class="flex items-center gap-[12px] mb-[24px]">
						<div class="w-[40px] h-[40px] rounded-[50px] bg-amber-50 flex items-center justify-center">
							<Icon name="mdi:chart-timeline-variant" class="text-[22px] text-amber-600" />
						</div>
						<h2 class="text-[1.125rem] font-bold text-[#252B42]">Storico commissioni</h2>
					</div>

					<div v-if="!earnings?.data?.length" class="text-center py-[48px]">
						<div class="w-[64px] h-[64px] mx-auto mb-[16px] rounded-full bg-[#F8F9FB] flex items-center justify-center">
							<Icon name="mdi:chart-line" class="text-[28px] text-[#C8CCD0]" />
						</div>
						<p class="text-[1rem] font-medium text-[#252B42]">Nessuna commissione ancora</p>
						<p class="text-[0.8125rem] text-[#737373] mt-[6px]">Condividi il tuo codice per iniziare a guadagnare.</p>
					</div>

					<div v-else class="overflow-x-auto">
						<table class="w-full text-[0.875rem]">
							<thead>
								<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
									<th class="pb-[12px] font-medium">Data</th>
									<th class="pb-[12px] font-medium">Cliente</th>
									<th class="pb-[12px] font-medium text-right">Ordine</th>
									<th class="pb-[12px] font-medium text-right">Commissione</th>
									<th class="pb-[12px] font-medium text-center">Stato</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="usage in earnings.data" :key="usage.id" class="border-b border-[#F0F0F0] last:border-0">
									<td class="py-[14px] text-[#404040]">{{ formatDate(usage.created_at) }}</td>
									<td class="py-[14px] text-[#404040]">{{ usage.buyer?.name || '—' }}</td>
									<td class="py-[14px] text-right text-[#404040]">&euro;{{ Number(usage.order_amount).toFixed(2) }}</td>
									<td class="py-[14px] text-right font-semibold text-emerald-600">+&euro;{{ Number(usage.commission_amount).toFixed(2) }}</td>
									<td class="py-[14px] text-center">
										<span
											:class="[
												'inline-block px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium',
												usage.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : usage.status === 'paid' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700',
											]">
											{{ usage.status === "confirmed" ? "Confermata" : usage.status === "paid" ? "Pagata" : "In attesa" }}
										</span>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
