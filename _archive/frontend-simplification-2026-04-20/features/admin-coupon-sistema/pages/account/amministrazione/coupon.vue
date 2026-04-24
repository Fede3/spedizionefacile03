<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Coupon admin | SpediamoFacile',
	ogTitle: 'Coupon admin | SpediamoFacile',
	description: 'Gestisci coupon, sconti e codici promozionali dal pannello admin SpediamoFacile.',
	ogDescription: 'Creazione e gestione coupon nel pannello admin SpediamoFacile.',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const { actionMessage, showSuccess, showError } = useAdmin();

const isLoading = ref(true);
const coupons = ref([]);
const activeCoupons = computed(() => coupons.value.filter((coupon) => coupon.active));
const inactiveCoupons = computed(() => coupons.value.filter((coupon) => !coupon.active));
const averageDiscount = computed(() =>
	coupons.value.length ? Math.round(coupons.value.reduce((sum, coupon) => sum + Number(coupon.percentage || 0), 0) / coupons.value.length) : 0
);

// Form nuovo coupon
const showForm = ref(false);
const formSaving = ref(false);
const editingId = ref(null);
const form = ref({ code: '', percentage: '', active: true });

const fetchCoupons = async () => {
	isLoading.value = true;
	try {
		const res = await sanctum('/api/admin/coupons');
		coupons.value = res?.data || [];
	} catch (e) {
		coupons.value = [];
	} finally {
		isLoading.value = false;
	}
};

const resetForm = () => {
	form.value = { code: '', percentage: '', active: true };
	editingId.value = null;
	showForm.value = false;
};

const openCreate = () => {
	resetForm();
	showForm.value = true;
};

const openEdit = (coupon) => {
	editingId.value = coupon.id;
	form.value = {
		code: coupon.code,
		percentage: coupon.percentage,
		active: coupon.active ? true : false,
	};
	showForm.value = true;
};

const saveCoupon = async () => {
	if (!form.value.code.trim() || !form.value.percentage) return;

	// Validate percentage range
	const percentage = Number(form.value.percentage);
	if (isNaN(percentage) || percentage < 0 || percentage > 100) {
		showError(null, 'La percentuale deve essere tra 0 e 100.');
		return;
	}

	formSaving.value = true;
	try {
		if (editingId.value) {
			await sanctum(`/api/admin/coupons/${editingId.value}`, {
				method: 'PUT',
				body: {
					code: form.value.code,
					percentage: percentage,
					active: form.value.active,
				},
			});
			showSuccess('Coupon aggiornato con successo.');
		} else {
			await sanctum('/api/admin/coupons', {
				method: 'POST',
				body: {
					code: form.value.code,
					percentage: percentage,
					active: form.value.active,
				},
			});
			showSuccess('Coupon creato con successo.');
		}
		resetForm();
		await fetchCoupons();
	} catch (e) {
		showError(e, 'Errore nel salvataggio del coupon.');
	} finally {
		formSaving.value = false;
	}
};

const toggleActive = async (coupon) => {
	const newStatus = !coupon.active;
	try {
		await sanctum(`/api/admin/coupons/${coupon.id}`, {
			method: 'PUT',
			body: { active: newStatus },
		});
		await fetchCoupons();
	} catch (e) {
		showError(e, 'Errore nel cambio stato.');
	}
};

const showDeleteConfirm = ref(false);
const deleteTargetId = ref(null);
const deleteLoading = ref(false);

const askDelete = (id) => {
	deleteTargetId.value = id;
	showDeleteConfirm.value = true;
};

const confirmDelete = async () => {
	deleteLoading.value = true;
	try {
		await sanctum(`/api/admin/coupons/${deleteTargetId.value}`, { method: 'DELETE' });
		showSuccess('Coupon eliminato.');
		showDeleteConfirm.value = false;
		deleteTargetId.value = null;
		await fetchCoupons();
	} catch (e) {
		showError(e, "Errore nell'eliminazione.");
	} finally {
		deleteLoading.value = false;
	}
};

