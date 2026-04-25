<!-- Alla conferma bonifico l'ordine passa a completed e l'evento OrderPaid scatena la generazione etichetta BRT automatica. -->
<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Admin - Bonifici in attesa',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();

const orders = ref([]);
const loading = ref(true);
const loadError = ref('');
const feedback = ref('');
const feedbackType = ref('success');

const selected = ref(null);
const confirming = ref(false);

const fetchPending = async () => {
	loading.value = true;
	loadError.value = '';
	try {
		const res = await sanctum('/api/admin/orders/awaiting-bank-transfer', { method: 'GET' });
		const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
		orders.value = list;
	} catch (error) {
		loadError.value = error?.response?._data?.message || error?.data?.message || 'Impossibile caricare gli ordini in attesa di bonifico.';
	} finally {
		loading.value = false;
	}
};

onMounted(fetchPending);

const formatDate = (value) => {
	if (!value) return '—';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return '—';
	return new Intl.DateTimeFormat('it-IT', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(parsed);
};

const formatAmount = (cents) => {
	if (cents === null || cents === undefined) return '—';
	const value = Number(cents);
	if (Number.isNaN(value)) return '—';
	return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value / 100);
};

const openConfirm = (order) => {
	selected.value = order;
	feedback.value = '';
};

const closeConfirm = () => {
	if (confirming.value) return;
	selected.value = null;
};

// Riceve il reference dal modal AdminBankTransferConfirmModal (P5 estratto)
const confirmWithReference = async (referenceValue) => {
	if (!selected.value || confirming.value) return;
	confirming.value = true;
	feedback.value = '';
	try {
		await sanctum(`/api/admin/orders/${selected.value.id}/confirm-bank-transfer`, {
			method: 'POST',
			body: {
				bank_transfer_reference: referenceValue || null,
			},
		});
		feedback.value = `Bonifico confermato per ordine #${selected.value.id}. Etichetta BRT in generazione.`;
		feedbackType.value = 'success';
		selected.value = null;
		await fetchPending();
	} catch (error) {
		feedback.value = error?.response?._data?.message || error?.data?.message || 'Impossibile confermare il bonifico.';
		feedbackType.value = 'error';
	} finally {
		confirming.value = false;
	}
};

