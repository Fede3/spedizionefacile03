<!--
  Saldo prelevabile, pulsante prelievo e guida "come funziona".
  Props: availableBalance, isLoading, hasPending, message, messageType.
  Events: request-withdrawal.
-->
<script setup>
defineProps({
	availableBalance: { type: Number, default: 0 },
	isLoading: { type: Boolean, default: false },
	hasPending: { type: Boolean, default: false },
	message: { type: String, default: null },
	messageType: { type: String, default: 'success' },
});

const emit = defineEmits(['request-withdrawal']);

const steps = [
	'Saldo confermato.',
	"Richiedi l'intero saldo disponibile.",
	"L'admin verifica e aggiorna lo stato.",
	"Se approvato, l'importo viene accreditato.",
];
</script>

<template>
	<div class="mb-[18px] grid gap-[18px] desktop:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)] desktop:items-stretch">
		<!-- Saldo -->
		<div class="rounded-[20px] border border-[#E5EDF2] bg-white p-[18px] desktop:p-[24px] shadow-sm">
			<div class="flex flex-col gap-[14px] desktop:flex-row desktop:items-center desktop:justify-between">
				<div>
					<div class="flex items-center gap-[8px] mb-[10px]">
						<div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#095866"><path d="M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z"/></svg>
						</div>
						<p class="text-[0.75rem] uppercase tracking-[1.2px] font-medium text-[#095866]">Saldo</p>
					</div>
					<p class="text-[2rem] desktop:text-[2.5rem] font-bold tracking-tight leading-none text-[#252B42]">&euro;{{ formatEuro(availableBalance) }}</p>
					<p class="text-[0.75rem] text-[#667281] mt-[6px]">Commissioni accumulate</p>
				</div>
				<div class="flex flex-col items-start desktop:items-end gap-[8px]">
					<button
						@click="emit('request-withdrawal')"
						:disabled="isLoading || hasPending || availableBalance < 1"
						:class="['w-full desktop:w-auto px-[24px] py-[12px] rounded-[12px] font-semibold text-[0.875rem] transition-all flex items-center justify-center gap-[8px]', isLoading || hasPending || availableBalance < 1 ? 'bg-[#edf1f3] cursor-not-allowed text-[#a5b3bb]' : 'bg-[#095866] text-white hover:bg-[#074a56] cursor-pointer shadow-[0_2px_8px_rgba(9,88,102,0.2)]']">
						<svg v-if="!isLoading && !hasPending" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z"/></svg>
						<svg v-if="hasPending && !isLoading" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
						<span v-if="isLoading">Invio in corso...</span>
						<span v-else-if="hasPending">Richiesta in attesa</span>
						<span v-else>Preleva</span>
					</button>
					<p v-if="hasPending" class="text-[0.6875rem] opacity-60">In attesa di approvazione dall'admin.</p>
				</div>
			</div>

			<div v-if="message" :class="['relative z-1 mt-[16px] text-[0.8125rem] font-medium rounded-[16px] px-[14px] py-[10px] flex items-center gap-[8px]', messageType === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20']">
				<svg v-if="messageType === 'success'" xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
				{{ message }}
			</div>
		</div>

		<!-- Come funziona -->
		<div class="bg-white rounded-[18px] p-[16px] desktop:p-[20px] border border-[#E9EBEC] shadow-sm">
			<h3 class="text-[0.875rem] font-bold text-[#252B42] mb-[12px] flex items-center gap-[8px]">
				<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
				Come funziona
			</h3>
			<div class="space-y-[10px]">
				<div v-for="(step, idx) in steps" :key="idx" class="flex items-start gap-[8px]">
					<div class="w-[30px] h-[30px] rounded-full bg-[#095866]/10 flex items-center justify-center shrink-0 text-[0.75rem] font-bold text-[#095866]">{{ idx + 1 }}</div>
					<p class="text-[0.8125rem] text-[#404040] leading-[1.5]">{{ step }}</p>
				</div>
			</div>
		</div>
	</div>
</template>
