<!--
  FILE: pages/account/amministrazione/index.vue
  SCOPO: Dashboard amministrazione — panoramica con KPI, notifiche, grafico ordini,
         ultimi ordini espandibili. Le card di navigazione sono in /account (sezioni admin viola).
  API: GET /api/admin/dashboard — dati KPI e ordini recenti.
  COMPONENTI: nessun componente custom.
  ROUTE: /account/amministrazione (middleware sanctum:auth + admin).

  DATI IN INGRESSO:
    - dashboardData (da API) — KPI, notifiche, grafico, ultimi ordini.

  DATI IN USCITA: nessuna (pagina di sola lettura).

  VINCOLI: solo utenti Admin.

  COLLEGAMENTI:
    - pages/account/amministrazione/ordini.vue → gestione ordini.
    - pages/account/amministrazione/utenti.vue → gestione utenti.
    - composables/useAdmin.js → utility condivise admin.
-->
<script setup>
definePageMeta({
	middleware: ["sanctum:auth", "admin"],
});

const sanctum = useSanctumClient();
const { formatCurrency, formatCents, formatDate, orderStatusConfig } = useAdmin();

const isLoading = ref(true);
const dashboardData = ref(null);

// Quanti ordini mostrare (inizia con 5, poi +5 ad ogni click)
const ordersToShow = ref(5);

const fetchDashboard = async () => {
	try {
		const res = await sanctum("/api/admin/dashboard");
		dashboardData.value = res;
	} catch (e) { dashboardData.value = null; }
};

onMounted(async () => {
	await fetchDashboard();
	isLoading.value = false;
});

const chartMax = computed(() => {
	if (!dashboardData.value?.daily_orders?.length) return 1;
	return Math.max(1, ...dashboardData.value.daily_orders.map(d => d.count));
});

const visibleOrders = computed(() => {
	if (!dashboardData.value?.recent_orders?.length) return [];
	return dashboardData.value.recent_orders.slice(0, ordersToShow.value);
});

const hasMoreOrders = computed(() => {
	if (!dashboardData.value?.recent_orders?.length) return false;
	return ordersToShow.value < dashboardData.value.recent_orders.length;
});

const showMoreOrders = () => {
	ordersToShow.value += 5;
};

