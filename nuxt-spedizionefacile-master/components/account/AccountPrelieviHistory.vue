<!--
  Storico richieste di prelievo.
  Props: withdrawals, isLoadingData.
-->
<script setup>
import { formatDateTimeIt } from '~/utils/date.js';

defineProps({
	withdrawals: { type: Array, default: () => [] },
	isLoadingData: { type: Boolean, default: false },
});

const statusConfig = {
	pending: { label: 'In attesa', bg: 'bg-[#fff4e8]', text: 'text-[#b45309]', border: 'border-[#f3d1a7]' },
	approved: { label: 'Approvata', bg: 'bg-[#edf7f8]', text: 'text-[#095866]', border: 'border-[#bfe0e6]' },
	rejected: { label: 'Rifiutata', bg: 'bg-[#fef2f2]', text: 'text-[#b42318]', border: 'border-[#f3c1c1]' },
	completed: { label: 'Completata', bg: 'bg-[#f5f7f8]', text: 'text-[#4b5563]', border: 'border-[#d9e1e5]' },
};

const statusIcons = {
	pending:
		'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z',
	approved: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
	rejected:
		'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z',
	completed:
		'M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z',
};

const formatDate = (dateStr) => formatDateTimeIt(dateStr);
</script>

<template>
	<div class="bg-white rounded-[20px] p-[16px] desktop:p-[24px] shadow-sm border border-[#E9EBEC]">
		<div class="flex items-center gap-[10px] mb-[14px] desktop:mb-[16px]">
			<div class="w-[36px] h-[36px] rounded-[50px] bg-[#edf7f8] flex items-center justify-center">
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#095866">
					<path
						d="M13.5,8H12V13L16.28,15.54L17,14.33L13.5,12.25V8M13,3A9,9 0 0,0 4,12H1L4.96,16.03L9,12H6A7,7 0 0,1 13,5A7,7 0 0,1 20,12A7,7 0 0,1 13,19C11.07,19 9.32,18.21 8.06,16.94L6.64,18.36C8.27,19.99 10.51,21 13,21A9,9 0 0,0 22,12A9,9 0 0,0 13,3Z" />
				</svg>
			</div>
			<h2 class="text-[1rem] font-bold text-[#252B42]">Storico</h2>
		</div>

		<!-- Loading -->
		<div v-if="isLoadingData" class="py-[24px] flex justify-center">
			<div class="w-[30px] h-[30px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
		</div>

		<!-- Empty -->
		<div v-else-if="!withdrawals?.length" class="text-center py-[32px]">
			<div class="w-[56px] h-[56px] mx-auto mb-[14px] rounded-full bg-[#F8F9FB] flex items-center justify-center">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#C8CCD0">
					<path
						d="M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z" />
				</svg>
			</div>
			<p class="text-[0.9375rem] font-medium text-[#252B42]">Ancora nessuna richiesta</p>
			<p class="text-[0.75rem] text-[#737373] mt-[6px]">Qui appariranno le richieste.</p>
		</div>

		<!-- List -->
		<div v-else class="space-y-[10px]">
			<div
				v-for="withdrawal in withdrawals"
				:key="withdrawal.id"
				:class="[
					'p-[14px] rounded-[14px] border transition-colors',
					statusConfig[withdrawal.status]?.border || 'border-[#E9EBEC]',
					statusConfig[withdrawal.status]?.bg || 'bg-white',
				]">
				<div class="flex flex-col gap-[10px] tablet:flex-row tablet:items-start tablet:justify-between">
					<div class="min-w-0">
						<div class="flex items-center gap-[8px] flex-wrap">
							<span class="text-[1rem] font-bold text-[#252B42]">&euro;{{ formatEuro(withdrawal.amount) }}</span>
							<span
								:class="[
									'inline-flex items-center gap-[4px] px-[9px] py-[3px] rounded-full text-[0.6875rem] font-medium',
									statusConfig[withdrawal.status]?.text || 'text-[#737373]',
								]">
								<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
									<path
										:d="
											statusIcons[withdrawal.status] ||
											'M11,9H13V7H11M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M11,17H13V11H11V17Z'
										" />
								</svg>
								{{ statusConfig[withdrawal.status]?.label || withdrawal.status }}
							</span>
						</div>
						<p class="mt-[6px] text-[0.75rem] font-medium text-[#737373]">Richiesta #{{ withdrawal.id }}</p>
					</div>
					<div class="text-[0.6875rem] text-[#737373] tablet:text-right">
						<p class="font-medium">Inviata il</p>
						<p class="mt-[2px] whitespace-nowrap">{{ formatDate(withdrawal.created_at) }}</p>
					</div>
				</div>
				<p v-if="withdrawal.admin_notes" class="text-[0.75rem] text-[#737373] italic mt-[4px]">Note: {{ withdrawal.admin_notes }}</p>
				<p v-if="withdrawal.reviewed_at" class="text-[0.6875rem] text-[#737373] mt-[4px]">
					Verificata il {{ formatDate(withdrawal.reviewed_at) }}
				</p>
			</div>
		</div>
	</div>
</template>
