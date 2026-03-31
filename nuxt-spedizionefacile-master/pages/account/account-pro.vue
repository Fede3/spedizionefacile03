<!--
  FILE: pages/account/account-pro.vue
  SCOPO: Pagina Partner Pro — orchestratore.
  API: POST /api/pro-requests, GET /api/referral-stats, GET /api/commissions.
  COMPONENTI: AccountProRequestForm, AccountProDashboard, AccountProSkeleton, AccountPageHeader.
  ROUTE: /account/account-pro (middleware sanctum:auth).
-->
<script setup>
definePageMeta({ middleware: ["app-auth"] });

const { user } = useSanctumAuth();
const sanctum = useSanctumClient();
const accountProUiReady = ref(false);

const isPro = computed(() => user.value?.role === 'Partner Pro');

/* === Richiesta Pro (non Pro) === */
const proRequestStatus = ref(null);
const proRequestLoading = ref(false);
const proRequestForm = ref({ company_name: '', vat_number: '', message: '' });
const proRequestError = ref(null);
const proRequestSuccess = ref(false);

const fetchProRequestStatus = async () => {
	try { proRequestStatus.value = await sanctum('/api/pro-request/status'); } catch { /* ignore */ }
};

const submitProRequest = async () => {
	proRequestError.value = null;
	proRequestLoading.value = true;
	try {
		await sanctum('/api/pro-request', { method: 'POST', body: proRequestForm.value });
		proRequestSuccess.value = true;
		await fetchProRequestStatus();
	} catch (e) {
		const data = e?.response?._data || e?.data;
		proRequestError.value = data?.message || "Errore nell'invio della richiesta. Riprova.";
	} finally { proRequestLoading.value = false; }
};

/* === Dati Partner Pro === */
const referralData = ref(null);
const earnings = ref(null);
const isLoading = ref(true);

const fetchData = async () => {
	if (!isPro.value) { isLoading.value = false; return; }
	try {
		const [refData, earningsData] = await Promise.all([
			sanctum('/api/referral/my-code'),
			sanctum('/api/referral/earnings'),
		]);
		referralData.value = refData;
		earnings.value = earningsData;
	} catch { /* silent */ }
	finally { isLoading.value = false; }
};

onMounted(() => { accountProUiReady.value = true; fetchData(); if (!isPro.value) fetchProRequestStatus(); });

/* === Clipboard helpers === */
const copied = ref(false);
const copiedAccountCode = ref(false);
const copiedLink = ref(false);

const fallbackCopy = (text) => {
	const el = document.createElement('textarea');
	el.value = text;
	document.body.appendChild(el);
	el.select();
	document.execCommand('copy');
	document.body.removeChild(el);
};

const clipboardWrite = async (text, flag) => {
	try { await navigator.clipboard.writeText(text); } catch { fallbackCopy(text); }
	flag.value = true;
	setTimeout(() => { flag.value = false; }, 2000);
};

const copyCode = () => { if (referralData.value?.referral_code) clipboardWrite(referralData.value.referral_code, copied); };
const copyReferralLink = () => { if (referralData.value?.referral_link) clipboardWrite(referralData.value.referral_link, copiedLink); };
const copyAccountCode = () => { clipboardWrite(`SF-PRO-${user.value?.id?.toString().padStart(6, '0')}`, copiedAccountCode); };
const shareWhatsApp = () => { if (referralData.value?.whatsapp_link) window.open(referralData.value.whatsapp_link, '_blank'); };
</script>

<template>
	<section v-if="accountProUiReady" class="min-h-[600px] py-[24px] tablet:py-[32px] desktop:py-[40px]">
		<div class="my-container space-y-[18px] tablet:space-y-[22px]">
			<AccountPageHeader
				eyebrow="Partner Pro"
				title="Partner Pro"
				description=""
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Account Pro' }]"
			/>

			<!-- Non Pro: info + form richiesta -->
			<AccountProRequestForm
				v-if="!isPro"
				:pro-request-status="proRequestStatus"
				:pro-request-form="proRequestForm"
				:pro-request-error="proRequestError"
				:pro-request-success="proRequestSuccess"
				:pro-request-loading="proRequestLoading"
				@update:pro-request-form="proRequestForm = $event"
				@submit="submitProRequest"
			/>

			<!-- Pro: dashboard completa -->
			<AccountProDashboard
				v-else
				:user="user"
				:referral-data="referralData"
				:earnings="earnings"
				:copied="copied"
				:copied-account-code="copiedAccountCode"
				:copied-link="copiedLink"
				@copy-code="copyCode"
				@copy-link="copyReferralLink"
				@copy-account-code="copyAccountCode"
				@share-whatsapp="shareWhatsApp"
			/>
		</div>
	</section>

	<!-- Skeleton -->
	<section v-else class="min-h-[600px] py-[24px] tablet:py-[32px] desktop:py-[40px]">
		<AccountProSkeleton />
	</section>
</template>
