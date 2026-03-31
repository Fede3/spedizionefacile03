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
	middleware: ["app-auth"],
});

const { user } = useSanctumAuth();
const sanctum = useSanctumClient();
const accountProUiReady = ref(false);

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
	accountProUiReady.value = true;
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
	<section v-if="accountProUiReady" class="min-h-[600px] py-[24px] tablet:py-[32px] desktop:py-[40px]">
		<div class="my-container space-y-[18px] tablet:space-y-[22px]">
				<AccountPageHeader
					eyebrow="Partner Pro"
					title="Partner Pro"
					description=""
					:crumbs="[
						{ label: 'Account', to: '/account' },
						{ label: 'Account Pro' },
					]"
				/>

				<!-- Not Pro -->
				<div v-if="!isPro" class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_420px] gap-[14px] desktop:gap-[18px]">
						<div class="bg-white rounded-[24px] p-[18px] tablet:p-[22px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] h-full">
							<div class="flex flex-col tablet:flex-row tablet:items-start gap-[16px]">
								<div class="w-[64px] h-[64px] shrink-0 rounded-[18px] border border-[#C7D8DE] bg-[#F4FAF9] flex items-center justify-center">
									<Icon name="mdi:star-outline" class="text-[28px] text-[#095866]" />
								</div>
								<div class="min-w-0">
									<h2 class="text-[1.25rem] tablet:text-[1.4rem] desktop:text-[1.5rem] font-bold text-[#252B42] mt-[6px]">Partner Pro</h2>
									<p class="text-[#737373] text-[0.875rem] tablet:text-[0.9375rem] max-w-[620px] leading-[1.6] mt-[8px]">
										Guadagna il 5% su ogni spedizione.
									</p>
								</div>
							</div>

						<div class="mt-[18px] grid grid-cols-1 sm:grid-cols-3 gap-[10px]">
							<div class="rounded-[16px] border border-[#E9EBEC] bg-[#FAFCFD] p-[14px]">
								<p class="text-[0.6875rem] uppercase tracking-[0.8px] text-[#737373] font-medium">Codice</p>
								<p class="text-[0.875rem] font-semibold text-[#252B42] mt-[6px]">Personale</p>
							</div>
							<div class="rounded-[16px] border border-[#E9EBEC] bg-[#FAFCFD] p-[14px]">
								<p class="text-[0.6875rem] uppercase tracking-[0.8px] text-[#737373] font-medium">Commissione</p>
								<p class="text-[0.875rem] font-semibold text-[#252B42] mt-[6px]">5% su ogni spedizione</p>
							</div>
							<div class="rounded-[16px] border border-[#E9EBEC] bg-[#FAFCFD] p-[14px]">
								<p class="text-[0.6875rem] uppercase tracking-[0.8px] text-[#737373] font-medium">Cliente</p>
								<p class="text-[0.875rem] font-semibold text-[#252B42] mt-[6px]">-5% automatico</p>
							</div>
						</div>

						<!-- Pending request status -->
						<div v-if="proRequestStatus?.has_request && proRequestStatus?.data?.status === 'pending'" class="mt-[18px] bg-amber-50 border border-amber-200 rounded-[16px] p-[16px] tablet:p-[18px]">
							<div class="flex items-start gap-[10px]">
								<Icon name="mdi:clock-outline" class="text-[22px] tablet:text-[24px] text-amber-600 shrink-0 mt-[1px]" />
								<div>
									<p class="text-[0.9375rem] font-semibold text-amber-800">Richiesta in attesa di approvazione</p>
										<p class="text-[0.8125rem] text-amber-700 mt-[4px] leading-[1.5]">In revisione.</p>
								</div>
							</div>
						</div>

						<!-- Approved -->
						<div v-else-if="proRequestStatus?.has_request && proRequestStatus?.data?.status === 'approved'" class="mt-[18px] bg-emerald-50 border border-emerald-200 rounded-[16px] p-[16px] tablet:p-[18px]">
							<div class="flex items-start gap-[10px]">
								<Icon name="mdi:check-circle-outline" class="text-[22px] tablet:text-[24px] text-emerald-500 shrink-0 mt-[1px]" />
								<div>
									<p class="text-[0.9375rem] font-semibold text-emerald-800">Richiesta approvata</p>
										<p class="text-[0.8125rem] text-emerald-700 mt-[4px] leading-[1.5]">Ricarica la pagina.</p>
								</div>
							</div>
						</div>

						<!-- Rejected -->
						<div v-else-if="proRequestStatus?.has_request && proRequestStatus?.data?.status === 'rejected'" class="mt-[18px] bg-red-50 border border-red-200 rounded-[16px] p-[16px] tablet:p-[18px]">
							<div class="flex items-start gap-[10px]">
								<Icon name="mdi:alert-circle-outline" class="text-[22px] tablet:text-[24px] text-red-500 shrink-0 mt-[1px]" />
								<div>
									<p class="text-[0.9375rem] font-semibold text-red-800">Richiesta rifiutata</p>
										<p class="text-[0.8125rem] text-red-700 mt-[4px] leading-[1.5]">Invia una nuova richiesta.</p>
								</div>
							</div>
						</div>
					</div>

					<div class="bg-white rounded-[24px] p-[18px] tablet:p-[22px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] h-full">
						<div class="mb-[16px]">
							<p class="text-[0.75rem] uppercase tracking-[1px] text-[#737373] font-medium">Richiesta Pro</p>
							<h3 class="text-[1.125rem] tablet:text-[1.2rem] font-bold text-[#252B42] mt-[6px]">Richiedi accesso</h3>
								<p class="text-[#737373] text-[0.875rem] leading-[1.55] mt-[8px]">Invia i dati aziendali.</p>
						</div>

						<div v-if="proRequestSuccess" class="bg-emerald-50 border border-emerald-200 rounded-[16px] p-[16px] tablet:p-[18px] text-center">
							<Icon name="mdi:check-circle-outline" class="text-[28px] tablet:text-[32px] text-emerald-500 mx-auto mb-[8px]" />
							<p class="text-[1rem] font-semibold text-emerald-800">Richiesta inviata!</p>
								<p class="text-[0.8125rem] text-emerald-700 mt-[4px] leading-[1.5]">Ti aggiorneremo appena possibile.</p>
						</div>
						<div v-else class="space-y-[14px]">
							<p v-if="proRequestError" class="text-red-600 text-[0.8125rem] bg-red-50 p-[10px] rounded-[10px] border border-red-100">{{ proRequestError }}</p>

							<div class="space-y-[10px]">
								<div>
									<label class="block text-[0.8125rem] font-semibold text-[#252B42] mb-[6px]" for="pro_company_name">Ragione sociale</label>
									<input
										id="pro_company_name"
										v-model="proRequestForm.company_name"
										type="text"
										placeholder="Nome azienda"
										class="w-full min-h-[48px] px-[14px] rounded-[14px] border border-[#D7E1E4] bg-white text-[#252B42] text-[0.9375rem] outline-none focus:border-[#095866] focus:ring-2 focus:ring-[#095866]/10" />
								</div>
								<div>
									<label class="block text-[0.8125rem] font-semibold text-[#252B42] mb-[6px]" for="pro_vat_number">Partita IVA</label>
									<input
										id="pro_vat_number"
										v-model="proRequestForm.vat_number"
										type="text"
										placeholder="Partita IVA"
										class="w-full min-h-[48px] px-[14px] rounded-[14px] border border-[#D7E1E4] bg-white text-[#252B42] text-[0.9375rem] outline-none focus:border-[#095866] focus:ring-2 focus:ring-[#095866]/10" />
								</div>
								<div>
								<label class="block text-[0.8125rem] font-semibold text-[#252B42] mb-[6px]" for="pro_message">Messaggio</label>
									<textarea
										id="pro_message"
										v-model="proRequestForm.message"
										rows="4"
										placeholder="Breve nota opzionale"
										class="w-full px-[14px] py-[12px] rounded-[14px] border border-[#D7E1E4] bg-white text-[#252B42] text-[0.9375rem] outline-none focus:border-[#095866] focus:ring-2 focus:ring-[#095866]/10 resize-none"></textarea>
								</div>
							</div>

								<button @click="submitProRequest" :disabled="proRequestLoading" class="btn-primary btn-compact w-full inline-flex items-center justify-center gap-[8px] disabled:bg-[#c9d1d5] disabled:cursor-not-allowed">
									<Icon name="mdi:star-outline" class="text-[20px]" />
									{{ proRequestLoading ? 'Invio in corso...' : 'Invia richiesta' }}
								</button>
							</div>
						</div>
				</div>

				<!-- Pro User Content -->
				<template v-else>
					<!-- Account Code & Referral Code -->
					<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[14px] desktop:gap-[18px] mb-[22px]">
						<!-- Account Code -->
						<div class="bg-white rounded-[24px] p-[18px] desktop:p-[24px] border border-[#E9EBEC] shadow-sm h-full">
							<div class="flex items-center gap-[10px] mb-[14px]">
									<div class="w-[36px] h-[36px] rounded-[12px] bg-[#F4FAF9] border border-[#C7D8DE] flex items-center justify-center">
										<Icon name="mdi:identifier" class="text-[20px] text-[#095866]" />
									</div>
								<p class="text-[0.8125rem] text-[#737373] uppercase tracking-[0.8px] font-medium">Account</p>
						</div>
						<div class="flex flex-col sm:flex-row sm:items-center gap-[10px] sm:gap-[12px]">
							<span class="text-[1rem] desktop:text-[1.125rem] font-mono font-bold text-[#252B42] tracking-[1px] desktop:tracking-[2px] break-all">
								SF-PRO-{{ user?.id?.toString().padStart(6, '0') }}
							</span>
							<button @click="copyAccountCode" class="p-[8px] rounded-[8px] hover:bg-[#F8F9FB] transition-colors cursor-pointer" title="Copia codice account">
								<Icon :name="copiedAccountCode ? 'mdi:check' : 'mdi:content-copy'" :class="['text-[18px]', copiedAccountCode ? 'text-emerald-600' : 'text-[#737373]']" />
							</button>
						</div>
							<p class="text-[0.8125rem] text-[#737373] mt-[8px]">Codice personale.</p>
					</div>

					<!-- Referral Code -->
						<div class="bg-white rounded-[24px] p-[18px] desktop:p-[24px] border border-[#E9EBEC] shadow-sm h-full">
							<div>
								<div class="flex items-center gap-[10px] mb-[14px]">
									<div class="w-[36px] h-[36px] rounded-[12px] bg-[#F4FAF9] border border-[#C7D8DE] flex items-center justify-center">
										<Icon name="mdi:share-variant-outline" class="text-[20px] text-[#095866]" />
								</div>
								<p class="text-[0.8125rem] uppercase tracking-[1px] text-[#737373] font-medium">Referral</p>
							</div>
							<div class="flex flex-col sm:flex-row sm:items-center gap-[10px] sm:gap-[12px]">
								<span class="text-[1.125rem] desktop:text-[1.5rem] font-mono font-bold tracking-[2px] desktop:tracking-[3px] break-all text-[#252B42]">
									{{ referralData?.referral_code || "--------" }}
								</span>
								<button
									@click="copyCode"
									class="sf-action-pill sf-action-pill--neutral w-full sm:w-auto">
									{{ copied ? "Copiato!" : "Copia" }}
								</button>
							</div>
							<div class="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-[10px] mt-[14px]">
								<button
									@click="copyReferralLink"
									class="sf-action-pill sf-action-pill--neutral">
									<Icon :name="copiedLink ? 'mdi:check' : 'mdi:link-variant'" class="text-[16px]" />
									{{ copiedLink ? "Link copiato" : "Copia link" }}
								</button>
								<button
									@click="shareWhatsApp"
									class="sf-action-pill sf-action-pill--soft">
									<Icon name="mdi:whatsapp" class="text-[18px]" />
									WhatsApp
								</button>
							</div>
						</div>
					</div>
				</div>

				<!-- Stats Cards -->
					<div class="grid grid-cols-1 sm:grid-cols-2 account-pages:grid-cols-3 gap-[10px] desktop:gap-[14px] mb-[22px]">
						<div class="bg-white rounded-[18px] p-[16px] desktop:p-[20px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[10px]">
							<Icon name="mdi:currency-eur" class="text-[16px] text-emerald-600" />
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Commissioni</p>
						</div>
						<p class="text-[1.5rem] font-bold text-[#252B42]">
							&euro;{{ referralData ? Number(referralData.total_earnings || 0).toFixed(2) : "0.00" }}
						</p>
					</div>
							<div class="bg-white rounded-[18px] p-[16px] desktop:p-[20px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[10px]">
								<Icon name="mdi:account-group-outline" class="text-[16px] text-[#095866]" />
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Utilizzi</p>
							</div>
						<p class="text-[1.5rem] font-bold text-[#252B42]">
							{{ referralData?.total_usages || 0 }}
						</p>
					</div>
						<div class="bg-white rounded-[18px] p-[16px] desktop:p-[20px] border border-[#E9EBEC] shadow-sm">
						<div class="flex items-center gap-[8px] mb-[10px]">
							<Icon name="mdi:cash-check" class="text-[16px] text-teal-600" />
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Saldo</p>
						</div>
						<p class="text-[1.5rem] font-bold text-emerald-600">
							&euro;{{ earnings ? Number(earnings.commission_balance || 0).toFixed(2) : "0.00" }}
						</p>
						<NuxtLink to="/account/prelievi" class="inline-flex items-center gap-[4px] text-[0.8125rem] text-[#095866] font-medium hover:underline mt-[6px]">
							Prelievi
							<Icon name="mdi:arrow-right" class="text-[14px]" />
						</NuxtLink>
					</div>
				</div>

				<!-- Earnings History -->
					<div class="bg-white rounded-[24px] p-[18px] desktop:p-[28px] shadow-sm border border-[#E9EBEC]">
					<div class="flex items-center gap-[12px] mb-[16px] desktop:mb-[20px]">
						<div class="w-[40px] h-[40px] rounded-[50px] bg-amber-50 flex items-center justify-center">
							<Icon name="mdi:chart-timeline-variant" class="text-[22px] text-amber-600" />
						</div>
						<h2 class="text-[1.125rem] font-bold text-[#252B42]">Storico</h2>
					</div>

					<div v-if="!earnings?.data?.length" class="text-center py-[48px]">
						<div class="w-[64px] h-[64px] mx-auto mb-[16px] rounded-full bg-[#F8F9FB] flex items-center justify-center">
							<Icon name="mdi:chart-line" class="text-[28px] text-[#C8CCD0]" />
						</div>
						<p class="text-[1rem] font-medium text-[#252B42]">Ancora nessuna commissione</p>
						<p class="text-[0.8125rem] text-[#737373] mt-[6px]">Condividi il codice.</p>
					</div>

					<div v-else class="space-y-[12px] desktop:space-y-0">
						<div class="desktop:hidden space-y-[10px]">
							<div v-for="usage in earnings.data" :key="usage.id" class="bg-[#F8F9FB] rounded-[16px] p-[14px] border border-[#E9EBEC]">
								<div class="flex items-start justify-between gap-[12px]">
									<div>
										<p class="text-[0.8125rem] font-semibold text-[#252B42]">{{ usage.buyer?.name || '—' }}</p>
										<p class="text-[0.75rem] text-[#737373] mt-[2px]">{{ formatDate(usage.created_at) }}</p>
									</div>
									<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', usage.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : usage.status === 'paid' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700']">
										{{ usage.status === "confirmed" ? "Confermata" : usage.status === "paid" ? "Pagata" : "In attesa" }}
									</span>
								</div>
								<div class="flex items-center justify-between gap-[10px] mt-[10px] text-[0.8125rem]">
									<span class="text-[#737373]">Ordine</span>
									<span class="text-[#404040]">&euro;{{ Number(usage.order_amount).toFixed(2) }}</span>
								</div>
								<div class="flex items-center justify-between gap-[10px] mt-[6px] text-[0.8125rem]">
									<span class="text-[#737373]">Commissione</span>
									<span class="font-semibold text-emerald-600">+&euro;{{ Number(usage.commission_amount).toFixed(2) }}</span>
								</div>
							</div>
						</div>
							<div class="hidden desktop:block overflow-x-auto">
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
									<td class="py-[12px] text-[#404040]">{{ formatDate(usage.created_at) }}</td>
									<td class="py-[12px] text-[#404040]">{{ usage.buyer?.name || '—' }}</td>
									<td class="py-[12px] text-right text-[#404040]">&euro;{{ Number(usage.order_amount).toFixed(2) }}</td>
									<td class="py-[12px] text-right font-semibold text-emerald-600">+&euro;{{ Number(usage.commission_amount).toFixed(2) }}</td>
									<td class="py-[12px] text-center">
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
				</div>
				</template>
		</div>
	</section>

	<section v-else class="min-h-[600px] py-[24px] tablet:py-[32px] desktop:py-[40px]">
		<div class="my-container space-y-[18px] tablet:space-y-[22px]">
			<div class="rounded-[22px] border border-[#E3EBF0] bg-white px-[18px] py-[18px] shadow-[0_12px_30px_rgba(9,88,102,0.06)] tablet:px-[22px] tablet:py-[22px] desktop:px-[28px] desktop:py-[26px]">
				<div class="flex flex-col gap-[10px]">
					<div class="h-[12px] w-[140px] rounded-full bg-[#EEF3F7] animate-pulse"></div>
					<div class="h-[32px] w-[220px] rounded-[10px] bg-[#EEF3F7] animate-pulse"></div>
					<div class="h-[16px] w-full max-w-[560px] rounded-[8px] bg-[#F2F5F8] animate-pulse"></div>
				</div>
			</div>

			<div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_320px] gap-[14px] desktop:gap-[18px]">
				<div class="rounded-[24px] border border-[#E9EBEC] bg-white p-[18px] tablet:p-[22px] desktop:p-[28px]">
					<div class="space-y-[12px]">
						<div class="h-[22px] w-[180px] rounded-[10px] bg-[#EEF3F7] animate-pulse"></div>
						<div class="h-[16px] w-full rounded-[8px] bg-[#F2F5F8] animate-pulse"></div>
						<div class="h-[16px] w-[82%] rounded-[8px] bg-[#F2F5F8] animate-pulse"></div>
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-[10px] pt-[8px]">
							<div v-for="index in 3" :key="`account-pro-skeleton-card-${index}`" class="h-[88px] rounded-[16px] bg-[#F7FAFC] border border-[#E9EBEC] animate-pulse"></div>
						</div>
					</div>
				</div>

				<div class="rounded-[24px] border border-[#E9EBEC] bg-white p-[18px] tablet:p-[22px] desktop:p-[28px]">
					<div class="space-y-[12px]">
						<div class="h-[22px] w-[160px] rounded-[10px] bg-[#EEF3F7] animate-pulse"></div>
						<div class="h-[16px] w-[90%] rounded-[8px] bg-[#F2F5F8] animate-pulse"></div>
						<div class="h-[52px] rounded-[14px] bg-[#F7FAFC] border border-[#E9EBEC] animate-pulse"></div>
						<div class="h-[52px] rounded-[14px] bg-[#F7FAFC] border border-[#E9EBEC] animate-pulse"></div>
						<div class="h-[52px] rounded-[14px] bg-[#F7FAFC] border border-[#E9EBEC] animate-pulse"></div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
