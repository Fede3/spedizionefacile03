<!--
  FILE: pages/account/profilo.vue
  SCOPO: Profilo utente — orchestratore vista/modifica.
  API: PATCH /api/users/{id}.
  COMPONENTI: AccountProfiloView, AccountProfiloEditForm, AccountPageHeader.
  ROUTE: /account/profilo (middleware sanctum:auth).
-->
<script setup>
import { useAuthUiSnapshotPersistence } from '~/composables/useAuthUiSnapshotPersistence';

definePageMeta({ middleware: ["app-auth"] });

const { refreshIdentity, user, logout } = useSanctumAuth();
const { clearSnapshot } = useAuthUiSnapshotPersistence();
const profileUiReady = ref(false);

const messageError = ref(null);
const messageSuccess = ref(null);
const messageLoading = ref(null);
const showEditForm = ref(false);

const userInfo = ref({
	name: user.value?.name || '',
	surname: user.value?.surname || '',
	email: user.value?.email || '',
	password: '',
	password_confirmation: '',
	telephone_number: user.value?.telephone_number || '',
	user_type: user.value?.user_type || 'privato',
	company_name: user.value?.company_name || '',
	vat_number: user.value?.vat_number || '',
	fiscal_code: user.value?.fiscal_code || '',
	pec: user.value?.pec || '',
	sdi_code: user.value?.sdi_code || '',
	billing_name: user.value?.billing_name || '',
	billing_address: user.value?.billing_address || '',
	billing_city: user.value?.billing_city || '',
	billing_postal_code: user.value?.billing_postal_code || '',
	billing_province: user.value?.billing_province || '',
});

const sanctum = useSanctumClient();

const updateInfo = async () => {
	messageError.value = null;
	messageSuccess.value = null;
	messageLoading.value = 'Salvataggio in corso...';
	try {
		await sanctum(`/api/users/${user.value.id}`, { method: 'PATCH', body: userInfo.value });
		await refreshIdentity();
		messageSuccess.value = 'Dati aggiornati con successo!';
		showEditForm.value = false;
		setTimeout(() => { messageSuccess.value = null; }, 4000);
	} catch (error) {
		if (error?.statusCode === 401) { navigateTo('/autenticazione'); return; }
		const data = error?.data || error?.response?._data;
		if (data?.errors) {
			const firstError = Object.values(data.errors)[0];
			messageError.value = Array.isArray(firstError) ? firstError[0] : firstError;
		} else {
			messageError.value = "Errore durante l'aggiornamento. Riprova.";
		}
	} finally { messageLoading.value = null; }
};

const handleLogout = async () => {
	try { clearSnapshot(); await logout(); await navigateTo('/autenticazione'); }
	catch { navigateTo('/'); }
};

onMounted(() => { profileUiReady.value = true; });
</script>

<template>
	<section v-if="profileUiReady" class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				:title="showEditForm ? 'Modifica dati' : 'Profilo e dati'"
				description="Dati personali e di fatturazione."
				:crumbs="showEditForm
					? [{ label: 'Account', to: '/account' }, { label: 'Profilo e dati', to: '/account/profilo' }, { label: 'Modifica dati' }]
					: [{ label: 'Account', to: '/account' }, { label: 'Profilo e dati' }]"
			>
				<template v-if="!showEditForm" #actions>
					<button
						@click="showEditForm = true"
						class="btn-primary btn-compact inline-flex items-center gap-[6px] text-[0.875rem]">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
						Modifica dati
					</button>
				</template>
			</AccountPageHeader>

			<!-- Messaggi -->
			<div v-if="messageSuccess" class="mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-[8px]">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="shrink-0 text-emerald-600"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/></svg>
				{{ messageSuccess }}
			</div>
			<div v-if="messageError" class="mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium bg-red-50 text-red-700 border border-red-200 flex items-center gap-[8px]">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="shrink-0 text-red-500"><path d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z"/></svg>
				{{ messageError }}
			</div>

			<!-- Vista profilo -->
			<AccountProfiloView v-if="!showEditForm" :user="user" @logout="handleLogout" />

			<!-- Form modifica -->
			<AccountProfiloEditForm
				v-if="showEditForm"
				v-model="userInfo"
				:loading="messageLoading"
				@submit="updateInfo"
				@cancel="showEditForm = false"
			/>
		</div>
	</section>

	<!-- Skeleton -->
	<section v-else class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container space-y-[18px]">
			<div class="rounded-[22px] border border-[#E3EBF0] bg-white px-[18px] py-[18px] shadow-[0_12px_30px_rgba(9,88,102,0.06)] tablet:px-[22px] tablet:py-[22px] desktop:px-[28px] desktop:py-[26px]">
				<div class="space-y-[10px]">
					<div class="h-[32px] w-[220px] rounded-[12px] bg-[#EEF3F7] animate-pulse"></div>
					<div class="h-[16px] w-full max-w-[560px] rounded-[12px] bg-[#F2F5F8] animate-pulse"></div>
				</div>
			</div>
			<div class="rounded-[12px] border border-[#E9EBEC] bg-white p-[20px] tablet:p-[24px] desktop:p-[32px] shadow-sm">
				<div class="flex flex-col gap-[18px]">
					<div class="flex items-center gap-[16px]">
						<div class="h-[56px] w-[56px] rounded-full bg-[#EEF3F7] animate-pulse"></div>
						<div class="space-y-[8px] flex-1">
							<div class="h-[22px] w-[180px] rounded-[12px] bg-[#EEF3F7] animate-pulse"></div>
							<div class="h-[14px] w-[120px] rounded-full bg-[#F2F5F8] animate-pulse"></div>
						</div>
					</div>
					<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
						<div v-for="index in 6" :key="`skel-${index}`" class="h-[84px] rounded-[12px] border border-[#EEF1F3] bg-[#FAFBFC] animate-pulse"></div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