// Computed stats
const pendingWithdrawals = computed(() => withdrawalsData.value?.filter(w => w.status === 'pending') || []);
const approvedWithdrawals = computed(() => withdrawalsData.value?.filter(w => w.status === 'approved') || []);
const totalApproved = computed(() => approvedWithdrawals.value.reduce((sum, w) => sum + Number(w.amount), 0));
const unverifiedUsers = computed(() => usersData.value?.filter(u => !u.email_verified_at) || []);
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container max-w-[1400px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Amministrazione</span>
			</div>

			<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[8px]">Pannello Amministrazione</h1>
			<p class="text-[0.875rem] text-[#737373] mb-[32px]">Panoramica generale, notifiche e attivita' recenti.</p>

			<!-- Loading -->
			<div v-if="isLoading" class="py-[60px] flex justify-center">
				<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
			</div>

			<template v-else>
				<div v-if="dashboardData">
					<!-- Stats cards row 1: main KPIs -->
					<div class="grid grid-cols-2 desktop:grid-cols-4 gap-[16px] mb-[16px]">
						<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[8px]">
								<div class="w-[36px] h-[36px] rounded-[10px] bg-blue-50 flex items-center justify-center">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-blue-600" fill="currentColor"><path d="M13,12H20V13.5H13M13,9.5H20V11H13M13,14.5H20V16H13M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M21,19H12V6H21"/></svg>
								</div>
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Ordini totali</p>
							</div>
							<p class="text-[1.75rem] font-bold text-[#252B42]">{{ dashboardData.orders.total }}</p>
							<div class="flex gap-[12px] mt-[6px] text-[0.6875rem] text-[#737373]">
								<span class="text-amber-600">{{ dashboardData.orders.pending }} in attesa</span>
								<span class="text-emerald-600">{{ dashboardData.orders.completed }} completati</span>
							</div>
						</div>

						<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[8px]">
								<div class="w-[36px] h-[36px] rounded-[10px] bg-emerald-50 flex items-center justify-center">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-emerald-600" fill="currentColor"><path d="M15,18.5C12.49,18.5 10.32,17.08 9.24,15H15L16,13H8.58C8.53,12.67 8.5,12.34 8.5,12C8.5,11.66 8.53,11.33 8.58,11H15L16,9H9.24C10.32,6.92 12.5,5.5 15,5.5C16.61,5.5 18.09,6.09 19.23,7.07L21,5.29C19.41,3.86 17.31,3 15,3C11.08,3 7.76,5.51 6.52,9H3L2,11H6.06C6.02,11.33 6,11.66 6,12C6,12.34 6.02,12.67 6.06,13H3L2,15H6.52C7.76,18.49 11.08,21 15,21C17.31,21 19.41,20.14 21,18.71L19.22,16.93C18.09,17.91 16.62,18.5 15,18.5Z"/></svg>
								</div>
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Fatturato totale</p>
							</div>
							<p class="text-[1.75rem] font-bold text-emerald-600">&euro;{{ formatCents(dashboardData.revenue) }}</p>
							<div class="mt-[6px] text-[0.6875rem] text-[#737373]">
								<span class="text-emerald-600">&euro;{{ formatCents(dashboardData.revenue_month) }} questo mese</span>
							</div>
						</div>

						<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[8px]">
								<div class="w-[36px] h-[36px] rounded-[10px] bg-purple-50 flex items-center justify-center">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-purple-600" fill="currentColor"><path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V18H22V16.5C22,14.17 18.33,13 16,13M8,13C5.67,13 2,14.17 2,16.5V18H14V16.5C14,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/></svg>
								</div>
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Utenti</p>
							</div>
							<p class="text-[1.75rem] font-bold text-[#252B42]">{{ dashboardData.users.total }}</p>
							<div class="flex gap-[12px] mt-[6px] text-[0.6875rem] text-[#737373]">
								<span class="text-emerald-600">{{ dashboardData.users.verified }} verificati</span>
								<span class="text-[#095866]">{{ dashboardData.users.pro }} Pro</span>
							</div>
						</div>

						<div class="bg-white rounded-[16px] p-[20px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[8px]">
								<div class="w-[36px] h-[36px] rounded-[10px] bg-indigo-50 flex items-center justify-center">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-indigo-600" fill="currentColor"><path d="M18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5M19.5,9.5L21.46,12H17V9.5M6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5M20,8H17V4H3C1.89,4 1,4.89 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8Z"/></svg>
								</div>
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">Spedizioni BRT</p>
							</div>
							<p class="text-[1.75rem] font-bold text-[#252B42]">{{ dashboardData.shipments.with_label }}</p>
							<div class="flex gap-[12px] mt-[6px] text-[0.6875rem] text-[#737373]">
								<span class="text-indigo-600">{{ dashboardData.shipments.in_transit }} in transito</span>
								<span class="text-teal-600">{{ dashboardData.shipments.delivered }} consegnate</span>
							</div>
						</div>
					</div>

					<!-- Stats cards row 2: period KPIs -->
					<div class="grid grid-cols-3 desktop:grid-cols-3 gap-[16px] mb-[24px]">
						<div class="bg-white rounded-[16px] p-[16px] border border-[#E9EBEC] shadow-sm">
							<p class="text-[0.6875rem] text-[#737373] uppercase tracking-[0.5px] font-medium mb-[4px]">Ordini oggi</p>
							<p class="text-[1.5rem] font-bold text-[#252B42]">{{ dashboardData.orders.today }}</p>
						</div>
						<div class="bg-white rounded-[16px] p-[16px] border border-[#E9EBEC] shadow-sm">
							<p class="text-[0.6875rem] text-[#737373] uppercase tracking-[0.5px] font-medium mb-[4px]">Questa settimana</p>
							<p class="text-[1.5rem] font-bold text-[#252B42]">{{ dashboardData.orders.week }}</p>
						</div>
						<div class="bg-white rounded-[16px] p-[16px] border border-[#E9EBEC] shadow-sm">
							<p class="text-[0.6875rem] text-[#737373] uppercase tracking-[0.5px] font-medium mb-[4px]">Questo mese</p>
							<p class="text-[1.5rem] font-bold text-[#252B42]">{{ dashboardData.orders.month }}</p>
						</div>
					</div>

					<!-- Quick alerts / notifiche -->
					<div class="grid grid-cols-1 desktop:grid-cols-4 gap-[12px] mb-[24px]">
						<NuxtLink v-if="dashboardData.pending_withdrawals > 0" to="/account/amministrazione/prelievi" class="bg-amber-50 rounded-[14px] p-[14px] border border-amber-200 cursor-pointer hover:border-amber-300 transition-colors">
							<div class="flex items-center gap-[10px]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-amber-600 shrink-0" fill="currentColor"><path d="M2,5H22V7H2V5M15,10H22V12H15V10M15,16H22V18H15V16M2,10H13L8,15H2V10M2,16H8L13,21H2V16Z"/></svg>
								<div>
									<p class="text-[0.8125rem] font-semibold text-amber-800">{{ dashboardData.pending_withdrawals }} prelievi in attesa</p>
									<p class="text-[0.6875rem] text-amber-600">Clicca per gestire</p>
								</div>
							</div>
						</NuxtLink>
						<NuxtLink v-if="dashboardData.unread_messages > 0" to="/account/amministrazione/messaggi" class="bg-blue-50 rounded-[14px] p-[14px] border border-blue-200 cursor-pointer hover:border-blue-300 transition-colors">
							<div class="flex items-center gap-[10px]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-blue-600 shrink-0" fill="currentColor"><path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/></svg>
								<div>
									<p class="text-[0.8125rem] font-semibold text-blue-800">{{ dashboardData.unread_messages }} messaggi non letti</p>
									<p class="text-[0.6875rem] text-blue-600">Clicca per leggere</p>
								</div>
							</div>
						</NuxtLink>
						<NuxtLink v-if="dashboardData.orders.payment_failed > 0" to="/account/amministrazione/ordini" class="bg-red-50 rounded-[14px] p-[14px] border border-red-200 cursor-pointer hover:border-red-300 transition-colors">
							<div class="flex items-center gap-[10px]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-red-600 shrink-0" fill="currentColor"><path d="M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/></svg>
								<div>
									<p class="text-[0.8125rem] font-semibold text-red-800">{{ dashboardData.orders.payment_failed }} pagamenti falliti</p>
									<p class="text-[0.6875rem] text-red-600">Clicca per vedere</p>
								</div>
							</div>
						</NuxtLink>
						<NuxtLink v-if="dashboardData.shipments.without_label > 0" to="/account/amministrazione/ordini" class="bg-orange-50 rounded-[14px] p-[14px] border border-orange-200 cursor-pointer hover:border-orange-300 transition-colors">
							<div class="flex items-center gap-[10px]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-orange-600 shrink-0" fill="currentColor"><path d="M18.73,18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5C21,16.88 20.79,17.21 20.47,17.38L18.73,18M3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62Z"/></svg>
								<div>
									<p class="text-[0.8125rem] font-semibold text-orange-800">{{ dashboardData.shipments.without_label }} senza etichetta</p>
									<p class="text-[0.6875rem] text-orange-600">Ordini completati senza label BRT</p>
								</div>
							</div>
						</NuxtLink>
						<NuxtLink v-if="dashboardData.pending_pro_requests > 0" to="/account/amministrazione/utenti" class="bg-purple-50 rounded-[14px] p-[14px] border border-purple-200 cursor-pointer hover:border-purple-300 transition-colors">
							<div class="flex items-center gap-[10px]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-purple-600 shrink-0" fill="currentColor"><path d="M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.46,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z"/></svg>
								<div>
									<p class="text-[0.8125rem] font-semibold text-purple-800">{{ dashboardData.pending_pro_requests }} richieste Pro</p>
									<p class="text-[0.6875rem] text-purple-600">Clicca per gestire</p>
								</div>
							</div>
						</NuxtLink>
					</div>

					<!-- Orders chart (CSS bars, last 30 days) -->
					<div v-if="dashboardData.daily_orders?.length" class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] mb-[24px]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[16px]">Ordini ultimi 30 giorni</h2>
						<div class="flex items-end gap-[4px] h-[120px]">
							<div
								v-for="(day, i) in dashboardData.daily_orders"
								:key="i"
								class="flex-1 flex flex-col items-center justify-end h-full group relative">
								<div
									class="w-full rounded-t-[3px] bg-[#095866] hover:bg-[#0b6d7e] transition-colors min-h-[2px]"
									:style="{ height: (day.count / chartMax * 100) + '%' }">
								</div>
								<span v-if="i % 5 === 0" class="text-[0.5rem] text-[#737373] mt-[4px] leading-none">{{ day.date }}</span>
								<div class="absolute bottom-full mb-[4px] px-[6px] py-[3px] bg-[#252B42] text-white text-[0.625rem] rounded-[4px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
									{{ day.date }}: {{ day.count }} ordini
								</div>
							</div>
						</div>
					</div>

					<!-- Recent orders (espandibile) -->
					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<div class="flex items-center justify-between mb-[20px]">
							<h2 class="text-[1.125rem] font-bold text-[#252B42]">Ultimi ordini</h2>
							<NuxtLink to="/account/amministrazione/ordini" class="inline-flex items-center gap-[4px] text-[0.75rem] text-[#737373] hover:text-[#095866] hover:underline font-medium">
								Gestione completa
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"/></svg>
							</NuxtLink>
						</div>

						<div v-if="!dashboardData.recent_orders?.length" class="text-center py-[32px] text-[#737373]">
							<p>Nessun ordine recente.</p>
						</div>

						<div v-else class="space-y-[8px]">
							<div v-for="order in visibleOrders" :key="order.id" class="flex items-center justify-between p-[14px] rounded-[12px] border border-[#F0F0F0] hover:border-[#E0E0E0] transition-colors">
								<div class="flex items-center gap-[14px]">
									<span class="text-[0.8125rem] font-bold text-[#252B42]">#{{ order.id }}</span>
									<span class="text-[0.8125rem] text-[#404040]">{{ order.user?.name }} {{ order.user?.surname }}</span>
								</div>
								<div class="flex items-center gap-[12px]">
									<span class="text-[0.875rem] font-semibold text-[#252B42]">&euro;{{ formatCents(order.subtotal?.amount ?? order.subtotal) }}</span>
									<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', orderStatusConfig[order.status]?.bg || 'bg-gray-50', orderStatusConfig[order.status]?.text || 'text-gray-700']">
										<span class="w-[8px] h-[8px] rounded-full" :class="orderStatusConfig[order.status]?.text || 'text-gray-700'" style="background-color: currentColor"></span>
										{{ orderStatusConfig[order.status]?.label || order.status }}
									</span>
									<span class="text-[0.75rem] text-[#737373] hidden desktop:inline">{{ formatDate(order.created_at) }}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Espandi - mostra altri 5 ordini -->
					<div v-if="hasMoreOrders" class="text-center mt-[16px]">
						<button @click="showMoreOrders" class="inline-flex items-center gap-[6px] px-[24px] py-[12px] text-[#095866] hover:bg-[#f0f7f8] rounded-[12px] text-[0.875rem] font-medium transition-colors cursor-pointer border border-[#E9EBEC] hover:border-[#095866]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/></svg>
							Espandi (+5 ordini)
						</button>
					</div>
				</div>

				<!-- Fallback se dashboard non caricata -->
				<div v-else class="text-center py-[60px] text-[#737373]">
					<p class="text-[0.9375rem]">Impossibile caricare i dati della dashboard. Riprova.</p>
					<button @click="fetchDashboard(); isLoading = true; fetchDashboard().then(() => isLoading = false)" class="mt-[12px] px-[20px] py-[10px] bg-[#095866] text-white rounded-[10px] text-[0.875rem] font-medium cursor-pointer">Riprova</button>
				</div>
			</template>
		</div>
	</section>
</template>
