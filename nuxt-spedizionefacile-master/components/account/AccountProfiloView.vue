<!--
  Vista sola lettura del profilo utente con card dati e pulsante logout.
  Props: user.
  Events: edit, logout.
-->
<script setup>
const props = defineProps({
	user: { type: Object, default: null },
});

const emit = defineEmits(['edit', 'logout']);

const sanctum = useSanctumClient();
const exportingData = ref(false);
const deletingAccount = ref(false);
const showDeleteConfirm = ref(false);
const gdprError = ref(null);

const exportData = async () => {
	exportingData.value = true;
	gdprError.value = null;
	try {
		const data = await sanctum('/api/user/data-export', { method: 'GET' });
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `spediamofacile-dati-personali-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.appendChild(link);
		link.click();
		window.URL.revokeObjectURL(url);
		link.remove();
	} catch {
		gdprError.value = 'Errore durante l\'esportazione dei dati. Riprova.';
	} finally {
		exportingData.value = false;
	}
};

const confirmDeleteAccount = async () => {
	deletingAccount.value = true;
	gdprError.value = null;
	try {
		await sanctum('/api/user/account', { method: 'DELETE' });
		showDeleteConfirm.value = false;
		await navigateTo('/autenticazione');
	} catch {
		gdprError.value = 'Errore durante l\'eliminazione dell\'account. Riprova.';
	} finally {
		deletingAccount.value = false;
	}
};

const getTelephoneNumber = (tel) => {
	if (!tel || tel === '0') return 'Non ancora aggiunto';
	return tel;
};

const getRoleBadge = (role) => {
	if (role === 'Partner Pro') return { label: 'Partner Pro', class: 'sf-account-meta-pill' };
	if (role === 'Admin') return { label: 'Admin', class: 'sf-account-meta-pill sf-account-meta-pill--admin' };
	return { label: 'Cliente', class: 'sf-account-meta-pill sf-account-meta-pill--muted' };
};

const userTypeLabel = computed(() => (props.user?.user_type || 'privato') === 'commerciante' ? 'Azienda' : 'Privato');

const infoFields = computed(() => {
	const fields = [
		{
			label: 'Email',
			value: props.user?.email,
			icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
			stroke: true,
		},
		{
			label: 'Numero di telefono',
			value: getTelephoneNumber(props.user?.telephone_number),
			icon: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
			stroke: true,
		},
		{
			label: 'Tipo account',
			value: userTypeLabel.value,
			icon: '<path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25Z"/>',
			stroke: false,
		},
		{
			label: 'Password',
			value: '************',
			icon: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
			stroke: true,
		},
	];

	if (props.user?.company_name) {
		fields.splice(3, 0, {
			label: 'Azienda',
			value: props.user.company_name,
			sub: props.user.vat_number ? `P.IVA: ${props.user.vat_number}` : '',
			icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
			stroke: true,
		});
	}

	return fields;
});
</script>

<template>
	<!-- Personal data section -->
	<div class="rounded-[20px] bg-white mb-[28px] overflow-hidden"
		style="box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);">
		<!-- Section header -->
		<div class="flex items-center justify-between px-[20px] tablet:px-[20px] pt-[20px] mb-[16px]">
			<div class="flex items-center gap-[10px]">
				<div class="w-[32px] h-[32px] rounded-[10px] bg-[rgba(9,88,102,0.08)] flex items-center justify-center shrink-0">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
				</div>
				<span class="text-[var(--color-brand-text)] text-[17px] tablet:text-[18px] tracking-[-0.2px] font-[700]">Dati personali</span>
			</div>
			<button @click="emit('edit')"
				class="h-[34px] px-[14px] rounded-[12px] border-[1.5px] border-[#DFE2E7] text-[var(--color-brand-text-secondary)] hover:border-[var(--color-brand-primary)] text-[12px] font-[600] flex items-center gap-[5px] cursor-pointer transition-all duration-[350ms]">
				<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
				Modifica
			</button>
		</div>
		<!-- Fields grid -->
		<div class="px-[20px] tablet:px-[20px] pb-[20px]">
			<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
				<div
					v-for="(field, idx) in infoFields"
					:key="idx"
					class="flex items-center gap-[16px] p-[16px] rounded-[16px] border-[1.5px] border-[#DFE2E7]">
					<div class="w-[40px] h-[40px] rounded-[12px] bg-[#F5F6F9] flex items-center justify-center shrink-0">
						<svg
							v-if="field.stroke"
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-brand-text-muted)"
							stroke-width="2"
							v-html="field.icon"></svg>
						<svg
							v-else
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							class="w-[16px] h-[16px] text-[var(--color-brand-text-secondary)]"
							fill="currentColor"
							v-html="field.icon"></svg>
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-[var(--color-brand-text-muted)] text-[12px] font-[600]">{{ field.label }}</p>
						<p class="text-[var(--color-brand-text)] text-[14px] font-[700] truncate">{{ field.value }}</p>
						<p v-if="field.sub" class="text-[var(--color-brand-text-muted)] text-[12px]">{{ field.sub }}</p>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Security section -->
	<div class="rounded-[20px] bg-white mb-[28px] overflow-hidden"
		style="box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);">
		<div class="flex items-center gap-[10px] px-[20px] pt-[20px] mb-[16px]">
			<div class="w-[32px] h-[32px] rounded-[10px] bg-[#F5F6F9] flex items-center justify-center shrink-0">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
			</div>
			<span class="text-[var(--color-brand-text)] text-[17px] tablet:text-[18px] tracking-[-0.2px] font-[700]">Sicurezza</span>
		</div>
		<div class="px-[20px] pb-[20px] space-y-[10px]">
			<div class="flex items-center gap-[16px] p-[14px] rounded-[12px] hover:bg-[#F5F6F9] transition-colors cursor-pointer group">
				<div class="w-[36px] h-[36px] rounded-[10px] bg-[#F5F6F9] flex items-center justify-center shrink-0">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
				</div>
				<div class="flex-1">
					<span class="text-[var(--color-brand-text)] text-[14px] block font-[600]">Cambia password</span>
					<span class="text-[var(--color-brand-text-muted)] text-[12px]">Proteggi il tuo account con una nuova password</span>
				</div>
				<span class="text-[#095866] text-[12px] opacity-0 group-hover:opacity-100 transition-opacity font-[600]">Gestisci</span>
			</div>
			<div class="flex items-center gap-[16px] p-[14px] rounded-[12px] hover:bg-[#F5F6F9] transition-colors cursor-pointer group">
				<div class="w-[36px] h-[36px] rounded-[10px] bg-[#F5F6F9] flex items-center justify-center shrink-0">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
				</div>
				<div class="flex-1">
					<span class="text-[var(--color-brand-text)] text-[14px] block font-[600]">Notifiche email</span>
					<span class="text-[var(--color-brand-text-muted)] text-[12px]">Attive per tracking e promozioni</span>
				</div>
				<span class="text-[#095866] text-[12px] opacity-0 group-hover:opacity-100 transition-opacity font-[600]">Gestisci</span>
			</div>
		</div>
	</div>

	<!-- GDPR section: Privacy & Dati personali -->
	<div class="rounded-[20px] bg-white mb-[28px] overflow-hidden"
		style="box-shadow: 0 1px 4px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);">
		<div class="flex items-center gap-[10px] px-[20px] pt-[20px] mb-[16px]">
			<div class="w-[32px] h-[32px] rounded-[10px] bg-[#F5F6F9] flex items-center justify-center shrink-0">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
			</div>
			<span class="text-[var(--color-brand-text)] text-[17px] tablet:text-[18px] tracking-[-0.2px] font-[700]">Privacy e dati personali</span>
		</div>
		<div class="px-[20px] pb-[20px] space-y-[10px]">
			<p v-if="gdprError" class="text-[13px] text-red-600 bg-red-50 rounded-[10px] px-[14px] py-[10px] mb-[8px]">{{ gdprError }}</p>
			<!-- Esporta dati -->
			<button
				@click="exportData"
				:disabled="exportingData"
				class="flex items-center gap-[16px] p-[14px] rounded-[12px] hover:bg-[#F5F6F9] transition-colors cursor-pointer group w-full text-left">
				<div class="w-[36px] h-[36px] rounded-[10px] bg-[#F5F6F9] flex items-center justify-center shrink-0">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
				</div>
				<div class="flex-1">
					<span class="text-[var(--color-brand-text)] text-[14px] block font-[600]">
						{{ exportingData ? 'Esportazione in corso...' : 'Esporta i tuoi dati' }}
					</span>
					<span class="text-[var(--color-brand-text-muted)] text-[12px]">Scarica una copia di tutti i tuoi dati personali (Art. 20 GDPR)</span>
				</div>
				<span class="text-[#095866] text-[12px] opacity-0 group-hover:opacity-100 transition-opacity font-[600]">Scarica</span>
			</button>
			<!-- Elimina account -->
			<button
				v-if="!showDeleteConfirm"
				@click="showDeleteConfirm = true"
				class="flex items-center gap-[16px] p-[14px] rounded-[12px] hover:bg-red-50 transition-colors cursor-pointer group w-full text-left">
				<div class="w-[36px] h-[36px] rounded-[10px] bg-[#FEF2F2] flex items-center justify-center shrink-0">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
				</div>
				<div class="flex-1">
					<span class="text-red-600 text-[14px] block font-[600]">Elimina account</span>
					<span class="text-[var(--color-brand-text-muted)] text-[12px]">Cancella definitivamente il tuo account e tutti i dati personali (Art. 17 GDPR)</span>
				</div>
			</button>
			<!-- Conferma eliminazione -->
			<div v-if="showDeleteConfirm" class="p-[16px] rounded-[14px] bg-red-50 border border-red-200 space-y-[12px]">
				<p class="text-[14px] text-red-700 font-[600]">Sei sicuro di voler eliminare il tuo account?</p>
				<p class="text-[13px] text-red-600">Questa azione e' irreversibile. Tutti i tuoi dati personali, indirizzi e spedizioni salvate verranno eliminati. Gli ordini completati saranno anonimizzati per obblighi fiscali.</p>
				<div class="flex gap-[10px]">
					<button
						@click="showDeleteConfirm = false"
						class="h-[38px] px-[18px] rounded-full bg-white border border-[#DFE2E7] text-[var(--color-brand-text-secondary)] text-[13px] font-[600] cursor-pointer transition-colors hover:bg-[#F5F6F9]">
						Annulla
					</button>
					<button
						@click="confirmDeleteAccount"
						:disabled="deletingAccount"
						class="h-[38px] px-[18px] rounded-full bg-red-600 text-white text-[13px] font-[600] cursor-pointer transition-colors hover:bg-red-700">
						{{ deletingAccount ? 'Eliminazione...' : 'Conferma eliminazione' }}
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Logout button -->
	<button
		@click.prevent="emit('logout')"
		class="w-full h-[46px] rounded-full bg-[#F0F1F4] hover:bg-[#FFE8E0] text-[var(--color-brand-text-muted)] hover:text-[#E44203] text-[14px] font-[600] flex items-center justify-center gap-[8px] cursor-pointer transition-all duration-[350ms]">
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
		Esci dall'account
	</button>
</template>
