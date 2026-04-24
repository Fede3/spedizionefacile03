<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Prelievi admin | SpediamoFacile',
	ogTitle: 'Prelievi admin | SpediamoFacile',
	description: 'Approva o rifiuta richieste di prelievo Partner Pro dal pannello admin SpediamoFacile.',
	ogDescription: 'Gestione richieste di prelievo Partner Pro nel pannello admin SpediamoFacile.',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const {
	actionLoading,
	actionMessage,
	showSuccess,
	showError,
	formatCurrency,
	formatDate,
	withdrawalStatusConfig,
} = useAdmin();

const withdrawalsData = ref([]);
const isLoadingWithdrawals = ref(true);
const isRefreshingWithdrawals = ref(false);
const withdrawalsError = ref('');

const rejectNotes = ref('');
const rejectingId = ref(null);

const pendingWithdrawals = computed(() => withdrawalsData.value.filter((withdrawal) => withdrawal.status === 'pending'));
const approvedWithdrawals = computed(() => withdrawalsData.value.filter((withdrawal) => withdrawal.status === 'approved'));
const rejectedWithdrawals = computed(() => withdrawalsData.value.filter((withdrawal) => withdrawal.status === 'rejected'));
const pendingWithdrawalsTotal = computed(() => pendingWithdrawals.value.reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0));
const totalApproved = computed(() => approvedWithdrawals.value.reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0));

const summaryCards = computed(() => [
	{
		key: 'pending',
		label: 'In attesa',
		value: pendingWithdrawals.value.length,
		description: 'Richieste ancora da revisionare.',
		icon: 'pending',
	},
	{
		key: 'pending-value',
		label: 'Totale in attesa',
		value: `EUR ${formatCurrency(pendingWithdrawalsTotal.value)}`,
		description: 'Importo che richiede ancora decisione.',
		icon: 'pending-value',
	},
	{
		key: 'approved',
		label: 'Approvate',
		value: approvedWithdrawals.value.length,
		description: 'Richieste gia autorizzate.',
		icon: 'approved',
	},
	{
		key: 'approved-value',
		label: 'Totale approvato',
		value: `EUR ${formatCurrency(totalApproved.value)}`,
		description: 'Valore complessivo gia erogato.',
		icon: 'approved-value',
	},
]);

const fetchWithdrawals = async ({ showLoader = true } = {}) => {
	if (showLoader) {
		isLoadingWithdrawals.value = true;
	}

	withdrawalsError.value = '';

	try {
		const res = await sanctum('/api/admin/withdrawals');
		withdrawalsData.value = res?.data || res || [];
	} catch (error) {
		withdrawalsData.value = [];
		withdrawalsError.value = error?.response?._data?.message || error?.data?.message || 'Non sono riuscito a caricare i prelievi.';
	} finally {
		isLoadingWithdrawals.value = false;
	}
};

const refreshWithdrawals = async () => {
	isRefreshingWithdrawals.value = true;
	try {
		await fetchWithdrawals({ showLoader: false });
	} finally {
		isRefreshingWithdrawals.value = false;
	}
};

const startReject = (id) => {
	rejectingId.value = id;
	rejectNotes.value = '';
};

const cancelReject = () => {
	rejectingId.value = null;
	rejectNotes.value = '';
};

const approveWithdrawal = async (id) => {
	actionLoading.value = id;

	try {
		await sanctum(`/api/admin/withdrawals/${id}/approve`, { method: 'POST' });
		showSuccess('Prelievo approvato con successo.');
		await fetchWithdrawals({ showLoader: false });
	} catch (error) {
		showError(error, "Errore durante l'approvazione.");
	} finally {
		actionLoading.value = null;
	}
};

const confirmReject = async (id) => {
	actionLoading.value = id;

	try {
		await sanctum(`/api/admin/withdrawals/${id}/reject`, {
			method: 'POST',
			body: { notes: rejectNotes.value },
		});
		showSuccess('Prelievo rifiutato.');
		rejectingId.value = null;
		rejectNotes.value = '';
		await fetchWithdrawals({ showLoader: false });
	} catch (error) {
		showError(error, 'Errore durante il rifiuto.');
	} finally {
		actionLoading.value = null;
	}
};

