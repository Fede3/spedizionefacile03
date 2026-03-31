<!--
  Form richiesta Partner Pro e info card per utenti non ancora Pro.
  Props: proRequestStatus, proRequestForm, proRequestError, proRequestSuccess, proRequestLoading.
  Events: update:proRequestForm, submit.
-->
<script setup>
const props = defineProps({
	proRequestStatus: { type: Object, default: null },
	proRequestForm: { type: Object, required: true },
	proRequestError: { type: String, default: null },
	proRequestSuccess: { type: Boolean, default: false },
	proRequestLoading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:proRequestForm', 'submit']);

const updateField = (key, value) => {
	emit('update:proRequestForm', { ...props.proRequestForm, [key]: value });
};

const statusType = computed(() => props.proRequestStatus?.data?.status);
const hasRequest = computed(() => props.proRequestStatus?.has_request);
</script>

<template>
	<div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_420px] gap-[14px] desktop:gap-[18px]">
		<!-- Info card -->
		<div class="bg-white rounded-[24px] p-[18px] tablet:p-[22px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] h-full">
			<div class="flex flex-col tablet:flex-row tablet:items-start gap-[16px]">
				<div class="w-[64px] h-[64px] shrink-0 rounded-[18px] border border-[#C7D8DE] bg-[#F4FAF9] flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
				</div>
				<div class="min-w-0">
					<h2 class="text-[1.25rem] tablet:text-[1.4rem] desktop:text-[1.5rem] font-bold text-[#252B42] mt-[6px]">Partner Pro</h2>
					<p class="text-[#737373] text-[0.875rem] tablet:text-[0.9375rem] max-w-[620px] leading-[1.6] mt-[8px]">
						Guadagna il 5% su ogni spedizione.
					</p>
				</div>
			</div>

			<div class="mt-[18px] grid grid-cols-1 sm:grid-cols-3 gap-[10px]">
				<div class="rounded-[16px] border border-[#E9EBEC] bg-[#FAFCFD] p-[14px]">
					<p class="text-[0.6875rem] uppercase tracking-[0.8px] text-[#737373] font-medium">Codice</p>
					<p class="text-[0.875rem] font-semibold text-[#252B42] mt-[6px]">Personale</p>
				</div>
				<div class="rounded-[16px] border border-[#E9EBEC] bg-[#FAFCFD] p-[14px]">
					<p class="text-[0.6875rem] uppercase tracking-[0.8px] text-[#737373] font-medium">Commissione</p>
					<p class="text-[0.875rem] font-semibold text-[#252B42] mt-[6px]">5% su ogni spedizione</p>
				</div>
				<div class="rounded-[16px] border border-[#E9EBEC] bg-[#FAFCFD] p-[14px]">
					<p class="text-[0.6875rem] uppercase tracking-[0.8px] text-[#737373] font-medium">Cliente</p>
					<p class="text-[0.875rem] font-semibold text-[#252B42] mt-[6px]">-5% automatico</p>
				</div>
			</div>

			<!-- Pending -->
			<div v-if="hasRequest && statusType === 'pending'" class="mt-[18px] bg-amber-50 border border-amber-200 rounded-[16px] p-[16px] tablet:p-[18px]">
				<div class="flex items-start gap-[10px]">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" class="shrink-0 mt-[1px]"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
					<div>
						<p class="text-[0.9375rem] font-semibold text-amber-800">Richiesta in attesa di approvazione</p>
						<p class="text-[0.8125rem] text-amber-700 mt-[4px] leading-[1.5]">In revisione.</p>
					</div>
				</div>
			</div>

			<!-- Approved -->
			<div v-else-if="hasRequest && statusType === 'approved'" class="mt-[18px] bg-emerald-50 border border-emerald-200 rounded-[16px] p-[16px] tablet:p-[18px]">
				<div class="flex items-start gap-[10px]">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" class="shrink-0 mt-[1px]"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
					<div>
						<p class="text-[0.9375rem] font-semibold text-emerald-800">Richiesta approvata</p>
						<p class="text-[0.8125rem] text-emerald-700 mt-[4px] leading-[1.5]">Ricarica la pagina.</p>
					</div>
				</div>
			</div>

			<!-- Rejected -->
			<div v-else-if="hasRequest && statusType === 'rejected'" class="mt-[18px] bg-red-50 border border-red-200 rounded-[16px] p-[16px] tablet:p-[18px]">
				<div class="flex items-start gap-[10px]">
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" class="shrink-0 mt-[1px]"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
					<div>
						<p class="text-[0.9375rem] font-semibold text-red-800">Richiesta rifiutata</p>
						<p class="text-[0.8125rem] text-red-700 mt-[4px] leading-[1.5]">Invia una nuova richiesta.</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Request form -->
		<div class="bg-white rounded-[24px] p-[18px] tablet:p-[22px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] h-full">
			<div class="mb-[16px]">
				<p class="text-[0.75rem] uppercase tracking-[1px] text-[#737373] font-medium">Richiesta Pro</p>
				<h3 class="text-[1.125rem] tablet:text-[1.2rem] font-bold text-[#252B42] mt-[6px]">Richiedi accesso</h3>
				<p class="text-[#737373] text-[0.875rem] leading-[1.55] mt-[8px]">Invia i dati aziendali.</p>
			</div>

			<div v-if="proRequestSuccess" class="bg-emerald-50 border border-emerald-200 rounded-[16px] p-[16px] tablet:p-[18px] text-center">
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" class="mx-auto mb-[8px]"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
				<p class="text-[1rem] font-semibold text-emerald-800">Richiesta inviata!</p>
				<p class="text-[0.8125rem] text-emerald-700 mt-[4px] leading-[1.5]">Ti aggiorneremo appena possibile.</p>
			</div>
			<div v-else class="space-y-[14px]">
				<p v-if="proRequestError" class="text-red-600 text-[0.8125rem] bg-red-50 p-[10px] rounded-[10px] border border-red-100">{{ proRequestError }}</p>

				<div class="space-y-[10px]">
					<div>
						<label class="block text-[0.8125rem] font-semibold text-[#252B42] mb-[6px]" for="pro_company_name">Ragione sociale</label>
						<input id="pro_company_name" :value="proRequestForm.company_name" @input="updateField('company_name', $event.target.value)" type="text" placeholder="Nome azienda" class="w-full min-h-[48px] px-[14px] rounded-[14px] border border-[#D7E1E4] bg-white text-[#252B42] text-[0.9375rem] outline-none focus:border-[#095866] focus:ring-2 focus:ring-[#095866]/10" />
					</div>
					<div>
						<label class="block text-[0.8125rem] font-semibold text-[#252B42] mb-[6px]" for="pro_vat_number">Partita IVA</label>
						<input id="pro_vat_number" :value="proRequestForm.vat_number" @input="updateField('vat_number', $event.target.value)" type="text" placeholder="Partita IVA" class="w-full min-h-[48px] px-[14px] rounded-[14px] border border-[#D7E1E4] bg-white text-[#252B42] text-[0.9375rem] outline-none focus:border-[#095866] focus:ring-2 focus:ring-[#095866]/10" />
					</div>
					<div>
						<label class="block text-[0.8125rem] font-semibold text-[#252B42] mb-[6px]" for="pro_message">Messaggio</label>
						<textarea id="pro_message" :value="proRequestForm.message" @input="updateField('message', $event.target.value)" rows="4" placeholder="Breve nota opzionale" class="w-full px-[14px] py-[12px] rounded-[14px] border border-[#D7E1E4] bg-white text-[#252B42] text-[0.9375rem] outline-none focus:border-[#095866] focus:ring-2 focus:ring-[#095866]/10 resize-none"></textarea>
					</div>
				</div>

				<button @click="emit('submit')" :disabled="proRequestLoading" class="btn-primary btn-compact w-full inline-flex items-center justify-center gap-[8px] disabled:bg-[#c9d1d5] disabled:cursor-not-allowed">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
					{{ proRequestLoading ? 'Invio in corso...' : 'Invia richiesta' }}
				</button>
			</div>
		</div>
	</div>
</template>
