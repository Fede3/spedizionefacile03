<!--
  FILE: pages/account/amministrazione/referral.vue
  SCOPO: Pannello admin — statistiche sistema referral.
         Codici referral attivi, utilizzi, commissioni generate.
  API: GET /api/admin/referral-stats — statistiche referral globali.
  ROUTE: /account/amministrazione/referral (middleware sanctum:auth + admin).

  COLLEGAMENTI:
    - pages/account/account-pro.vue → lato utente Partner Pro (codice referral).
-->
<script setup>
definePageMeta({
	middleware: ["app-auth", "admin"],
});

const sanctum = useSanctumClient();
const { formatCurrency, formatDate, referralStatusConfig } = useAdmin();

const referralStats = ref(null);
const referralUsages = computed(() => referralStats.value?.data || []);

const fetchReferrals = async () => {
	try {
		const res = await sanctum("/api/admin/referrals");
		referralStats.value = res;
	} catch (e) { referralStats.value = null; }
};

onMounted(() => { fetchReferrals(); });
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Referral"
				description="Monitora utilizzi, volume, sconti e commissioni con una lettura piu' chiara su mobile, tablet e desktop."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Referral' },
				]"
			/>

			<div v-if="referralStats" class="mb-[20px] rounded-[18px] border border-[#E9EBEC] bg-[#F8FAFB] p-[14px] tablet:p-[18px]">
				<div class="flex flex-col gap-[14px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div>
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.6px] text-[#6B7280]">Toolbar referral</p>
						<h2 class="mt-[4px] text-[1rem] font-semibold text-[#252B42]">Panoramica utilizzi e resa economica</h2>
					</div>
					<div class="flex flex-wrap items-center gap-[8px]">
						<span class="inline-flex min-h-[34px] items-center rounded-full border border-[#DCE7E8] bg-white px-[12px] text-[0.75rem] font-medium text-[#095866]">
							{{ referralUsages.length }} utilizzi
						</span>
						<span class="inline-flex min-h-[34px] items-center rounded-full border border-[#E7ECEE] bg-white px-[12px] text-[0.75rem] font-medium text-[#5F6C75]">
							€{{ formatCurrency(referralStats.summary?.total_commissions) }} commissioni
						</span>
					</div>
				</div>
			</div>

			<div v-if="referralStats" class="grid grid-cols-1 tablet:grid-cols-3 gap-[16px] mb-[24px]">
				<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
					<div class="flex items-center gap-[8px] mb-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-blue-600" fill="currentColor"><path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z"/></svg>
						<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Totale utilizzi</p>
					</div>
					<p class="text-[1.75rem] font-bold text-[#252B42]">{{ referralStats.summary?.total_usages || 0 }}</p>
				</div>
				<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
					<div class="flex items-center gap-[8px] mb-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#252B42]" fill="currentColor"><path d="M17,18A2,2 0 0,1 19,20A2,2 0 0,1 17,22C15.89,22 15,21.1 15,20C15,18.89 15.89,18 17,18M1,2H4.27L5.21,4H20A1,1 0 0,1 21,5C21,5.17 20.95,5.34 20.88,5.5L17.3,11.97C16.96,12.58 16.3,13 15.55,13H8.1L7.2,14.63L7.17,14.75A0.25,0.25 0 0,0 7.42,15H19V17H7C5.89,17 5,16.1 5,15C5,14.65 5.09,14.32 5.24,14.04L6.6,11.59L3,4H1V2M7,18A2,2 0 0,1 9,20A2,2 0 0,1 7,22C5.89,22 5,21.1 5,20C5,18.89 5.89,18 7,18M16,11L18.78,6H6.14L8.5,11H16Z"/></svg>
						<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Volume ordini</p>
					</div>
					<p class="text-[1.75rem] font-bold text-[#252B42]">&euro;{{ formatCurrency(referralStats.summary?.total_order_amount) }}</p>
				</div>
				<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
					<div class="flex items-center gap-[8px] mb-[8px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-emerald-600" fill="currentColor"><path d="M3,6H21V18H3V6M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M7,8A2,2 0 0,1 5,10V14A2,2 0 0,1 7,16H17A2,2 0 0,1 19,14V10A2,2 0 0,1 17,8H7Z"/></svg>
						<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Commissioni generate</p>
					</div>
					<p class="text-[1.75rem] font-bold text-emerald-600">&euro;{{ formatCurrency(referralStats.summary?.total_commissions) }}</p>
				</div>
			</div>

			<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Utilizzi codici referral</h2>
				<div v-if="!referralStats?.data?.length" class="text-center py-[48px] text-[#737373]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[40px] h-[40px] text-[#C8CCD0] mx-auto mb-[12px]" fill="currentColor"><path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z"/></svg>
					<p>Nessun utilizzo registrato.</p>
				</div>
				<div v-else class="space-y-[12px]">
					<div class="desktop:hidden grid grid-cols-1 tablet:grid-cols-2 gap-[12px]">
						<div v-for="usage in referralUsages" :key="usage.id" class="rounded-[16px] border border-[#E9EBEC] bg-white p-[14px] shadow-sm">
							<div class="flex items-start justify-between gap-[10px]">
								<div>
									<p class="text-[0.8125rem] text-[#737373]">{{ formatDate(usage.created_at) }}</p>
									<p class="mt-[4px] font-mono text-[0.75rem] text-[#252B42]">{{ usage.referral_code }}</p>
								</div>
								<span :class="['inline-flex items-center rounded-full px-[8px] py-[3px] text-[0.6875rem] font-medium', referralStatusConfig[usage.status]?.bg || 'bg-gray-50', referralStatusConfig[usage.status]?.text || 'text-gray-700']">
									{{ referralStatusConfig[usage.status]?.label || usage.status }}
								</span>
							</div>
							<div class="mt-[12px] grid grid-cols-1 gap-[10px] text-[0.8125rem] tablet:grid-cols-2">
								<div class="rounded-[12px] bg-[#F8FAFB] px-[12px] py-[10px]">
									<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[#7B8791]">Partner Pro</p>
									<p class="mt-[4px] text-[#252B42]">{{ usage.pro_user?.name || '—' }}</p>
								</div>
								<div class="rounded-[12px] bg-[#F8FAFB] px-[12px] py-[10px]">
									<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[#7B8791]">Acquirente</p>
									<p class="mt-[4px] text-[#252B42]">{{ usage.buyer?.name || '—' }}</p>
								</div>
								<div class="rounded-[12px] bg-[#F8FAFB] px-[12px] py-[10px]">
									<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[#7B8791]">Ordine</p>
									<p class="mt-[4px] text-[#252B42]">&euro;{{ formatCurrency(usage.order_amount) }}</p>
								</div>
								<div class="rounded-[12px] bg-[#F8FAFB] px-[12px] py-[10px]">
									<p class="text-[0.6875rem] font-semibold uppercase tracking-[0.45px] text-[#7B8791]">Commissione</p>
									<p class="mt-[4px] font-semibold text-emerald-600">+&euro;{{ formatCurrency(usage.commission_amount) }}</p>
								</div>
							</div>
							<div class="mt-[10px] flex flex-wrap items-center gap-[8px] text-[0.8125rem]">
								<span class="text-blue-600">Sconto -&euro;{{ formatCurrency(usage.discount_amount) }}</span>
							</div>
						</div>
					</div>
					<div class="hidden desktop:block overflow-x-auto">
					<table class="w-full text-[0.875rem]">
						<thead>
							<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
								<th class="pb-[12px] font-medium">Data</th>
								<th class="pb-[12px] font-medium">Codice</th>
								<th class="pb-[12px] font-medium">Partner Pro</th>
								<th class="pb-[12px] font-medium">Acquirente</th>
								<th class="pb-[12px] font-medium text-right">Ordine</th>
								<th class="pb-[12px] font-medium text-right">Sconto</th>
								<th class="pb-[12px] font-medium text-right">Commissione</th>
								<th class="pb-[12px] font-medium text-center">Stato</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(usage, idx) in referralStats.data" :key="usage.id" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
								<td class="py-[14px] text-[#404040]">{{ formatDate(usage.created_at) }}</td>
								<td class="py-[14px]"><span class="font-mono text-[0.8125rem] bg-[#F0F0F0] px-[8px] py-[2px] rounded">{{ usage.referral_code }}</span></td>
								<td class="py-[14px] text-[#252B42] font-medium">{{ usage.pro_user?.name }}</td>
								<td class="py-[14px] text-[#404040]">{{ usage.buyer?.name }}</td>
								<td class="py-[14px] text-right text-[#404040]">&euro;{{ formatCurrency(usage.order_amount) }}</td>
								<td class="py-[14px] text-right text-blue-600">-&euro;{{ formatCurrency(usage.discount_amount) }}</td>
								<td class="py-[14px] text-right font-semibold text-emerald-600">+&euro;{{ formatCurrency(usage.commission_amount) }}</td>
								<td class="py-[14px] text-center">
									<span :class="['inline-block px-[8px] py-[2px] rounded-full text-[0.6875rem] font-medium', referralStatusConfig[usage.status]?.bg || 'bg-gray-50', referralStatusConfig[usage.status]?.text || 'text-gray-700']">{{ referralStatusConfig[usage.status]?.label || usage.status }}</span>
								</td>
							</tr>
						</tbody>
					</table>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
