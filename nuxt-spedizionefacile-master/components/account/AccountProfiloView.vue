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

const getTelephoneNumber = (tel) => {
	if (!tel || tel === '0') return 'Non ancora aggiunto';
	return tel;
};

const getRoleBadge = (role) => {
	if (role === 'Partner Pro') return { label: 'Partner Pro', class: 'bg-[#095866]/10 text-[#095866]' };
	if (role === 'Admin') return { label: 'Admin', class: 'bg-purple-50 text-purple-700' };
	return { label: 'Cliente', class: 'bg-blue-50 text-blue-700' };
};
</script>

<template>
	<!-- Profile Card -->
	<div class="bg-white rounded-[12px] p-[20px] tablet:p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] mb-[20px]">
		<!-- User header -->
		<div class="flex flex-col tablet:flex-row tablet:items-center gap-[16px] mb-[24px] pb-[24px] border-b border-[#F0F0F0]">
			<div class="w-[56px] h-[56px] rounded-full bg-[#095866] flex items-center justify-center text-white text-[1.25rem] font-bold shrink-0">
				{{ user?.name?.charAt(0)?.toUpperCase() }}{{ user?.surname?.charAt(0)?.toUpperCase() || '' }}
			</div>
			<div class="min-w-0 flex-1">
				<h2 class="text-[1.125rem] tablet:text-[1.25rem] font-bold text-[#252B42]">{{ user?.name }} {{ user?.surname }}</h2>
				<span :class="['inline-block px-[10px] py-[3px] rounded-full text-[0.75rem] font-medium mt-[4px]', getRoleBadge(user?.role).class]">
					{{ getRoleBadge(user?.role).label }}
				</span>
				<div class="mt-[12px] flex flex-wrap gap-[8px]">
					<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F5F8FA] px-[10px] py-[6px] text-[0.75rem] font-medium text-[#4E5D6C]">
						<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
						{{ user?.email }}
					</span>
					<span class="inline-flex items-center gap-[6px] rounded-full bg-[#F5F8FA] px-[10px] py-[6px] text-[0.75rem] font-medium text-[#4E5D6C]">
						<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
						{{ getTelephoneNumber(user?.telephone_number) }}
					</span>
				</div>
			</div>
		</div>

		<!-- Info list -->
		<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
			<div class="flex items-start gap-[12px] rounded-[12px] border border-[#EEF1F3] bg-[#FAFBFC] p-[14px]">
				<div class="w-[36px] h-[36px] rounded-[12px] bg-white flex items-center justify-center shrink-0 border border-[#E9EBEC]">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
				</div>
				<div>
					<p class="text-[0.8125rem] text-[#737373]">Email</p>
					<p class="text-[0.9375rem] font-medium text-[#252B42]">{{ user?.email }}</p>
				</div>
			</div>

			<div class="flex items-start gap-[12px] rounded-[12px] border border-[#EEF1F3] bg-[#FAFBFC] p-[14px]">
				<div class="w-[36px] h-[36px] rounded-[12px] bg-white flex items-center justify-center shrink-0 border border-[#E9EBEC]">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
				</div>
				<div>
					<p class="text-[0.8125rem] text-[#737373]">Numero di telefono</p>
					<p class="text-[0.9375rem] font-medium text-[#252B42]">{{ getTelephoneNumber(user?.telephone_number) }}</p>
				</div>
			</div>

			<div class="flex items-start gap-[12px] rounded-[12px] border border-[#EEF1F3] bg-[#FAFBFC] p-[14px]">
				<div class="w-[36px] h-[36px] rounded-[12px] bg-white flex items-center justify-center shrink-0 border border-[#E9EBEC]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#737373]" fill="currentColor"><path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25Z"/></svg>
				</div>
				<div>
					<p class="text-[0.8125rem] text-[#737373]">Tipo account</p>
					<p class="text-[0.9375rem] font-medium text-[#252B42]">{{ (user?.user_type || 'privato') === 'commerciante' ? 'Azienda' : 'Privato' }}</p>
				</div>
			</div>

			<div v-if="user?.company_name" class="flex items-start gap-[12px] rounded-[12px] border border-[#EEF1F3] bg-[#FAFBFC] p-[14px]">
				<div class="w-[36px] h-[36px] rounded-[12px] bg-white flex items-center justify-center shrink-0 border border-[#E9EBEC]">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
				</div>
				<div>
					<p class="text-[0.8125rem] text-[#737373]">Azienda</p>
					<p class="text-[0.9375rem] font-medium text-[#252B42]">{{ user?.company_name }}</p>
					<p v-if="user?.vat_number" class="text-[0.8125rem] text-[#737373]">P.IVA: {{ user?.vat_number }}</p>
				</div>
			</div>

			<div class="flex items-start gap-[12px] rounded-[12px] border border-[#EEF1F3] bg-[#FAFBFC] p-[14px]">
				<div class="w-[36px] h-[36px] rounded-[12px] bg-white flex items-center justify-center shrink-0 border border-[#E9EBEC]">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
				</div>
				<div>
					<p class="text-[0.8125rem] text-[#737373]">Password</p>
					<p class="text-[0.9375rem] font-medium text-[#252B42]">************</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Logout button -->
	<button
		@click.prevent="emit('logout')"
		class="btn-secondary btn-compact w-full inline-flex items-center justify-center gap-[8px]">
		<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
		Esci dall'account
	</button>
</template>