onMounted(() => {
	fetchCoupons();
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container sf-stack-section">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Coupon"
				description="Codici sconto, attivazione e modifica dalla console promozioni."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Coupon' },
				]"
				back-to="/account/amministrazione"
				back-label="Torna all'amministrazione" />

			<AdminActionBanner :message="actionMessage?.text || ''" :tone="actionMessage?.type || ''" />

			<!-- KPI Grid -->
			<div class="grid grid-cols-2 tablet:grid-cols-4 gap-[14px] mb-[20px]">
				<div class="rounded-[18px] p-[18px] bg-white ring-[1px] ring-[#DFE2E7]" style="box-shadow: 0 2px 12px rgba(9,88,102,0.08)">
					<div class="flex flex-col items-start gap-[10px]">
						<div class="w-[36px] h-[36px] rounded-[10px] bg-[#F0F7F8] flex items-center justify-center">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[var(--color-brand-primary)]" fill="currentColor">
								<path d="M5.5,9A1.5,1.5 0 0,0 7,7.5A1.5,1.5 0 0,0 5.5,6A1.5,1.5 0 0,0 4,7.5A1.5,1.5 0 0,0 5.5,9M17.41,11.58C17.77,11.94 18,12.44 18,13C18,13.55 17.78,14.05 17.41,14.41L12.41,19.41C12.05,19.77 11.55,20 11,20C10.45,20 9.95,19.78 9.58,19.41L2.59,12.42C2.22,12.05 2,11.55 2,11V6C2,4.89 2.89,4 4,4H9C9.55,4 10.05,4.22 10.41,4.58L17.41,11.58M13.54,5.71L14.54,4.71L21.41,11.58C21.78,11.94 22,12.45 22,13C22,13.55 21.78,14.05 21.42,14.41L16.04,19.79L15.04,18.79L20.75,13L13.54,5.71Z" />
							</svg>
						</div>
						<div>
							<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[var(--color-brand-text-muted)] mb-[2px]">Totale</p>
							<p class="text-[1.5rem] font-bold text-[var(--color-brand-text)] leading-tight">{{ coupons.length }}</p>
						</div>
					</div>
				</div>
				<div class="rounded-[18px] p-[18px] bg-white ring-[1px] ring-[#DFE2E7]" style="box-shadow: 0 2px 12px rgba(9,88,102,0.08)">
					<div class="flex flex-col items-start gap-[10px]">
						<div class="w-[36px] h-[36px] rounded-[10px] bg-[#ECFDF3] flex items-center justify-center">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#047857]" fill="currentColor">
								<path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
							</svg>
						</div>
						<div>
							<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[var(--color-brand-text-muted)] mb-[2px]">Attivi</p>
							<p class="text-[1.5rem] font-bold text-[#047857] leading-tight">{{ activeCoupons.length }}</p>
						</div>
					</div>
				</div>
				<div class="rounded-[18px] p-[18px] bg-white ring-[1px] ring-[#DFE2E7]" style="box-shadow: 0 2px 12px rgba(9,88,102,0.08)">
					<div class="flex flex-col items-start gap-[10px]">
						<div class="w-[36px] h-[36px] rounded-[10px] bg-[#eef7f8] flex items-center justify-center">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[var(--color-brand-primary)]" fill="currentColor">
								<path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,13.85 4.63,15.55 5.68,16.91L16.91,5.68C15.55,4.63 13.85,4 12,4M12,20A8,8 0 0,0 20,12C20,10.15 19.37,8.45 18.32,7.09L7.09,18.32C8.45,19.37 10.15,20 12,20Z" />
							</svg>
						</div>
						<div>
							<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[var(--color-brand-text-muted)] mb-[2px]">Disattivati</p>
							<p class="text-[1.5rem] font-bold text-[var(--color-brand-primary)] leading-tight">{{ inactiveCoupons.length }}</p>
						</div>
					</div>
				</div>
				<div class="rounded-[18px] p-[18px] bg-white ring-[1px] ring-[#DFE2E7]" style="box-shadow: 0 2px 12px rgba(9,88,102,0.08)">
					<div class="flex flex-col items-start gap-[10px]">
						<div class="w-[36px] h-[36px] rounded-[10px] bg-[#F0F7F8] flex items-center justify-center">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[var(--color-brand-primary)]" fill="currentColor">
								<path d="M7 15H9C9 16.08 10.37 17 12 17S15 16.08 15 15C15 13.9 13.96 13.5 11.76 12.97C9.64 12.44 7 11.78 7 9C7 7.21 8.47 5.69 10.5 5.18V3H13.5V5.18C15.53 5.69 17 7.21 17 9H15C15 7.92 13.63 7 12 7S9 7.92 9 9C9 10.1 10.04 10.5 12.24 11.03C14.36 11.56 17 12.22 17 15C17 16.79 15.53 18.31 13.5 18.82V21H10.5V18.82C8.47 18.31 7 16.79 7 15Z" />
							</svg>
						</div>
						<div>
							<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.5px] text-[var(--color-brand-text-muted)] mb-[2px]">Media sconto</p>
							<p class="text-[1.5rem] font-bold text-[var(--color-brand-primary)] leading-tight">{{ averageDiscount }}%</p>
						</div>
					</div>
				</div>
			</div>

			<div v-if="isLoading" class="py-[32px] flex justify-center">
				<div class="w-[40px] h-[40px] border-3 border-[var(--color-brand-border)] border-t-[var(--color-brand-primary)] rounded-full animate-spin"></div>
			</div>

			<template v-else>
				<div class="rounded-[18px] bg-white ring-[1px] ring-[#DFE2E7] overflow-hidden" style="box-shadow: 0 2px 12px rgba(9,88,102,0.08)">
					<div class="px-[18px] py-[18px] border-b border-[#EEF2F4] flex flex-col gap-[14px] desktop:flex-row desktop:items-center desktop:justify-between">
						<div class="max-w-[720px]">
							<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#6A7486] mb-[6px]">Promozioni</p>
							<h2 class="text-[1.125rem] font-bold text-[#1d2738] font-['Montserrat',sans-serif]">Elenco coupon</h2>
							<p class="text-[0.875rem] text-[#5A6474] mt-[4px]">Crea, attiva o archivia i codici promozionali davvero utili per onboarding, campagne e recupero checkout.</p>
						</div>
						<button type="button" @click="openCreate" class="btn-primary btn-compact inline-flex items-center justify-center gap-[6px] shrink-0">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor">
								<path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
							</svg>
							Nuovo coupon
						</button>
					</div>

					<div v-if="showForm" class="p-[18px] border-b border-[#EEF2F4] bg-[#FBFCFD]">
						<h3 class="text-[16px] font-bold text-[#1d2738] font-['Montserrat',sans-serif] mb-[16px]">
							{{ editingId ? 'Modifica coupon' : 'Nuovo coupon' }}
						</h3>
						<div class="grid grid-cols-1 desktop:grid-cols-3 gap-[14px] mb-[16px]">
							<div>
								<label class="form-label" for="coupon-code">Codice</label>
								<input id="coupon-code" v-model="form.code" type="text" placeholder="es. SCONTO10" class="form-input uppercase" />
							</div>
							<div>
								<label class="form-label" for="coupon-percentage">Sconto (%)</label>
								<input
									id="coupon-percentage"
									v-model="form.percentage"
									type="number"
									min="0"
									max="100"
									step="1"
									placeholder="10"
									class="form-input" />
							</div>
							<div>
								<label class="form-label" for="coupon-active">Stato</label>
								<select id="coupon-active" v-model="form.active" class="form-input cursor-pointer">
									<option :value="true">Attivo</option>
									<option :value="false">Disattivato</option>
								</select>
							</div>
						</div>
						<div class="flex flex-wrap items-center gap-[10px]">
							<button
								type="button"
								@click="saveCoupon"
								:disabled="formSaving"
								class="btn-primary btn-compact inline-flex items-center gap-[6px] disabled:opacity-50">
								<svg aria-hidden="true"
									v-if="formSaving"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="w-[16px] h-[16px] animate-spin"
									fill="currentColor">
									<path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
								</svg>
								<svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor">
									<path
										d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
								</svg>
								{{ formSaving ? 'Salvataggio...' : editingId ? 'Aggiorna' : 'Crea coupon' }}
							</button>
							<button type="button" @click="resetForm" class="btn-secondary btn-compact">Annulla</button>
						</div>
					</div>

					<div v-if="!coupons.length" class="px-[18px] py-[28px] text-center">
						<div class="w-[60px] h-[60px] mx-auto rounded-full flex items-center justify-center bg-[#F0F7F8] mb-[14px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[28px] h-[28px] text-[#7A8B96]" fill="currentColor" aria-hidden="true">
								<path d="M5.5,9A1.5,1.5 0 0,0 7,7.5A1.5,1.5 0 0,0 5.5,6A1.5,1.5 0 0,0 4,7.5A1.5,1.5 0 0,0 5.5,9M17.41,11.58C17.77,11.94 18,12.44 18,13C18,13.55 17.78,14.05 17.41,14.41L12.41,19.41C12.05,19.77 11.55,20 11,20C10.45,20 9.95,19.78 9.58,19.41L2.59,12.42C2.22,12.05 2,11.55 2,11V6C2,4.89 2.89,4 4,4H9C9.55,4 10.05,4.22 10.41,4.58L17.41,11.58M13.54,5.71L14.54,4.71L21.41,11.58C21.78,11.94 22,12.45 22,13C22,13.55 21.78,14.05 21.42,14.41L16.04,19.79L15.04,18.79L20.75,13L13.54,5.71Z" />
							</svg>
						</div>
						<h3 class="text-[18px] font-bold text-[#1d2738] font-['Montserrat',sans-serif] mb-[8px]">Nessun coupon creato</h3>
						<p class="text-[14px] text-[#5A6474] max-w-[560px] mx-auto">Apri il primo codice promozionale da qui e usa la lista per tenere attivi solo quelli che servono davvero.</p>
						<div class="mt-[16px] flex flex-wrap items-center justify-center gap-[8px]">
							<span class="inline-flex items-center px-[10px] py-[5px] rounded-full bg-[#F4FAFC] text-[var(--color-brand-primary)] text-[0.75rem] font-medium border border-[#D8E9F0]">Benvenuto</span>
							<span class="inline-flex items-center px-[10px] py-[5px] rounded-full bg-[#F8FAFC] text-[#5A6474] text-[0.75rem] font-medium border border-[#E5EAF0]">Recupero checkout</span>
							<span class="inline-flex items-center px-[10px] py-[5px] rounded-full bg-[#FFF7F2] text-[#A34B18] text-[0.75rem] font-medium border border-[#F2D6C6]">Campagne partner</span>
						</div>
						<button type="button" @click="openCreate" class="btn-primary btn-compact inline-flex items-center justify-center gap-[6px] mt-[18px]">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor">
								<path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
							</svg>
							Crea il primo coupon
						</button>
					</div>

					<div v-else style="overflow-x:auto">
							<table class="w-full text-[0.8125rem]" style="table-layout:fixed;min-width:520px">
							<thead>
								<tr class="border-b border-[#F0F1F4] text-left text-[var(--color-brand-text-muted)]">
									<th class="px-[18px] py-[12px] font-semibold text-[11px] uppercase tracking-[0.5px]">Codice</th>
									<th class="px-[18px] py-[12px] font-semibold text-[11px] uppercase tracking-[0.5px]">Sconto</th>
									<th class="px-[18px] py-[12px] font-semibold text-[11px] uppercase tracking-[0.5px]">Stato</th>
									<th class="px-[18px] py-[12px] font-semibold text-[11px] uppercase tracking-[0.5px]">Creato il</th>
									<th class="px-[18px] py-[12px] font-semibold text-[11px] uppercase tracking-[0.5px] text-right">Azioni</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="coupon in coupons"
									:key="coupon.id"
									class="border-b border-[#F4F5F7] last:border-0 hover:bg-[rgba(9,88,102,0.02)] transition-colors">
									<td class="px-[14px] py-[14px]">
										<span class="font-bold text-[var(--color-brand-text)] bg-[#F0F7F8] px-[10px] py-[3px] rounded-[6px] font-mono text-[0.75rem] ring-[1px] ring-[#DFE2E7] inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
											{{ coupon.code }}
										</span>
									</td>
									<td class="px-[14px] py-[14px]">
										<span class="font-semibold text-[var(--color-brand-primary)]">{{ coupon.percentage }}%</span>
									</td>
									<td class="px-[14px] py-[14px]">
										<button
											type="button"
											role="switch"
											@click="toggleActive(coupon)"
											class="inline-flex items-center gap-[10px]"
											:aria-checked="coupon.active ? 'true' : 'false'"
											aria-label="Cambia stato coupon">
											<span :class="['sf-toggle', { 'is-active': coupon.active }]" aria-hidden="true">
												<span class="sf-toggle__thumb"></span>
											</span>
											<span class="text-[0.8125rem] font-medium" :class="coupon.active ? 'text-[#047857]' : 'text-[var(--color-brand-text-muted)]'">
												{{ coupon.active ? 'Attivo' : 'Off' }}
											</span>
										</button>
									</td>
									<td class="px-[14px] py-[14px] text-[var(--color-brand-text-secondary)] text-[0.8125rem]">
										{{ coupon.created_at ? new Date(coupon.created_at).toLocaleDateString('it-IT') : '-' }}
									</td>
									<td class="px-[14px] py-[14px] text-right">
										<div class="flex items-center justify-end gap-[6px]">
											<button
												type="button"
												@click="openEdit(coupon)"
												class="w-[32px] h-[32px] rounded-[8px] ring-[1px] ring-[#DFE2E7] bg-white hover:bg-[#F0F7F8] inline-flex items-center justify-center transition-colors"
												title="Modifica"
												aria-label="Modifica coupon">
												<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px] text-[var(--color-brand-text-secondary)]" fill="currentColor">
													<path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
												</svg>
											</button>
											<button
												type="button"
												@click="askDelete(coupon.id)"
												class="w-[32px] h-[32px] rounded-[8px] ring-[1px] ring-[#FEC9C9] bg-white hover:bg-[#FEF2F2] inline-flex items-center justify-center transition-colors"
												title="Elimina"
												aria-label="Elimina coupon">
												<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px] text-red-500" fill="currentColor">
													<path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
												</svg>
											</button>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</template>
		</div>

		<!-- Delete confirm popup -->
		<UModal
			v-model:open="showDeleteConfirm"
			:dismissible="true"
			:close="false"
			:ui="{
				overlay: 'bg-[#09131c]/36 backdrop-blur-[6px]',
				content: '!divide-y-0 !ring-0 !p-0 sf-modal-surface w-[min(calc(100vw-1rem),30rem)]',
				body: '!p-0',
			}">
			<template #body>
				<section class="sf-modal-content">
					<div class="sf-modal-header">
						<div class="sf-modal-header__main">
							<div class="sf-modal-icon sf-modal-icon--accent" aria-hidden="true">
								<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor">
									<path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
								</svg>
							</div>
							<div>
								<h3 class="sf-modal-title">Elimina coupon</h3>
								<p class="sf-modal-description">Sei sicuro di voler eliminare questo coupon? L'azione non può essere annullata.</p>
							</div>
						</div>
					</div>
					<div class="sf-modal-divider" />
					<div class="sf-modal-actions">
						<button type="button" @click="showDeleteConfirm = false" class="btn-secondary btn-compact">Annulla</button>
						<button type="button" @click="confirmDelete" :disabled="deleteLoading" class="btn-danger btn-compact disabled:opacity-60">
							{{ deleteLoading ? 'Eliminazione...' : 'Elimina' }}
						</button>
					</div>
				</section>
			</template>
		</UModal>
	</section>
</template>

