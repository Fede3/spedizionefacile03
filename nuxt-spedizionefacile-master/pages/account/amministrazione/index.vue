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
	middleware: ["app-auth", "admin"],
});

const sanctum = useSanctumClient();
const { formatCents, formatDate, orderStatusConfig } = useAdmin();

const isLoading = ref(true);
const dashboardData = ref(null);
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

const showMoreOrders = () => { ordersToShow.value += 5; };

/* ---------- KPI cards (data-driven) ---------- */
const kpiCards = computed(() => {
	const d = dashboardData.value;
	if (!d) return [];
	return [
		{
			key: 'orders', bg: 'bg-blue-50', color: 'text-blue-600',
			svgPath: 'M13,12H20V13.5H13M13,9.5H20V11H13M13,14.5H20V16H13M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M21,19H12V6H21',
			label: 'Ordini totali', value: d.orders.total,
			subs: [
				{ text: `${d.orders.pending} in attesa`, cls: 'text-amber-600' },
				{ text: `${d.orders.completed} completati`, cls: 'text-emerald-600' },
			],
		},
		{
			key: 'revenue', bg: 'bg-emerald-50', color: 'text-emerald-600',
			svgPath: 'M15,18.5C12.49,18.5 10.32,17.08 9.24,15H15L16,13H8.58C8.53,12.67 8.5,12.34 8.5,12C8.5,11.66 8.53,11.33 8.58,11H15L16,9H9.24C10.32,6.92 12.5,5.5 15,5.5C16.61,5.5 18.09,6.09 19.23,7.07L21,5.29C19.41,3.86 17.31,3 15,3C11.08,3 7.76,5.51 6.52,9H3L2,11H6.06C6.02,11.33 6,11.66 6,12C6,12.34 6.02,12.67 6.06,13H3L2,15H6.52C7.76,18.49 11.08,21 15,21C17.31,21 19.41,20.14 21,18.71L19.22,16.93C18.09,17.91 16.62,18.5 15,18.5Z',
			label: 'Fatturato totale', value: `\u20AC${formatCents(d.revenue)}`, valueClass: 'text-emerald-600',
			subs: [{ text: `\u20AC${formatCents(d.revenue_month)} questo mese`, cls: 'text-emerald-600' }],
		},
		{
			key: 'users', bg: 'bg-purple-50', color: 'text-purple-600',
			svgPath: 'M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V18H22V16.5C22,14.17 18.33,13 16,13M8,13C5.67,13 2,14.17 2,16.5V18H14V16.5C14,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z',
			label: 'Utenti', value: d.users.total,
			subs: [
				{ text: `${d.users.verified} verificati`, cls: 'text-emerald-600' },
				{ text: `${d.users.pro} Pro`, cls: 'text-[#095866]' },
			],
		},
		{
			key: 'tracking', bg: 'bg-indigo-50', color: 'text-indigo-600',
			svgPath: 'M18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5M19.5,9.5L21.46,12H17V9.5M6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5M20,8H17V4H3C1.89,4 1,4.89 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8Z',
			label: 'Tracking BRT', value: d.shipments.with_label,
			subs: [
				{ text: `${d.shipments.in_transit} in transito`, cls: 'text-indigo-600' },
				{ text: `${d.shipments.delivered} consegnate`, cls: 'text-teal-600' },
			],
		},
	];
});

/* ---------- Period KPI row ---------- */
const periodKpis = computed(() => {
	const d = dashboardData.value;
	if (!d) return [];
	return [
		{ key: 'today', label: 'Ordini oggi', value: d.orders.today },
		{ key: 'week', label: 'Questa settimana', value: d.orders.week },
		{ key: 'month', label: 'Questo mese', value: d.orders.month },
	];
});