const summaryItems = computed(() => {
	const count = orders.value.length;
	const totalCents = orders.value.reduce((sum, o) => sum + Number(o.payable_total_cents ?? o.subtotal_cents ?? 0), 0);
	const oldestDays = orders.value.reduce((max, o) => {
		if (!o.created_at) return max;
		const days = Math.floor((Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24));
		return days > max ? days : max;
	}, 0);
	return [
		{ key: 'count', label: 'Bonifici pendenti', value: String(count), meta: count ? 'Da verificare in banca' : 'Tutto in pari' },
		{ key: 'amount', label: 'Importo totale', value: formatAmount(totalCents), meta: 'Somma ordini in attesa' },
		{ key: 'oldest', label: 'Piu datato', value: oldestDays ? `${oldestDays} g` : '—', meta: oldestDays > 3 ? 'Controllare subito' : 'Nessun ritardo' },
	];
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Bonifici in attesa"
				description="Verifica in banca i bonifici pendenti e conferma la ricezione per far partire la spedizione."
				back-to="/account/amministrazione"
				back-label="Torna al pannello admin"
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Amministrazione', to: '/account/amministrazione' }, { label: 'Bonifici' }]" />

			<div
				v-if="loadError || feedback"
				:class="['mb-[16px] ux-alert', (loadError || feedbackType === 'error') ? 'ux-alert--critical' : 'ux-alert--success']">
				<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="ux-alert__icon shrink-0" fill="currentColor">
					<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
				</svg>
				<span>{{ loadError || feedback }}</span>
			</div>

			<div class="sf-account-summary-strip mb-[20px] sf-animate-in sf-animate-in-1">
				<div v-for="item in summaryItems" :key="item.key" class="sf-account-summary-item">
					<div class="sf-account-summary-item__icon">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[15px] w-[15px]" fill="currentColor" style="color: var(--color-brand-primary);">
							<path d="M5,6H23V18H5V6M14,9A3,3 0 0,1 17,12A3,3 0 0,1 14,15A3,3 0 0,1 11,12A3,3 0 0,1 14,9M9,8A2,2 0 0,1 7,10V14A2,2 0 0,1 9,16H19A2,2 0 0,1 21,14V10A2,2 0 0,1 19,8H9M1,10H3V20H19V22H1V10Z" />
						</svg>
					</div>
					<div class="sf-account-summary-item__body">
						<span class="sf-account-summary-item__value">{{ item.value }}</span>
						<span class="sf-account-summary-item__label">{{ item.label }}</span>
						<span class="sf-account-summary-item__meta">{{ item.meta }}</span>
					</div>
				</div>
			</div>

			<section class="sf-account-section sf-account-panel sf-animate-in sf-animate-in-2">
				<div class="sf-account-section__header">
					<div class="sf-account-section__title-wrap">
						<p class="text-[0.7rem] font-semibold uppercase tracking-[1px] text-[var(--color-brand-primary)]">Coda bonifici</p>
						<h2 class="sf-account-section__title">In attesa di ricezione</h2>
						<p class="sf-account-section__description">
							La causale del cliente è sempre <strong>ORD-{ID}</strong>. Verifica in banca e conferma per sbloccare la spedizione.
						</p>
					</div>
					<button type="button" class="btn-secondary btn-compact inline-flex items-center justify-center gap-[6px]" @click="fetchPending">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
							<path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.57,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
						</svg>
						Aggiorna
					</button>
				</div>

				<div class="sf-account-section__body">
					<div v-if="loading" class="rounded-[16px] bg-[#F5F6F9] px-[18px] py-[20px] text-center">
						<p class="text-[0.9375rem] font-semibold text-[var(--color-brand-text)]">Caricamento bonifici pendenti...</p>
					</div>

					<div v-else-if="!orders.length" class="rounded-[16px] bg-[#F5F6F9] px-[18px] py-[22px] text-center">
						<div class="mx-auto mb-[12px] flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#E9F7EC] text-[#1F7A3A]">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[24px] w-[24px]" fill="currentColor">
								<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M10,17L5,12L6.41,10.59L10,14.17L17.59,6.58L19,8L10,17Z" />
							</svg>
						</div>
						<p class="text-[0.9375rem] font-semibold text-[var(--color-brand-text)]">Nessun bonifico in attesa</p>
						<p class="mx-auto mt-[6px] max-w-[520px] text-[0.8125rem] leading-[1.6] text-[var(--color-brand-text-secondary)]">
							Tutti i pagamenti via bonifico sono stati riconciliati.
						</p>
					</div>

					<div v-else class="space-y-[8px]">
						<article
							v-for="order in orders"
							:key="order.id"
							class="rounded-[16px] border border-[rgba(9,88,102,0.08)] bg-white px-[16px] py-[14px] transition-all hover:bg-[#FBFCFD]">
							<div class="flex flex-col gap-[10px] desktop:flex-row desktop:items-center desktop:justify-between">
								<div class="min-w-0 space-y-[6px]">
									<div class="flex flex-wrap items-center gap-[6px]">
										<span class="inline-flex items-center rounded-full bg-[#FFF1E8] px-[10px] py-[3px] text-[0.6875rem] font-semibold text-[#B45309] border border-[rgba(228,66,3,0.3)]">
											In attesa bonifico
										</span>
										<span class="sf-account-meta-pill sf-account-meta-pill--muted">Ordine #{{ order.id }}</span>
										<span class="sf-account-meta-pill sf-account-meta-pill--muted font-mono">Causale: ORD-{{ order.id }}</span>
									</div>
									<h3 class="font-montserrat text-[0.9375rem] font-[800] text-[var(--color-brand-text)]">
										{{ formatAmount(order.payable_total_cents ?? order.subtotal_cents ?? (order.subtotal?.amount ? Number(order.subtotal.amount) * 100 : null)) }}
									</h3>
									<div class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">
										<span v-if="order.user">{{ order.user.name }} {{ order.user.surname }} · {{ order.user.email }}</span>
										<span v-else>Cliente —</span>
									</div>
									<div class="text-[0.6875rem] text-[var(--color-brand-text-muted)]">
										Creato il {{ formatDate(order.created_at) }}
									</div>
								</div>
								<div class="shrink-0 flex gap-[8px]">
									<NuxtLink
										:to="`/account/amministrazione/ordini?search=${order.id}`"
										class="btn-secondary btn-compact">
										Vedi ordine
									</NuxtLink>
									<button type="button" class="btn-cta btn-compact" @click="openConfirm(order)">
										Conferma ricezione
									</button>
								</div>
							</div>
						</article>
					</div>
				</div>
			</section>
		</div>

		<!-- Confirm Modal — estratto come AdminBankTransferConfirmModal (P5) -->
		<AdminBankTransferConfirmModal
			:order="selected"
			:confirming="confirming"
			:format-amount="formatAmount"
			@close="closeConfirm"
			@confirm="(ref) => confirmWithReference(ref)" />
	</section>
</template>
