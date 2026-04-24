<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Reclami admin | SpediamoFacile',
	ogTitle: 'Reclami admin | SpediamoFacile',
	description: 'Gestisci i reclami post-vendita aperti dai clienti dal pannello admin SpediamoFacile.',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();

const claims = ref([]);
const loading = ref(true);
const loadError = ref('');
const feedback = ref('');
const feedbackType = ref('success');

const statusFilter = ref('all');
const typeFilter = ref('all');
const search = ref('');

const selected = ref(null);
const saving = ref(false);

const editForm = reactive({
	status: '',
	resolution_notes: '',
});

const fetchClaims = async () => {
	loading.value = true;
	loadError.value = '';
	try {
		const params = new URLSearchParams();
		if (statusFilter.value !== 'all') params.set('status', statusFilter.value);
		if (typeFilter.value !== 'all') params.set('claim_type', typeFilter.value);
		if (search.value.trim()) params.set('search', search.value.trim());
		params.set('per_page', '50');
		const res = await sanctum(`/api/admin/claims?${params.toString()}`, { method: 'GET' });
		const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
		claims.value = list;
	} catch (error) {
		loadError.value = error?.response?._data?.message || error?.data?.message || 'Impossibile caricare i reclami.';
	} finally {
		loading.value = false;
	}
};

onMounted(fetchClaims);

watch([statusFilter, typeFilter], () => {
	fetchClaims();
});

let searchTimer = null;
watch(search, () => {
	if (searchTimer) clearTimeout(searchTimer);
	searchTimer = setTimeout(fetchClaims, 300);
});

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

const openDetail = async (claim) => {
	// Fetch full detail
	try {
		const res = await sanctum(`/api/admin/claims/${claim.id}`, { method: 'GET' });
		selected.value = res?.data || res;
	} catch (error) {
		selected.value = claim;
	}
	editForm.status = selected.value?.status || 'open';
	editForm.resolution_notes = selected.value?.resolution_notes || '';
};

const closeDetail = () => {
	selected.value = null;
	editForm.status = '';
	editForm.resolution_notes = '';
};

const submitUpdate = async () => {
	if (!selected.value) return;
	saving.value = true;
	feedback.value = '';
	try {
		const res = await sanctum(`/api/admin/claims/${selected.value.id}`, {
			method: 'PATCH',
			body: {
				status: editForm.status,
				resolution_notes: editForm.resolution_notes || null,
			},
		});
		feedback.value = 'Reclamo aggiornato con successo.';
		feedbackType.value = 'success';
		await fetchClaims();
		selected.value = res?.data || res || selected.value;
	} catch (error) {
		feedback.value = error?.response?._data?.message || error?.data?.message || 'Impossibile aggiornare il reclamo.';
		feedbackType.value = 'error';
	} finally {
		saving.value = false;
	}
};