onMounted(() => {
	fetchWithdrawals();
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Prelievi"
				description="Approva o rifiuta richieste di prelievo Partner Pro da una coda piu chiara e coerente."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Prelievi' },
				]" />

			<AdminActionBanner :message="actionMessage?.text || ''" :tone="actionMessage?.type || ''" />

			<div class="mb-[16px] rounded-[20px] border border-[var(--color-brand-border)] bg-[#f8fafb] px-[18px] py-[16px]">
				<div class="flex flex-col gap-[12px] desktop:flex-row desktop:items-end desktop:justify-between">
					<div class="max-w-[56ch]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.6px] text-[var(--color-brand-text-secondary)]">Coda prelievi</p>
						<h2 class="mt-[4px] text-[1.1rem] font-bold text-[var(--color-brand-text)]">Decisioni in attesa, importi da sbloccare e storico in una sola vista.</h2>
						<p class="mt-[6px] text-[0.9rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
							Prima la coda operativa, poi lo storico: la pagina non deve sembrare un dump di card o un pannello finanza isolato.
						</p>
					</div>
					<div class="flex flex-wrap items-center gap-[8px]">
						<span class="sf-account-meta-pill">{{ pendingWithdrawals.length }} in attesa</span>
						<span class="sf-account-meta-pill sf-account-meta-pill--muted">EUR {{ formatCurrency(pendingWithdrawalsTotal) }}</span>
						<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ rejectedWithdrawals.length }} rifiutati</span>
					</div>
				</div>
			</div>

			<div v-if="isLoadingWithdrawals" class="space-y-[14px]">
				<div class="grid grid-cols-1 gap-[12px] sm:grid-cols-2 desktop:grid-cols-4">
					<div
						v-for="n in 4"
						:key="`withdrawal-stat-${n}`"
						class="animate-pulse rounded-[18px] border border-[var(--color-brand-border)] bg-white px-[16px] py-[16px] shadow-sm">
						<div class="h-[40px] w-[40px] rounded-[14px] bg-[#edf2f4]"></div>
						<div class="mt-[14px] h-[12px] w-[40%] rounded-full bg-[#e7ecef]"></div>
						<div class="mt-[10px] h-[24px] w-[54%] rounded-full bg-[#edf2f4]"></div>
						<div class="mt-[10px] h-[12px] w-[72%] rounded-full bg-[#edf2f4]"></div>
					</div>
				</div>
				<div class="rounded-[22px] border border-[var(--color-brand-border)] bg-white px-[18px] py-[18px] shadow-sm">
					<div class="h-[18px] w-[26%] rounded-full bg-[#e7ecef]"></div>
					<div class="mt-[18px] space-y-[10px]">
						<div v-for="n in 3" :key="`withdrawal-row-${n}`" class="h-[86px] rounded-[18px] bg-[#f7fafb]"></div>
					</div>
				</div>
			</div>

			<div
				v-else-if="withdrawalsError"
				class="rounded-[20px] border border-[rgba(228,66,3,0.18)] bg-[rgba(228,66,3,0.06)] px-[18px] py-[20px]">
				<div class="flex flex-col gap-[10px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div>
						<p class="font-semibold text-[var(--color-brand-text)]">Prelievi non disponibili</p>
						<p class="mt-[4px] text-[0.875rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">{{ withdrawalsError }}</p>
					</div>
					<button type="button" class="btn-secondary btn-compact inline-flex items-center justify-center" @click="fetchWithdrawals">
						Riprova
					</button>
				</div>
			</div>

			<template v-else>
				<div class="mb-[24px] grid grid-cols-1 gap-[12px] sm:grid-cols-2 desktop:grid-cols-4">
					<div
						v-for="card in summaryCards"
						:key="card.key"
						class="rounded-[18px] border border-[var(--color-brand-border)] bg-white px-[16px] py-[16px] shadow-sm">
						<div class="flex items-center gap-[10px]">
							<div class="flex h-[40px] w-[40px] items-center justify-center rounded-[14px] bg-[#edf5f6] text-[var(--color-brand-primary)]">
								<svg
									v-if="card.icon === 'pending'"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[18px] w-[18px]"
									fill="currentColor">
									<path d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
								</svg>
								<svg
									v-else-if="card.icon === 'pending-value'"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[18px] w-[18px]"
									fill="currentColor">
									<path d="M3 6h18v12H3zm9 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0 1.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5M5 8.5A1.5 1.5 0 0 1 6.5 10 1.5 1.5 0 0 1 5 11.5zm14 0A1.5 1.5 0 0 1 20.5 10 1.5 1.5 0 0 1 19 11.5z" />
								</svg>
								<svg
									v-else-if="card.icon === 'approved'"
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[18px] w-[18px]"
									fill="currentColor">
									<path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
								</svg>
								<svg
									v-else
									aria-hidden="true"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[18px] w-[18px]"
									fill="currentColor">
									<path d="M15,18.5C12.49,18.5 10.32,17.08 9.24,15H15L16,13H8.58C8.53,12.67 8.5,12.34 8.5,12C8.5,11.66 8.53,11.33 8.58,11H15L16,9H9.24C10.32,6.92 12.5,5.5 15,5.5C16.61,5.5 18.09,6.09 19.23,7.07L21,5.29C19.41,3.86 17.31,3 15,3C11.08,3 7.76,5.51 6.52,9H3L2,11H6.06C6.02,11.33 6,11.66 6,12C6,12.34 6.02,12.67 6.06,13H3L2,15H6.52C7.76,18.49 11.08,21 15,21C17.31,21 19.41,20.14 21,18.71L19.22,16.93C18.09,17.91 16.62,18.5 15,18.5Z" />
								</svg>
							</div>
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.55px] text-[var(--color-brand-text-secondary)]">{{ card.label }}</p>
						</div>
						<p class="mt-[14px] text-[1.875rem] font-black leading-none text-[var(--color-brand-text)]">{{ card.value }}</p>
						<p class="mt-[10px] text-[0.875rem] leading-[1.5] text-[var(--color-brand-text-secondary)]">{{ card.description }}</p>
					</div>
				</div>

				<div class="overflow-hidden rounded-[24px] border border-[var(--color-brand-border)] bg-white px-[18px] py-[18px] shadow-sm tablet:px-[22px] tablet:py-[22px]">
					<div class="flex flex-col gap-[16px] border-b border-[var(--color-brand-border)] pb-[16px] desktop:flex-row desktop:items-end desktop:justify-between">
						<div class="max-w-[56ch]">
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.6px] text-[var(--color-brand-text-secondary)]">Elenco operativo</p>
							<h2 class="mt-[4px] text-[1.2rem] font-bold text-[var(--color-brand-text)]">Richieste prelievo</h2>
							<p class="mt-[8px] text-[0.9375rem] leading-[1.6] text-[var(--color-brand-text-secondary)]">
								Leggi stato, importo e note di verifica in una coda unica, con azioni approva o rifiuta solo quando servono davvero.
							</p>
						</div>
						<div class="flex flex-wrap items-center gap-[8px]">
							<span class="sf-account-meta-pill">{{ pendingWithdrawals.length }} in attesa</span>
							<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ approvedWithdrawals.length }} approvate</span>
							<button
								type="button"
								class="btn-secondary btn-compact"
								:disabled="isRefreshingWithdrawals"
								@click="refreshWithdrawals">
								{{ isRefreshingWithdrawals ? 'Aggiornamento...' : 'Aggiorna dati' }}
							</button>
						</div>
					</div>

					<div v-if="!withdrawalsData.length" class="py-[26px]">
						<div class="rounded-[22px] border border-[var(--color-brand-border)] bg-[#f8fafb] px-[18px] py-[28px] text-center">
							<svg
								aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								class="mx-auto mb-[12px] h-[42px] w-[42px] text-[var(--color-brand-text-muted)]"
								fill="currentColor">
								<path d="M2,5H22V7H2V5M15,10H22V12H15V10M15,16H22V18H15V16M2,10H13L8,15H2V10M2,16H8L13,21H2V16Z" />
							</svg>
							<p class="text-[1rem] font-semibold text-[var(--color-brand-text)]">Nessuna richiesta di prelievo presente.</p>
							<p class="mt-[6px] text-[0.875rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
								Quando arriva una nuova richiesta, qui trovi importo, profilo utente e decisione operativa nello stesso blocco.
							</p>
						</div>
					</div>

					<div v-else class="space-y-[12px] pt-[18px]">
						<article
							v-for="withdrawal in withdrawalsData"
							:key="withdrawal.id"
							class="rounded-[20px] border bg-[#fbfcfd] px-[18px] py-[16px]"
							:class="withdrawal.status === 'pending' ? 'border-[rgba(228,66,3,0.16)]' : 'border-[var(--color-brand-border)]'">
							<div class="flex flex-col gap-[14px] desktop:flex-row desktop:items-start desktop:justify-between">
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-[8px]">
										<span class="text-[1.05rem] font-semibold text-[var(--color-brand-text)]">
											{{ withdrawal.user?.name }} {{ withdrawal.user?.surname }}
										</span>
										<span
											class="inline-flex items-center rounded-full px-[10px] py-[4px] text-[0.6875rem] font-medium"
											:class="[
												withdrawalStatusConfig[withdrawal.status]?.bg || 'bg-gray-50',
												withdrawalStatusConfig[withdrawal.status]?.text || 'text-gray-700',
											]">
											{{ withdrawalStatusConfig[withdrawal.status]?.label || withdrawal.status }}
										</span>
									</div>
									<p class="mt-[4px] text-[0.85rem] text-[var(--color-brand-text-secondary)]">{{ withdrawal.user?.email || 'Email non disponibile' }}</p>
									<div class="mt-[12px] grid grid-cols-1 gap-[10px] tablet:grid-cols-3">
										<div class="rounded-[14px] border border-[var(--color-brand-border)] bg-white px-[12px] py-[10px]">
											<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[var(--color-brand-text-secondary)]">Importo</p>
											<p class="mt-[4px] text-[0.95rem] font-semibold text-[var(--color-brand-text)]">EUR {{ formatCurrency(withdrawal.amount) }}</p>
										</div>
										<div class="rounded-[14px] border border-[var(--color-brand-border)] bg-white px-[12px] py-[10px]">
											<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[var(--color-brand-text-secondary)]">Richiesto</p>
											<p class="mt-[4px] text-[0.95rem] font-medium text-[var(--color-brand-text)]">{{ formatDate(withdrawal.created_at) }}</p>
										</div>
										<div class="rounded-[14px] border border-[var(--color-brand-border)] bg-white px-[12px] py-[10px]">
											<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[var(--color-brand-text-secondary)]">ID richiesta</p>
											<p class="mt-[4px] text-[0.95rem] font-medium text-[var(--color-brand-text)]">#{{ withdrawal.id }}</p>
										</div>
									</div>
									<p
										v-if="withdrawal.admin_notes"
										class="mt-[10px] rounded-[14px] border border-[var(--color-brand-border)] bg-white px-[12px] py-[10px] text-[0.8125rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
										<span class="font-semibold text-[var(--color-brand-text)]">Note verifica:</span>
										{{ withdrawal.admin_notes }}
									</p>
								</div>

								<div
									v-if="withdrawal.status === 'pending'"
									class="flex w-full flex-col gap-[8px] desktop:w-auto desktop:min-w-[240px] desktop:items-end">
									<template v-if="rejectingId !== withdrawal.id">
										<button
											type="button"
											class="w-full rounded-full bg-[#047857] px-[16px] py-[10px] text-[0.8125rem] font-semibold text-white transition-colors hover:bg-[#065F46] desktop:w-auto"
											:disabled="actionLoading === withdrawal.id"
											@click="approveWithdrawal(withdrawal.id)">
											{{ actionLoading === withdrawal.id ? 'Approvazione...' : 'Approva prelievo' }}
										</button>
										<button
											type="button"
											class="w-full rounded-full border border-[rgba(228,66,3,0.18)] bg-[rgba(228,66,3,0.05)] px-[16px] py-[10px] text-[0.8125rem] font-semibold text-[var(--color-brand-secondary)] transition-colors hover:bg-[rgba(228,66,3,0.08)] desktop:w-auto"
											:disabled="actionLoading === withdrawal.id"
											@click="startReject(withdrawal.id)">
											Rifiuta prelievo
										</button>
									</template>

									<template v-else>
										<div class="w-full rounded-[16px] border border-[var(--color-brand-border)] bg-white p-[12px]">
											<input
												v-model="rejectNotes"
												type="text"
												placeholder="Motivo del rifiuto (opzionale)"
												class="form-input mb-[10px]" />
											<div class="flex flex-col gap-[8px] desktop:flex-row">
												<button
													type="button"
													class="rounded-full bg-[#DC2626] px-[14px] py-[9px] text-[0.8125rem] font-semibold text-white transition-colors hover:bg-[#B91C1C]"
													:disabled="actionLoading === withdrawal.id"
													@click="confirmReject(withdrawal.id)">
													{{ actionLoading === withdrawal.id ? 'Invio...' : 'Conferma rifiuto' }}
												</button>
												<button
													type="button"
													class="rounded-full border border-[var(--color-brand-border)] bg-white px-[14px] py-[9px] text-[0.8125rem] font-semibold text-[var(--color-brand-text)] transition-colors hover:bg-[#F5F6F8]"
													@click="cancelReject">
													Annulla
												</button>
											</div>
										</div>
									</template>
								</div>
							</div>
						</article>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
