<script setup>
definePageMeta({
	middleware: ['app-auth'],
});

useSeoMeta({
	title: 'I miei reclami | SpediamoFacile',
	ogTitle: 'I miei reclami | SpediamoFacile',
	description: 'Storico dei reclami aperti sulle tue spedizioni SpediamoFacile.',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();

const claims = ref([]);
const loading = ref(true);
const loadError = ref('');
const expandedId = ref(null);

const fetchClaims = async () => {
	loading.value = true;
	loadError.value = '';
	try {
		const res = await sanctum('/api/claims', { method: 'GET' });
		const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
		claims.value = list;
	} catch (error) {
		loadError.value = error?.response?._data?.message || error?.data?.message || 'Impossibile caricare i reclami.';
	} finally {
		loading.value = false;
	}
};

onMounted(fetchClaims);

const typeLabel = (type) => {
	const labels = {
		damage: 'Danno',
		loss: 'Smarrimento',
		delay: 'Ritardo',
		wrong_delivery: 'Consegna errata',
		other: 'Altro',
	};
	return labels[type] || 'Reclamo';
};

const statusLabel = (status) => {
	const labels = {
		open: 'Aperto',
		in_review: 'In revisione',
		resolved: 'Risolto',
		rejected: 'Respinto',
	};
	return labels[status] || status;
};

const statusChipStyle = (status) => {
	switch (status) {
		case 'open':
			return { background: '#FFF1E8', color: '#B45309', border: '1px solid rgba(228,66,3,0.3)' };
		case 'in_review':
			return { background: '#EEF6F8', color: '#095866', border: '1px solid rgba(9,88,102,0.3)' };
		case 'resolved':
			return { background: '#E9F7EC', color: '#1F7A3A', border: '1px solid rgba(31,122,58,0.3)' };
		case 'rejected':
			return { background: '#FCEBEB', color: '#B02525', border: '1px solid rgba(176,37,37,0.3)' };
		default:
			return { background: '#F5F6F9', color: '#444', border: '1px solid rgba(0,0,0,0.08)' };
	}
};

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

const toggleExpand = (id) => {
	expandedId.value = expandedId.value === id ? null : id;
};

const summaryItems = computed(() => {
	const total = claims.value.length;
	const open = claims.value.filter((c) => ['open', 'in_review'].includes(c.status)).length;
	const resolved = claims.value.filter((c) => c.status === 'resolved').length;
	return [
		{ key: 'total', label: 'Reclami totali', value: String(total), meta: total ? 'Storico completo' : 'Nessun reclamo aperto' },
		{ key: 'open', label: 'In gestione', value: String(open), meta: open ? 'Li stiamo gestendo' : 'Tutto sotto controllo' },
		{ key: 'resolved', label: 'Risolti', value: String(resolved), meta: resolved ? 'Completati' : 'Ancora nessuno' },
	];
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[20px] tablet:py-[24px] desktop:py-[28px]">
		<div class="my-container">
			<AccountPageHeader
				title="I miei reclami"
				description="Controlla lo stato dei reclami aperti sulle tue spedizioni e apri nuovi ticket quando serve."
				current="Reclami">
			</AccountPageHeader>

			<div
				v-if="loadError"
				class="mb-[16px] ux-alert ux-alert--critical">
				<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="ux-alert__icon shrink-0" fill="currentColor">
					<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
				</svg>
				<span>{{ loadError }}</span>
			</div>

			<div class="sf-account-summary-strip mb-[20px] sf-animate-in sf-animate-in-1">
				<div v-for="item in summaryItems" :key="item.key" class="sf-account-summary-item">
					<div class="sf-account-summary-item__icon">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[15px] w-[15px]" fill="currentColor" style="color: var(--color-brand-primary);">
							<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
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
						<p class="text-[0.7rem] font-semibold uppercase tracking-[1px] text-[var(--color-brand-primary)]">Storico reclami</p>
						<h2 class="sf-account-section__title">Tutti i tuoi ticket</h2>
						<p class="sf-account-section__description">
							Espandi un reclamo per vedere dettagli, allegati e note di risoluzione.
						</p>
					</div>
					<NuxtLink to="/reclami" class="btn-cta btn-compact inline-flex items-center justify-center gap-[6px]">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
							<path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
						</svg>
						Apri nuovo reclamo
					</NuxtLink>
				</div>
				<div class="sf-account-section__body">
					<!-- Loading: 3 card skeleton unificate via SfSkeleton -->
					<div v-if="loading" class="space-y-[10px]" aria-busy="true" aria-live="polite">
						<div
							v-for="n in 3"
							:key="n"
							class="rounded-[16px] border border-[rgba(9,88,102,0.08)] bg-white px-[16px] py-[14px]">
							<SfSkeleton variant="text-block" />
						</div>
					</div>

					<!-- Empty state — pattern sf-empty-state condiviso sitewide -->
					<div v-else-if="!claims.length" class="sf-empty-state" role="status">
						<div class="sf-empty-state__icon" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
								<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
							</svg>
						</div>
						<h3 class="sf-empty-state__title">Nessun reclamo aperto</h3>
						<p class="sf-empty-state__copy">
							Quando aprirai un reclamo su una spedizione lo troverai qui con lo stato sempre aggiornato.
						</p>
						<NuxtLink to="/reclami" class="sf-empty-state__cta" aria-label="Apri il tuo primo reclamo">
							<span>Apri il tuo primo reclamo</span>
							<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
								<path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>
							</svg>
						</NuxtLink>
					</div>

					<div v-else class="space-y-[10px]">
						<article
							v-for="claim in claims"
							:key="claim.id"
							class="rounded-[16px] border border-[rgba(9,88,102,0.08)] bg-white px-[16px] py-[14px] transition-all hover:bg-[#FBFCFD]">
							<button
								type="button"
								class="flex w-full flex-col gap-[10px] text-left tablet:flex-row tablet:items-center tablet:justify-between"
								@click="toggleExpand(claim.id)">
								<div class="min-w-0 space-y-[6px]">
									<div class="flex flex-wrap items-center gap-[6px]">
										<span
											class="inline-flex items-center rounded-full px-[10px] py-[3px] text-[0.6875rem] font-semibold"
											:style="statusChipStyle(claim.status)">
											{{ statusLabel(claim.status) }}
										</span>
										<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ typeLabel(claim.claim_type) }}</span>
										<span class="sf-account-meta-pill sf-account-meta-pill--muted">Ordine #{{ claim.order_id }}</span>
										<span class="sf-account-meta-pill sf-account-meta-pill--muted">#R{{ claim.id }}</span>
									</div>
									<h3 class="font-montserrat text-[0.9375rem] font-[800] text-[var(--color-brand-text)]">
										{{ typeLabel(claim.claim_type) }} — Ordine #{{ claim.order_id }}
									</h3>
									<p class="max-w-[78ch] text-[0.8125rem] leading-[1.55] text-[var(--color-brand-text-secondary)] line-clamp-2">
										{{ claim.description }}
									</p>
									<div class="text-[0.6875rem] font-medium text-[var(--color-brand-text-muted)]">
										Aperto il {{ formatDate(claim.created_at) }}
									</div>
								</div>
								<div class="flex shrink-0 items-center gap-[8px]">
									<span class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">{{ expandedId === claim.id ? 'Chiudi' : 'Dettagli' }}</span>
									<svg
										aria-hidden="true"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										class="h-[16px] w-[16px] transition-transform"
										:class="{ 'rotate-180': expandedId === claim.id }"
										fill="currentColor">
										<path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
									</svg>
								</div>
							</button>

							<div v-if="expandedId === claim.id" class="mt-[14px] border-t border-[rgba(9,88,102,0.08)] pt-[14px] space-y-[12px]">
								<div>
									<h4 class="text-[0.75rem] font-[700] uppercase tracking-[0.8px] text-[var(--color-brand-primary)] mb-[4px]">Descrizione</h4>
									<p class="text-[0.875rem] leading-[1.55] text-[var(--color-brand-text)] whitespace-pre-line">{{ claim.description }}</p>
								</div>

								<div v-if="claim.attachments?.length">
									<h4 class="text-[0.75rem] font-[700] uppercase tracking-[0.8px] text-[var(--color-brand-primary)] mb-[6px]">Allegati ({{ claim.attachments.length }})</h4>
									<div class="flex flex-wrap gap-[8px]">
										<a
											v-for="att in claim.attachments"
											:key="att.id"
											:href="att.download_url"
											target="_blank"
											rel="noopener noreferrer"
											class="inline-flex items-center gap-[6px] rounded-[10px] border border-[rgba(9,88,102,0.15)] bg-[#FBFCFD] px-[10px] py-[6px] text-[0.75rem] text-[var(--color-brand-text)] transition-colors hover:bg-[#EEF6F8]">
											<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[14px] w-[14px]" fill="currentColor">
												<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
											</svg>
											<span class="truncate max-w-[160px]">{{ att.original_name }}</span>
										</a>
									</div>
								</div>

								<div v-if="claim.resolution_notes">
									<h4 class="text-[0.75rem] font-[700] uppercase tracking-[0.8px] text-[var(--color-brand-primary)] mb-[4px]">Risposta del supporto</h4>
									<p class="text-[0.875rem] leading-[1.55] text-[var(--color-brand-text)] whitespace-pre-line bg-[#F5F6F9] rounded-[10px] px-[12px] py-[10px]">{{ claim.resolution_notes }}</p>
									<p v-if="claim.resolved_at" class="mt-[4px] text-[0.6875rem] text-[var(--color-brand-text-muted)]">Risolto il {{ formatDate(claim.resolved_at) }}</p>
								</div>
							</div>
						</article>
					</div>
				</div>
			</section>
		</div>
	</section>
</template>
