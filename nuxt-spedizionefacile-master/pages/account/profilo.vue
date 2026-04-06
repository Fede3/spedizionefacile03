<!--
  FILE: pages/account/profilo.vue
  SCOPO: Profilo utente — orchestratore vista/modifica.
  API: PATCH /api/users/{id}.
  COMPONENTI: AccountProfiloView, AccountProfiloEditForm, AccountPageHeader.
  ROUTE: /account/profilo (middleware sanctum:auth).
-->
<script setup>
import { useAuthUiSnapshotPersistence } from '~/composables/useAuthUiSnapshotPersistence';

definePageMeta({ middleware: ['app-auth'] });

useSeoMeta({
	title: 'Profilo account | SpediamoFacile',
	ogTitle: 'Profilo account | SpediamoFacile',
	description: 'Aggiorna dati personali e informazioni del profilo dalla tua area account SpediamoFacile.',
	ogDescription: 'Profilo personale e dati account su SpediamoFacile.',
});

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
		setTimeout(() => {
			messageSuccess.value = null;
		}, 4000);
	} catch (error) {
		if (error?.statusCode === 401) {
			navigateTo('/autenticazione');
			return;
		}
		const data = error?.data || error?.response?._data;
		if (data?.errors) {
			const firstError = Object.values(data.errors)[0];
			messageError.value = Array.isArray(firstError) ? firstError[0] : firstError;
		} else {
			messageError.value = "Errore durante l'aggiornamento. Riprova.";
		}
	} finally {
		messageLoading.value = null;
	}
};

const handleLogout = async () => {
	try {
		clearSnapshot();
		await logout();
		await navigateTo('/autenticazione');
	} catch {
		navigateTo('/');
	}
};

onMounted(() => {
	profileUiReady.value = true;
});
</script>

<template>
	<section v-if="profileUiReady" class="min-h-[600px] py-[20px] tablet:py-[28px] desktop:py-[28px] bg-white">
		<div class="my-container max-w-[1280px]">
			<!-- Page shell header -->
			<div class="flex flex-col gap-[16px] tablet:gap-[16px] mb-[20px]">
				<NuxtLink to="/account"
					class="flex items-center gap-[6px] text-[var(--color-brand-text-muted)] text-[13px] cursor-pointer hover:text-[var(--color-brand-text-secondary)] transition-colors duration-[350ms] font-[500]">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
					Dashboard
				</NuxtLink>
				<div class="flex items-center gap-[16px]">
					<div class="w-[48px] h-[48px] rounded-[14px] bg-[#F5F6F9] flex items-center justify-center shrink-0">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
					</div>
					<div>
						<h1 class="text-[var(--color-brand-text)] text-[24px] tablet:text-[28px] tracking-[-0.5px] font-[800]">
							{{ showEditForm ? 'Modifica dati' : 'Il mio profilo' }}
						</h1>
						<p class="text-[var(--color-brand-text-muted)] text-[13px] tablet:text-[14px] mt-[2px]">Gestisci i tuoi dati personali e le preferenze</p>
					</div>
				</div>
			</div>

			<!-- Messaggi -->
			<div v-if="messageLoading" class="mb-[20px] ux-alert ux-alert--info">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					class="ux-alert__icon animate-spin"
					aria-hidden="true">
					<path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" fill="currentColor" />
				</svg>
				<span>{{ messageLoading }}</span>
			</div>
			<div v-if="messageSuccess" class="mb-[20px] ux-alert ux-alert--success">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="ux-alert__icon shrink-0"
					aria-hidden="true">
					<path
						d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
				</svg>
				<span>{{ messageSuccess }}</span>
			</div>
			<div v-if="messageError" class="mb-[20px] ux-alert ux-alert--critical">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="ux-alert__icon shrink-0"
					aria-hidden="true">
					<path
						d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z" />
				</svg>
				<span>{{ messageError }}</span>
			</div>

			<!-- Vista profilo -->
			<AccountProfiloView v-if="!showEditForm" :user="user" @logout="handleLogout" />

			<!-- Form modifica -->
			<AccountProfiloEditForm
				v-if="showEditForm"
				v-model="userInfo"
				:loading="messageLoading"
				@submit="updateInfo"
				@cancel="showEditForm = false" />
		</div>
	</section>

	<!-- Skeleton -->
	<section v-else class="min-h-[600px] py-[20px] tablet:py-[28px] desktop:py-[28px] bg-white">
		<div class="my-container max-w-[1280px] space-y-[14px]">
			<div class="space-y-[10px] mb-[20px]">
				<div class="h-[14px] w-[80px] rounded-full bg-[#EEF3F7] animate-pulse"></div>
				<div class="flex items-center gap-[16px]">
					<div class="w-[48px] h-[48px] rounded-[14px] bg-[#EEF3F7] animate-pulse"></div>
					<div class="space-y-[6px]">
						<div class="h-[28px] w-[200px] rounded-[10px] bg-[#EEF3F7] animate-pulse"></div>
						<div class="h-[14px] w-[260px] rounded-full bg-[#F2F5F8] animate-pulse"></div>
					</div>
				</div>
			</div>
			<div class="rounded-[20px] bg-white p-[20px]" style="box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);">
				<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
					<div
						v-for="index in 6"
						:key="`skel-${index}`"
						class="h-[72px] rounded-[16px] bg-[#F5F6F9] animate-pulse"></div>
				</div>
			</div>
		</div>
	</section>
</template>