/* ---------- Quick links ---------- */
const adminQuickLinks = [
	{ label: 'Ordini', to: '/account/amministrazione/ordini', svgPath: 'M13,12H20V13.5H13M13,9.5H20V11H13M13,14.5H20V16H13M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M21,19H12V6H21' },
	{ label: 'Utenti', to: '/account/amministrazione/utenti', svgPath: 'M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V18H22V16.5C22,14.17 18.33,13 16,13M8,13C5.67,13 2,14.17 2,16.5V18H14V16.5C14,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z' },
	{ label: 'Prezzi', to: '/account/amministrazione/prezzi', svgPath: 'M5,6H23V18H5V6M14,9A3,3 0 0,1 17,12A3,3 0 0,1 14,15A3,3 0 0,1 11,12A3,3 0 0,1 14,9M9,8A2,2 0 0,1 7,10V14A2,2 0 0,1 9,16H19A2,2 0 0,1 21,14V10A2,2 0 0,1 19,8H9M1,10H3V20H19V22H1V10Z' },
	{ label: 'Messaggi', to: '/account/amministrazione/messaggi', svgPath: 'M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z' },
	{ label: 'Impostazioni', to: '/account/amministrazione/impostazioni', svgPath: 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.04 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.04 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z' },
];

/* ---------- Alert banners ---------- */
const alertSvgs = {
	withdrawals: 'M12.5,6.9C12.5,6.9 17,13 17,15.5A4.5,4.5 0 0,1 12.5,20A4.5,4.5 0 0,1 8,15.5C8,13 12.5,6.9 12.5,6.9Z',
	messages: 'M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z',
	payments: 'M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z',
	labels: 'M2,10.96C1.5,10.68 1.5,10.23 2,9.96L12,3.96L22,9.96C22.5,10.23 22.5,10.68 22,10.96L12,16.96L2,10.96Z',
	pro: 'M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z',
};

const adminAlerts = computed(() => {
	const d = dashboardData.value;
	if (!d) return [];
	return [
		d.pending_withdrawals > 0 ? { key: 'withdrawals', to: '/account/amministrazione/prelievi', label: `${d.pending_withdrawals} prelievi in attesa`, tone: 'warning' } : null,
		d.unread_messages > 0 ? { key: 'messages', to: '/account/amministrazione/messaggi', label: `${d.unread_messages} messaggi non letti`, tone: 'info' } : null,
		d.orders.payment_failed > 0 ? { key: 'payments', to: '/account/amministrazione/ordini', label: `${d.orders.payment_failed} pagamenti falliti`, tone: 'critical' } : null,
		d.shipments.without_label > 0 ? { key: 'labels', to: '/account/amministrazione/ordini', label: `${d.shipments.without_label} senza etichetta`, tone: 'warning' } : null,
		d.pending_pro_requests > 0 ? { key: 'pro', to: '/account/amministrazione/utenti', label: `${d.pending_pro_requests} richieste Pro`, tone: 'info' } : null,
	].filter(Boolean);
});
</script>

<template>
	<section class="min-h-[600px] py-[24px] desktop:py-[40px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Dashboard admin"
				description=""
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione' },
				]"
			/>

			<!-- Quick links -->
			<div class="mb-[16px] grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-5 gap-[8px]">
				<NuxtLink
					v-for="link in adminQuickLinks"
					:key="link.to"
					:to="link.to"
					class="group flex items-center gap-[10px] min-h-[52px] px-[14px] py-[10px] rounded-[16px] bg-white border border-[#E9EBEC] shadow-sm hover:border-[#B7D7DF] hover:bg-[#F8FBFC] transition-colors">
					<div class="w-[32px] h-[32px] rounded-[12px] bg-[#F4FAFC] flex items-center justify-center text-[#095866] shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path :d="link.svgPath"/></svg>
					</div>
					<p class="text-[0.8125rem] font-semibold text-[#252B42] leading-[1.15]">{{ link.label }}</p>
				</NuxtLink>
			</div>

			<!-- Loading -->
			<div v-if="isLoading" class="py-[48px] flex justify-center">
				<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
			</div>

			<template v-else>
				<div v-if="dashboardData">
					<!-- KPI cards row 1 -->
					<div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-[12px] desktop:gap-[14px] mb-[14px]">
						<div v-for="card in kpiCards" :key="card.key" class="bg-white rounded-[16px] p-[14px] tablet:p-[16px] border border-[#E9EBEC] shadow-sm">
							<div class="flex items-center gap-[8px] mb-[6px]">
								<div class="w-[32px] h-[32px] rounded-[50px] flex items-center justify-center" :class="card.bg">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" :class="card.color" fill="currentColor"><path :d="card.svgPath"/></svg>
								</div>
								<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium">{{ card.label }}</p>
							</div>
							<p class="text-[1.5rem] font-bold" :class="card.valueClass || 'text-[#252B42]'">{{ card.value }}</p>
							<div class="flex gap-[10px] mt-[6px] text-[0.6875rem] text-[#737373]">
								<span v-for="sub in card.subs" :key="sub.text" :class="sub.cls">{{ sub.text }}</span>
							</div>
						</div>
					</div>

					<!-- KPI cards row 2: period -->
					<div class="grid grid-cols-1 tablet:grid-cols-3 gap-[12px] desktop:gap-[14px] mb-[20px]">
						<div v-for="pk in periodKpis" :key="pk.key" class="bg-white rounded-[16px] p-[13px] tablet:p-[14px] border border-[#E9EBEC] shadow-sm">
							<p class="text-[0.6875rem] text-[#737373] uppercase tracking-[0.5px] font-medium mb-[4px]">{{ pk.label }}</p>
							<p class="text-[1.5rem] font-bold text-[#252B42]">{{ pk.value }}</p>
						</div>
					</div>

					<!-- Alert banners -->
					<div v-if="adminAlerts.length" class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-[10px] mb-[20px]">
						<NuxtLink
							v-for="alert in adminAlerts"
							:key="alert.key"
							:to="alert.to"
							class="sf-action-card sf-action-card--locked min-h-[58px] rounded-[16px] border-l-[3px]"
							:class="alert.tone === 'critical' ? 'border-l-[#E44203]' : 'border-l-[#0E6572]'">
							<div
								class="sf-action-card__icon-shell"
								:class="alert.tone === 'critical' ? 'sf-action-card__icon-shell--accent' : ''">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path :d="alertSvgs[alert.key]"/></svg>
							</div>
							<div class="min-w-0">
								<p class="text-[0.8125rem] font-semibold leading-[1.2] text-[#252B42]">{{ alert.label }}</p>
								<p class="mt-[2px] text-[0.6875rem] text-[#67788A]">Apri gestione</p>
							</div>
						</NuxtLink>
					</div>

					<!-- Orders chart (CSS bars, last 30 days) -->
					<div v-if="dashboardData.daily_orders?.length" class="bg-white rounded-[20px] p-[20px] desktop:p-[28px] shadow-sm border border-[#E9EBEC] mb-[20px]">
						<h2 class="text-[1.0625rem] font-bold text-[#252B42] mb-[14px]">Ordini ultimi 30 giorni</h2>
						<div class="flex items-end gap-[4px] h-[108px]">
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

					<!-- Recent orders -->
					<div class="bg-white rounded-[20px] p-[20px] desktop:p-[28px] shadow-sm border border-[#E9EBEC]">
						<div class="flex items-center justify-between mb-[16px]">
							<h2 class="text-[1.0625rem] font-bold text-[#252B42]">Ultimi ordini</h2>
							<NuxtLink to="/account/amministrazione/ordini" class="inline-flex items-center gap-[4px] text-[0.75rem] text-[#737373] hover:text-[#095866] hover:underline font-medium">
								Gestione completa
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"/></svg>
							</NuxtLink>
						</div>

						<div v-if="!dashboardData.recent_orders?.length" class="text-center py-[28px] text-[#737373]">
							<p>Nessun ordine recente.</p>
						</div>

						<div v-else class="space-y-[8px]">
							<div v-for="order in visibleOrders" :key="order.id" class="flex items-center justify-between p-[12px] rounded-[12px] border border-[#F0F0F0] hover:border-[#E0E0E0] transition-colors">
								<div class="flex items-center gap-[14px]">
									<span class="text-[0.8125rem] font-bold text-[#252B42]">#{{ order.id }}</span>
									<span class="text-[0.8125rem] text-[#404040]">{{ order.user?.name }} {{ order.user?.surname }}</span>
								</div>
								<div class="flex items-center gap-[12px]">
									<span class="text-[0.875rem] font-semibold text-[#252B42]">&euro;{{ formatCents(order.subtotal?.amount ?? order.subtotal) }}</span>
									<span :class="['inline-flex items-center gap-[4px] px-[10px] py-[3px] rounded-full text-[0.6875rem] font-medium', orderStatusConfig[order.status]?.bg || 'bg-gray-50', orderStatusConfig[order.status]?.text || 'text-gray-700']">
										<span class="w-[8px] h-[8px] rounded-full bg-current" :class="orderStatusConfig[order.status]?.text || 'text-gray-700'"></span>
										{{ orderStatusConfig[order.status]?.label || order.status }}
									</span>
									<span class="text-[0.75rem] text-[#737373] hidden desktop:inline">{{ formatDate(order.created_at) }}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Show more orders -->
					<div v-if="hasMoreOrders" class="text-center mt-[14px]">
						<button @click="showMoreOrders" class="inline-flex items-center gap-[6px] px-[22px] py-[11px] text-[#095866] hover:bg-[#f0f7f8] rounded-[12px] text-[0.875rem] font-medium transition-colors cursor-pointer border border-[#E9EBEC] hover:border-[#095866]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/></svg>
							Espandi (+5 ordini)
						</button>
					</div>
				</div>

				<!-- Fallback -->
				<div v-else class="text-center py-[60px] text-[#737373]">
					<p class="text-[0.9375rem]">Impossibile caricare i dati della dashboard. Riprova.</p>
					<button @click="fetchDashboard(); isLoading = true; fetchDashboard().then(() => isLoading = false)" class="mt-[12px] px-[20px] py-[10px] bg-[#095866] text-white rounded-[50px] text-[0.875rem] font-medium cursor-pointer">Riprova</button>
				</div>
			</template>
		</div>
	</section>
</template>
