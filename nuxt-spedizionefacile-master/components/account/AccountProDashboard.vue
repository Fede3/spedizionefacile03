<!--
  Dashboard Partner Pro: codice account, codice referral, statistiche, storico commissioni.
  Props: user, referralData, earnings, copied, copiedAccountCode, copiedLink.
  Events: copy-code, copy-link, copy-account-code, share-whatsapp.
-->
<script setup>
const props = defineProps({
	user: { type: Object, default: null },
	referralData: { type: Object, default: null },
	earnings: { type: Object, default: null },
	copied: { type: Boolean, default: false },
	copiedAccountCode: { type: Boolean, default: false },
	copiedLink: { type: Boolean, default: false },
});

const emit = defineEmits(['copy-code', 'copy-link', 'copy-account-code', 'share-whatsapp']);

const formatDate = (dateStr) => {
	return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
};
</script>

<template>
	<!-- Account Code & Referral Code -->
	<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[14px] desktop:gap-[18px] mb-[22px]">
		<!-- Account Code -->
		<div class="bg-white rounded-[24px] p-[18px] desktop:p-[24px] border border-[#E9EBEC] shadow-sm h-full">
			<div class="flex items-center gap-[10px] mb-[14px]">
				<div class="w-[36px] h-[36px] rounded-[12px] bg-[#F4FAF9] border border-[#C7D8DE] flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#095866"><path d="M10,7V9H12V17H14V7H10M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/></svg>
				</div>
				<p class="text-[0.8125rem] text-[#737373] uppercase tracking-[0.8px] font-medium">Account</p>
			</div>
			<div class="flex flex-col sm:flex-row sm:items-center gap-[10px] sm:gap-[12px]">
				<span class="text-[1rem] desktop:text-[1.125rem] font-mono font-bold text-[#252B42] tracking-[1px] desktop:tracking-[2px] break-all">
					SF-PRO-{{ user?.id?.toString().padStart(6, '0') }}
				</span>
				<button @click="emit('copy-account-code')" class="p-[8px] rounded-[12px] hover:bg-[#F8F9FB] transition-colors cursor-pointer" title="Copia codice account">
					<svg v-if="copiedAccountCode" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
					<svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
				</button>
			</div>
			<p class="text-[0.8125rem] text-[#737373] mt-[8px]">Codice personale.</p>
		</div>

		<!-- Referral Code -->
		<div class="bg-white rounded-[24px] p-[18px] desktop:p-[24px] border border-[#E9EBEC] shadow-sm h-full">
			<div class="flex items-center gap-[10px] mb-[14px]">
				<div class="w-[36px] h-[36px] rounded-[12px] bg-[#F4FAF9] border border-[#C7D8DE] flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#095866"><path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19C20.92,17.39 19.61,16.08 18,16.08Z"/></svg>
				</div>
				<p class="text-[0.8125rem] uppercase tracking-[1px] text-[#737373] font-medium">Referral</p>
			</div>
			<div class="flex flex-col sm:flex-row sm:items-center gap-[10px] sm:gap-[12px]">
				<span class="text-[1.125rem] desktop:text-[1.5rem] font-mono font-bold tracking-[2px] desktop:tracking-[3px] break-all text-[#252B42]">
					{{ referralData?.referral_code || '--------' }}
				</span>
				<button @click="emit('copy-code')" class="sf-action-pill sf-action-pill--neutral w-full sm:w-auto">
					{{ copied ? 'Copiato!' : 'Copia' }}
				</button>
			</div>
			<div class="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-[10px] mt-[14px]">
				<button @click="emit('copy-link')" class="sf-action-pill sf-action-pill--neutral">
					<svg v-if="copiedLink" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
					<svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
					{{ copiedLink ? 'Link copiato' : 'Copia link' }}
				</button>
				<button @click="emit('share-whatsapp')" class="sf-action-pill sf-action-pill--soft">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.98 3.8 13.46 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7 8.5 7 9.71C7 10.93 7.89 12.1 8 12.27C8.14 12.44 9.76 14.94 12.25 16C12.84 16.27 13.3 16.42 13.66 16.53C14.25 16.72 14.79 16.69 15.22 16.63C15.7 16.56 16.68 16.03 16.89 15.45C17.1 14.87 17.1 14.38 17.04 14.27C16.97 14.17 16.81 14.11 16.56 13.98C16.31 13.86 15.09 13.26 14.87 13.18C14.64 13.1 14.5 13.06 14.31 13.3C14.15 13.55 13.67 14.11 13.53 14.27C13.38 14.44 13.24 14.46 13 14.34C12.74 14.21 11.94 13.95 11 13.11C10.26 12.45 9.77 11.64 9.62 11.39C9.5 11.15 9.61 11 9.73 10.89C9.84 10.78 10 10.6 10.1 10.45C10.23 10.31 10.27 10.2 10.35 10.04C10.43 9.87 10.39 9.73 10.33 9.6C10.27 9.47 9.77 8.26 9.56 7.77C9.36 7.29 9.16 7.35 9 7.34C8.86 7.34 8.7 7.33 8.53 7.33Z"/></svg>
					WhatsApp
				</button>
			</div>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid grid-cols-1 sm:grid-cols-2 account-pages:grid-cols-3 gap-[10px] desktop:gap-[14px] mb-[22px]">
		<div class="bg-white rounded-[18px] p-[16px] desktop:p-[20px] border border-[#E9EBEC] shadow-sm">
			<div class="flex items-center gap-[8px] mb-[10px]">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#059669"><path d="M15,18.5A6.5,6.5 0 0,1 8.5,12A6.5,6.5 0 0,1 15,5.5A6.5,6.5 0 0,1 21.5,12A6.5,6.5 0 0,1 15,18.5M15,20A8,8 0 0,0 23,12A8,8 0 0,0 15,4A8,8 0 0,0 7,12A8,8 0 0,0 15,20M2,8V6H8V8H2M0,12V10H8V12H0M3,16V14H8V16H3Z"/></svg>
				<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Commissioni</p>
			</div>
			<p class="text-[1.5rem] font-bold text-[#252B42]">&euro;{{ referralData ? Number(referralData.total_earnings || 0).toFixed(2) : '0.00' }}</p>
		</div>
		<div class="bg-white rounded-[18px] p-[16px] desktop:p-[20px] border border-[#E9EBEC] shadow-sm">
			<div class="flex items-center gap-[8px] mb-[10px]">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#095866"><path d="M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25Z"/></svg>
				<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Utilizzi</p>
			</div>
			<p class="text-[1.5rem] font-bold text-[#252B42]">{{ referralData?.total_usages || 0 }}</p>
		</div>
		<div class="bg-white rounded-[18px] p-[16px] desktop:p-[20px] border border-[#E9EBEC] shadow-sm">
			<div class="flex items-center gap-[8px] mb-[10px]">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#0D9488"><path d="M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z"/></svg>
				<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Saldo</p>
			</div>
			<p class="text-[1.5rem] font-bold text-emerald-600">&euro;{{ earnings ? Number(earnings.commission_balance || 0).toFixed(2) : '0.00' }}</p>
			<NuxtLink to="/account/prelievi" class="inline-flex items-center gap-[4px] text-[0.8125rem] text-[#095866] font-medium hover:underline mt-[6px]">
				Prelievi
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
			</NuxtLink>
		</div>
	</div>

	<!-- Earnings History -->
	<div class="bg-white rounded-[24px] p-[18px] desktop:p-[28px] shadow-sm border border-[#E9EBEC]">
		<div class="flex items-center gap-[12px] mb-[16px] desktop:mb-[20px]">
			<div class="w-[40px] h-[40px] rounded-[50px] bg-amber-50 flex items-center justify-center">
				<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#D97706"><path d="M2,2H4V20H22V22H2V2M7,10H17V13H7V10M11,15H21V18H11V15M6,4H22V8H6V4Z"/></svg>
			</div>
			<h2 class="text-[1.125rem] font-bold text-[#252B42]">Storico</h2>
		</div>

		<div v-if="!earnings?.data?.length" class="text-center py-[48px]">
			<div class="w-[64px] h-[64px] mx-auto mb-[16px] rounded-full bg-[#F8F9FB] flex items-center justify-center">
				<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#C8CCD0"><path d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z"/></svg>
			</div>
			<p class="text-[1rem] font-medium text-[#252B42]">Ancora nessuna commissione</p>
			<p class="text-[0.8125rem] text-[#737373] mt-[6px]">Condividi il codice.</p>
		</div>

		<div v-else class="space-y-[12px] desktop:space-y-0">
			<!-- Mobile cards -->
			<div class="desktop:hidden space-y-[10px]">
				<div v-for="usage in earnings.data" :key="usage.id" class="bg-[#F8F9FB] rounded-[16px] p-[14px] border border-[#E9EBEC]">
					<div class="flex items-start justify-between gap-[12px]">
						<div>
							<p class="text-[0.8125rem] font-semibold text-[#252B42]">{{ usage.buyer?.name || '\u2014' }}</p>
							<p class="text-[0.75rem] text-[#737373] mt-[2px]">{{ formatDate(usage.created_at) }}</p>
						</div>
						<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', usage.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : usage.status === 'paid' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700']">
							{{ usage.status === 'confirmed' ? 'Confermata' : usage.status === 'paid' ? 'Pagata' : 'In attesa' }}
						</span>
					</div>
					<div class="flex items-center justify-between gap-[10px] mt-[10px] text-[0.8125rem]">
						<span class="text-[#737373]">Ordine</span>
						<span class="text-[#404040]">&euro;{{ Number(usage.order_amount).toFixed(2) }}</span>
					</div>
					<div class="flex items-center justify-between gap-[10px] mt-[6px] text-[0.8125rem]">
						<span class="text-[#737373]">Commissione</span>
						<span class="font-semibold text-emerald-600">+&euro;{{ Number(usage.commission_amount).toFixed(2) }}</span>
					</div>
				</div>
			</div>
			<!-- Desktop table -->
			<div class="hidden desktop:block overflow-x-auto">
				<table class="w-full text-[0.875rem]">
					<thead>
						<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
							<th class="pb-[12px] font-medium">Data</th>
							<th class="pb-[12px] font-medium">Cliente</th>
							<th class="pb-[12px] font-medium text-right">Ordine</th>
							<th class="pb-[12px] font-medium text-right">Commissione</th>
							<th class="pb-[12px] font-medium text-center">Stato</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="usage in earnings.data" :key="usage.id" class="border-b border-[#F0F0F0] last:border-0">
							<td class="py-[12px] text-[#404040]">{{ formatDate(usage.created_at) }}</td>
							<td class="py-[12px] text-[#404040]">{{ usage.buyer?.name || '\u2014' }}</td>
							<td class="py-[12px] text-right text-[#404040]">&euro;{{ Number(usage.order_amount).toFixed(2) }}</td>
							<td class="py-[12px] text-right font-semibold text-emerald-600">+&euro;{{ Number(usage.commission_amount).toFixed(2) }}</td>
							<td class="py-[12px] text-center">
								<span :class="['inline-block px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', usage.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : usage.status === 'paid' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700']">
									{{ usage.status === 'confirmed' ? 'Confermata' : usage.status === 'paid' ? 'Pagata' : 'In attesa' }}
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>
