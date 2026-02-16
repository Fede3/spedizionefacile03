<!--
  FILE: pages/account/amministrazione/coupon.vue
  SCOPO: Pannello admin — gestione coupon (codici sconto).
         CRUD completo: crea, modifica, attiva/disattiva, elimina.
  API: GET /api/admin/coupons — lista coupon,
       POST /api/admin/coupons — crea coupon,
       PATCH /api/admin/coupons/{id} — modifica coupon,
       DELETE /api/admin/coupons/{id} — elimina coupon.
  ROUTE: /account/amministrazione/coupon (middleware sanctum:auth + admin).

  COLLEGAMENTI:
    - pages/checkout.vue → i coupon vengono applicati in fase di checkout.
    - pages/carrello.vue → applicazione coupon nel carrello.
-->
<script setup>
definePageMeta({
	middleware: ["sanctum:auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionMessage, showSuccess, showError } = useAdmin();

const isLoading = ref(true);
const coupons = ref([]);

// Form nuovo coupon
const showForm = ref(false);
const formSaving = ref(false);
const editingId = ref(null);
const form = ref({ code: '', percentage: '', active: true });

const fetchCoupons = async () => {
	isLoading.value = true;
	try {
		const res = await sanctum("/api/admin/coupons");
		coupons.value = res?.data || [];
	} catch (e) { coupons.value = []; }
	finally { isLoading.value = false; }
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
	formSaving.value = true;
	try {
		if (editingId.value) {
			await sanctum(`/api/admin/coupons/${editingId.value}`, {
				method: 'PUT',
				body: {
					code: form.value.code,
					percentage: Number(form.value.percentage),
					active: form.value.active,
				},
			});
			showSuccess("Coupon aggiornato con successo.");
		} else {
			await sanctum("/api/admin/coupons", {
				method: 'POST',
				body: {
					code: form.value.code,
					percentage: Number(form.value.percentage),
					active: form.value.active,
				},
			});
			showSuccess("Coupon creato con successo.");
		}
		resetForm();
		await fetchCoupons();
	} catch (e) {
		showError(e, "Errore nel salvataggio del coupon.");
	} finally {
		formSaving.value = false;
	}
};

const toggleActive = async (coupon) => {
	try {
		await sanctum(`/api/admin/coupons/${coupon.id}`, {
			method: 'PUT',
			body: { active: !coupon.active },
		});
		await fetchCoupons();
	} catch (e) {
		showError(e, "Errore nel cambio stato.");
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
		showSuccess("Coupon eliminato.");
		showDeleteConfirm.value = false;
		deleteTargetId.value = null;
		await fetchCoupons();
	} catch (e) {
		showError(e, "Errore nell'eliminazione.");
	} finally {
		deleteLoading.value = false;
	}
};

onMounted(() => { fetchCoupons(); });
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container max-w-[1400px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Coupon e sconti</span>
			</div>

			<NuxtLink to="/account" class="inline-flex items-center gap-[6px] text-[0.8125rem] text-[#095866] hover:underline font-medium mb-[20px]">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
				Torna all'account
			</NuxtLink>

			<div class="flex items-center justify-between mb-[24px] flex-wrap gap-[12px]">
				<h1 class="text-[1.75rem] font-bold text-[#252B42]">Coupon e sconti</h1>
				<button @click="openCreate" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[10px] text-[0.875rem] font-medium transition-colors cursor-pointer">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
					Nuovo coupon
				</button>
			</div>

			<!-- Action message -->
			<div v-if="actionMessage" :class="['mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium flex items-center gap-[8px]', actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200']">
				<svg v-if="actionMessage.type === 'success'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
				{{ actionMessage.text }}
			</div>

			<!-- Form crea/modifica -->
			<div v-if="showForm" class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] mb-[24px]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">
					{{ editingId ? 'Modifica coupon' : 'Crea nuovo coupon' }}
				</h2>
				<div class="grid grid-cols-1 desktop:grid-cols-3 gap-[16px] mb-[20px]">
					<div>
						<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Codice</label>
						<input v-model="form.code" type="text" placeholder="es. SCONTO10" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none uppercase" />
					</div>
					<div>
						<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Sconto (%)</label>
						<input v-model="form.percentage" type="number" min="1" max="100" placeholder="10" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none" />
					</div>
					<div>
						<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Stato</label>
						<select v-model="form.active" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[10px] text-[0.875rem] focus:border-[#095866] focus:outline-none cursor-pointer">
							<option :value="true">Attivo</option>
							<option :value="false">Disattivato</option>
						</select>
					</div>
				</div>
				<div class="flex items-center gap-[12px]">
					<button @click="saveCoupon" :disabled="formSaving" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[10px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50">
						<svg v-if="formSaving" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
						<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
						{{ formSaving ? 'Salvataggio...' : (editingId ? 'Aggiorna' : 'Crea coupon') }}
					</button>
					<button @click="resetForm" class="px-[20px] py-[10px] text-[#737373] hover:text-[#404040] text-[0.875rem] font-medium cursor-pointer">Annulla</button>
				</div>
			</div>

			<!-- Loading -->
			<div v-if="isLoading" class="py-[60px] flex justify-center">
				<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
			</div>

			<!-- Lista coupon -->
			<template v-else>
				<div v-if="!coupons.length" class="bg-white rounded-[20px] p-[48px] shadow-sm border border-[#E9EBEC] text-center">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[48px] h-[48px] text-[#C8CCD0] mx-auto mb-[12px]" fill="currentColor"><path d="M5.5,9A1.5,1.5 0 0,0 7,7.5A1.5,1.5 0 0,0 5.5,6A1.5,1.5 0 0,0 4,7.5A1.5,1.5 0 0,0 5.5,9M17.41,11.58C17.77,11.94 18,12.44 18,13C18,13.55 17.78,14.05 17.41,14.41L12.41,19.41C12.05,19.77 11.55,20 11,20C10.45,20 9.95,19.78 9.58,19.41L2.59,12.42C2.22,12.05 2,11.55 2,11V6C2,4.89 2.89,4 4,4H9C9.55,4 10.05,4.22 10.41,4.58L17.41,11.58M13.54,5.71L14.54,4.71L21.41,11.58C21.78,11.94 22,12.45 22,13C22,13.55 21.78,14.05 21.42,14.41L16.04,19.79L15.04,18.79L20.75,13L13.54,5.71Z"/></svg>
					<p class="text-[#737373] text-[0.9375rem]">Nessun coupon creato. Clicca "Nuovo coupon" per iniziare.</p>
				</div>

				<div v-else class="bg-white rounded-[20px] shadow-sm border border-[#E9EBEC] overflow-hidden">
					<div class="overflow-x-auto">
						<table class="w-full text-[0.875rem]">
							<thead>
								<tr class="border-b border-[#E9EBEC] text-left text-[#737373] bg-[#FAFBFC]">
									<th class="px-[20px] py-[14px] font-medium">Codice</th>
									<th class="px-[20px] py-[14px] font-medium">Sconto</th>
									<th class="px-[20px] py-[14px] font-medium">Stato</th>
									<th class="px-[20px] py-[14px] font-medium">Creato il</th>
									<th class="px-[20px] py-[14px] font-medium text-right">Azioni</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="coupon in coupons" :key="coupon.id" class="border-b border-[#F0F0F0] last:border-0 hover:bg-[#FAFBFC] transition-colors">
									<td class="px-[20px] py-[14px]">
										<span class="font-bold text-[#252B42] bg-[#F0F0F0] px-[10px] py-[4px] rounded-[6px] font-mono text-[0.8125rem]">{{ coupon.code }}</span>
									</td>
									<td class="px-[20px] py-[14px]">
										<span class="font-semibold text-[#095866]">{{ coupon.percentage }}%</span>
									</td>
									<td class="px-[20px] py-[14px]">
										<button @click="toggleActive(coupon)" class="cursor-pointer">
											<span v-if="coupon.active" class="inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full bg-emerald-50 text-emerald-700 text-[0.75rem] font-medium">
												<span class="w-[6px] h-[6px] rounded-full bg-emerald-500"></span> Attivo
											</span>
											<span v-else class="inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full bg-gray-100 text-gray-500 text-[0.75rem] font-medium">
												<span class="w-[6px] h-[6px] rounded-full bg-gray-400"></span> Disattivato
											</span>
										</button>
									</td>
									<td class="px-[20px] py-[14px] text-[#737373] text-[0.8125rem]">
										{{ coupon.created_at ? new Date(coupon.created_at).toLocaleDateString('it-IT') : '-' }}
									</td>
									<td class="px-[20px] py-[14px] text-right">
										<div class="flex items-center justify-end gap-[8px]">
											<button @click="openEdit(coupon)" class="text-[#095866] hover:text-[#074a56] cursor-pointer" title="Modifica">
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
											</button>
											<button @click="askDelete(coupon.id)" class="text-red-500 hover:text-red-700 cursor-pointer" title="Elimina">
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
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
		<UModal v-model:open="showDeleteConfirm" :dismissible="true" :close="false">
			<template #title>
				<h3 class="text-[1.125rem] font-bold text-[#252B42]">Elimina coupon</h3>
			</template>
			<template #body>
				<p class="text-[0.9375rem] text-[#737373] leading-[1.6]">Sei sicuro di voler eliminare questo coupon? L'azione non puo' essere annullata.</p>
			</template>
			<template #footer>
				<div class="flex justify-end gap-[10px]">
					<button type="button" @click="showDeleteConfirm = false" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[10px] border border-[#E9EBEC] text-[#737373] hover:bg-[#F8F9FB] transition text-[0.875rem] font-medium cursor-pointer">Annulla</button>
					<button type="button" @click="confirmDelete" :disabled="deleteLoading" class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[10px] bg-red-500 text-white hover:bg-red-600 transition text-[0.875rem] font-semibold disabled:opacity-60 cursor-pointer">
						{{ deleteLoading ? 'Eliminazione...' : 'Elimina' }}
					</button>
				</div>
			</template>
		</UModal>
	</section>
</template>