const summaryItems = computed(() => {
	const total = claims.value.length;
	const open = claims.value.filter((c) => c.status === 'open').length;
	const inReview = claims.value.filter((c) => c.status === 'in_review').length;
	const resolved = claims.value.filter((c) => c.status === 'resolved').length;
	return [
		{ key: 'total', label: 'Totale reclami', value: String(total), meta: 'Con filtri applicati' },
		{ key: 'open', label: 'Aperti', value: String(open), meta: open ? 'Da prendere in carico' : 'Nessuno in attesa' },
		{ key: 'review', label: 'In revisione', value: String(inReview), meta: inReview ? 'In valutazione' : 'Coda vuota' },
		{ key: 'resolved', label: 'Risolti', value: String(resolved), meta: 'Chiusi correttamente' },
	];
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Reclami"
				description="Gestisci i reclami post-vendita aperti dai clienti con filtri e dettaglio."
				back-to="/account/amministrazione"
				back-label="Torna al pannello admin"
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Amministrazione', to: '/account/amministrazione' }, { label: 'Reclami' }]" />

			<div
				v-if="loadError || feedback"
				:class="['mb-[16px] ux-alert', (loadError || feedbackType === 'error') ? 'ux-alert--critical' : 'ux-alert--success']">
				<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="ux-alert__icon shrink-0" fill="currentColor">
					<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
				</svg>
				<span>{{ loadError || feedback }}</span>
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
						<p class="text-[0.7rem] font-semibold uppercase tracking-[1px] text-[var(--color-brand-primary)]">Coda reclami</p>
						<h2 class="sf-account-section__title">Filtra e gestisci</h2>
						<p class="sf-account-section__description">Clicca un reclamo per vedere dettagli e aggiornarne lo stato.</p>
					</div>
					<button type="button" class="btn-secondary btn-compact inline-flex items-center justify-center gap-[6px]" @click="fetchClaims">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
							<path d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.57,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z" />
						</svg>
						Aggiorna
					</button>
				</div>

				<div class="sf-account-section__body">
					<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-center mb-[16px]">
						<div class="flex-1">
							<label class="block text-[0.75rem] font-[700] uppercase tracking-[0.8px] text-[var(--color-brand-primary)] mb-[4px]">Cerca</label>
							<input
								v-model="search"
								type="text"
								placeholder="ID reclamo, ordine o email utente..."
								class="w-full rounded-[10px] border border-[rgba(9,88,102,0.18)] bg-white px-[12px] py-[8px] text-[0.875rem] focus:border-[var(--color-brand-primary)] focus:outline-none" />
						</div>
						<div>
							<label class="block text-[0.75rem] font-[700] uppercase tracking-[0.8px] text-[var(--color-brand-primary)] mb-[4px]">Stato</label>
							<select
								v-model="statusFilter"
								class="rounded-[10px] border border-[rgba(9,88,102,0.18)] bg-white px-[12px] py-[8px] text-[0.875rem] focus:border-[var(--color-brand-primary)] focus:outline-none">
								<option value="all">Tutti</option>
								<option value="open">Aperto</option>
								<option value="in_review">In revisione</option>
								<option value="resolved">Risolto</option>
								<option value="rejected">Respinto</option>
							</select>
						</div>
						<div>
							<label class="block text-[0.75rem] font-[700] uppercase tracking-[0.8px] text-[var(--color-brand-primary)] mb-[4px]">Tipo</label>
							<select
								v-model="typeFilter"
								class="rounded-[10px] border border-[rgba(9,88,102,0.18)] bg-white px-[12px] py-[8px] text-[0.875rem] focus:border-[var(--color-brand-primary)] focus:outline-none">
								<option value="all">Tutti</option>
								<option value="damage">Danno</option>
								<option value="loss">Smarrimento</option>
								<option value="delay">Ritardo</option>
								<option value="wrong_delivery">Consegna errata</option>
								<option value="other">Altro</option>
							</select>
						</div>
					</div>

					<div v-if="loading" class="rounded-[16px] bg-[#F5F6F9] px-[18px] py-[20px] text-center">
						<p class="text-[0.9375rem] font-semibold text-[var(--color-brand-text)]">Caricamento reclami...</p>
					</div>

					<div v-else-if="!claims.length" class="rounded-[16px] bg-[#F5F6F9] px-[18px] py-[22px] text-center">
						<p class="text-[0.9375rem] font-semibold text-[var(--color-brand-text)]">Nessun reclamo trovato</p>
						<p class="mx-auto mt-[6px] max-w-[520px] text-[0.8125rem] leading-[1.6] text-[var(--color-brand-text-secondary)]">
							Prova a cambiare i filtri o aggiorna la lista.
						</p>
					</div>

					<div v-else class="space-y-[8px]">
						<article
							v-for="claim in claims"
							:key="claim.id"
							class="rounded-[16px] border border-[rgba(9,88,102,0.08)] bg-white px-[16px] py-[14px] transition-all hover:bg-[#FBFCFD] cursor-pointer"
							@click="openDetail(claim)">
							<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-center tablet:justify-between">
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
										<span v-if="claim.attachments?.length" class="sf-account-meta-pill sf-account-meta-pill--muted">
											{{ claim.attachments.length }} allegat{{ claim.attachments.length === 1 ? 'o' : 'i' }}
										</span>
									</div>
									<h3 class="font-montserrat text-[0.9375rem] font-[800] text-[var(--color-brand-text)]">
										{{ typeLabel(claim.claim_type) }} — Ordine #{{ claim.order_id }}
									</h3>
									<p class="text-[0.8125rem] leading-[1.55] text-[var(--color-brand-text-secondary)] line-clamp-2">
										{{ claim.description }}
									</p>
									<div class="text-[0.6875rem] font-medium text-[var(--color-brand-text-muted)]">
										<span v-if="claim.user">{{ claim.user.name }} {{ claim.user.surname }} · {{ claim.user.email }} · </span>
										<span>Aperto il {{ formatDate(claim.created_at) }}</span>
									</div>
								</div>
								<div class="shrink-0">
									<span class="btn-secondary btn-compact inline-flex items-center justify-center gap-[6px]">
										Gestisci
										<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[14px] w-[14px]" fill="currentColor">
											<path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
										</svg>
									</span>
								</div>
							</div>
						</article>
					</div>
				</div>
			</section>
		</div>

		<!-- Detail Modal -->
		<div v-if="selected" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-[16px]" @click.self="closeDetail">
			<div class="relative max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-[18px] bg-white shadow-2xl">
				<div class="sticky top-0 flex items-center justify-between border-b border-[rgba(9,88,102,0.08)] bg-white px-[20px] py-[14px] z-10">
					<div>
						<h3 class="font-montserrat text-[1rem] font-[800] text-[var(--color-brand-text)]">Reclamo #R{{ selected.id }}</h3>
						<p class="text-[0.75rem] text-[var(--color-brand-text-muted)]">{{ typeLabel(selected.claim_type) }} · Ordine #{{ selected.order_id }}</p>
					</div>
					<button
						type="button"
						class="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F5F6F9] hover:bg-[#EEF6F8] transition-colors"
						aria-label="Chiudi dettaglio"
						@click="closeDetail">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="currentColor">
							<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
						</svg>
					</button>
				</div>

				<div class="px-[20px] py-[16px] space-y-[16px]">
					<div>
						<h4 class="text-[0.75rem] font-[700] uppercase tracking-[0.8px] text-[var(--color-brand-primary)] mb-[4px]">Cliente</h4>
						<p class="text-[0.875rem] text-[var(--color-brand-text)]">
							<span v-if="selected.user">{{ selected.user.name }} {{ selected.user.surname }} — {{ selected.user.email }}</span>
							<span v-else>—</span>
						</p>
					</div>

					<div>
						<h4 class="text-[0.75rem] font-[700] uppercase tracking-[0.8px] text-[var(--color-brand-primary)] mb-[4px]">Descrizione</h4>
						<p class="text-[0.875rem] leading-[1.55] text-[var(--color-brand-text)] whitespace-pre-line bg-[#F5F6F9] rounded-[10px] px-[12px] py-[10px]">{{ selected.description }}</p>
					</div>

					<div v-if="selected.attachments?.length">
						<h4 class="text-[0.75rem] font-[700] uppercase tracking-[0.8px] text-[var(--color-brand-primary)] mb-[6px]">Allegati ({{ selected.attachments.length }})</h4>
						<div class="flex flex-wrap gap-[8px]">
							<a
								v-for="att in selected.attachments"
								:key="att.id"
								:href="att.download_url"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-[6px] rounded-[10px] border border-[rgba(9,88,102,0.15)] bg-[#FBFCFD] px-[10px] py-[6px] text-[0.75rem] text-[var(--color-brand-text)] transition-colors hover:bg-[#EEF6F8]">
								<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[14px] w-[14px]" fill="currentColor">
									<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
								</svg>
								<span class="truncate max-w-[180px]">{{ att.original_name }}</span>
							</a>
						</div>
					</div>

					<div class="border-t border-[rgba(9,88,102,0.08)] pt-[14px] space-y-[12px]">
						<h4 class="text-[0.75rem] font-[700] uppercase tracking-[0.8px] text-[var(--color-brand-primary)]">Aggiorna stato</h4>
						<div>
							<label class="block text-[0.8125rem] font-[600] text-[var(--color-brand-text)] mb-[4px]">Stato</label>
							<select
								v-model="editForm.status"
								class="w-full rounded-[10px] border border-[rgba(9,88,102,0.18)] bg-white px-[12px] py-[8px] text-[0.875rem] focus:border-[var(--color-brand-primary)] focus:outline-none">
								<option value="open">Aperto</option>
								<option value="in_review">In revisione</option>
								<option value="resolved">Risolto</option>
								<option value="rejected">Respinto</option>
							</select>
						</div>
						<div>
							<label class="block text-[0.8125rem] font-[600] text-[var(--color-brand-text)] mb-[4px]">Note di risoluzione (visibili al cliente)</label>
							<textarea
								v-model="editForm.resolution_notes"
								rows="4"
								placeholder="Descrivi la soluzione applicata o i prossimi passi..."
								class="w-full rounded-[10px] border border-[rgba(9,88,102,0.18)] bg-white px-[12px] py-[8px] text-[0.875rem] focus:border-[var(--color-brand-primary)] focus:outline-none resize-y"></textarea>
						</div>

						<div class="flex flex-col gap-[8px] tablet:flex-row tablet:justify-end">
							<button type="button" class="btn-secondary btn-compact" @click="closeDetail" :disabled="saving">Annulla</button>
							<button type="button" class="btn-cta btn-compact" @click="submitUpdate" :disabled="saving">
								{{ saving ? 'Salvataggio...' : 'Salva aggiornamento' }}
							</button>
						</div>

						<p class="text-[0.6875rem] text-[var(--color-brand-text-muted)]">
							Passando lo stato a "Risolto" o "Respinto" il cliente riceverà una email automatica con le note inserite.
						</p>
					</div>

					<div class="text-[0.6875rem] text-[var(--color-brand-text-muted)] border-t border-[rgba(9,88,102,0.08)] pt-[10px]">
						Aperto il {{ formatDate(selected.created_at) }}
						<span v-if="selected.resolved_at"> · Risolto il {{ formatDate(selected.resolved_at) }}</span>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
