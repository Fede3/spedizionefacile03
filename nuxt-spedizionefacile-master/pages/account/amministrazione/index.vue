<!--
  FILE: pages/account/amministrazione/index.vue
  SCOPO: Dashboard amministrazione — root leggibile con grafico, KPI essenziali e coda operativa.
  API: GET /api/admin/dashboard — dati KPI e ordini recenti.
  ROUTE: /account/amministrazione (middleware sanctum:auth + admin).
-->
<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Dashboard admin | SpediamoFacile',
	ogTitle: 'Dashboard admin | SpediamoFacile',
	description: 'Panoramica amministrazione con KPI essenziali, code operative e andamento ordini.',
	ogDescription: 'Dashboard amministrativa SpediamoFacile con ordini, ricavi, utenti e coda operativa.',
});

const sanctum = useSanctumClient();
const { formatCents, formatDate, orderStatusConfig } = useAdmin();

const isLoading = ref(true);
const dashboardData = ref(null);
const loadError = ref('');

const fetchDashboard = async () => {
	loadError.value = '';
	try {
		const res = await sanctum('/api/admin/dashboard');
		dashboardData.value = res;
	} catch {
		dashboardData.value = null;
		loadError.value = 'Impossibile sincronizzare la dashboard amministrativa.';
	}
};

onMounted(async () => {
	await fetchDashboard();
	isLoading.value = false;
});

const chartMax = computed(() => {
	if (!dashboardData.value?.daily_orders?.length) return 1;
	return Math.max(1, ...dashboardData.value.daily_orders.map((d) => d.count));
});

const recentOrders = computed(() => dashboardData.value?.recent_orders || []);

const dashboardSummary = computed(() => {
	const d = dashboardData.value;
	if (!d) return 'Caricamento indicatori amministrativi in corso.';
	const orderCount = d.orders?.total ?? 0;
	const recentCount = recentOrders.value.length;
	const pendingCount = d.pending_withdrawals ?? 0;
	return `${orderCount} ordini totali, ${recentCount} recenti, ${pendingCount} prelievi in attesa.`;
});

const dashboardHeaderMeta = computed(() => {
	const d = dashboardData.value;
	if (!d) return [];
	return [
		{ label: 'Ordini recenti', value: recentOrders.value.length },
		{ label: 'Prelievi in attesa', value: d.pending_withdrawals ?? 0 },
		{ label: 'Utenti Pro', value: d.users?.pro ?? 0 },
	];
});

const kpiCards = computed(() => {
	const d = dashboardData.value;
	if (!d) return [];
	return [
		{
			key: 'orders',
			bg: 'bg-blue-50',
			color: 'text-blue-600',
			accent: '#1D4ED8',
			border: '#D9E5FF',
			svgPath:
				'M13,12H20V13.5H13M13,9.5H20V11H13M13,14.5H20V16H13M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M21,19H12V6H21',
			label: 'Ordini',
			value: d.orders.total,
			subs: [
				{ text: `${d.orders.pending} in attesa`, cls: 'text-amber-600' },
				{ text: `${d.orders.completed} completati`, cls: 'text-emerald-600' },
			],
		},
		{
			key: 'revenue',
			bg: 'bg-emerald-50',
			color: 'text-emerald-600',
			accent: '#15803D',
			border: '#D8EFD9',
			svgPath:
				'M15,18.5C12.49,18.5 10.32,17.08 9.24,15H15L16,13H8.58C8.53,12.67 8.5,12.34 8.5,12C8.5,11.66 8.53,11.33 8.58,11H15L16,9H9.24C10.32,6.92 12.5,5.5 15,5.5C16.61,5.5 18.09,6.09 19.23,7.07L21,5.29C19.41,3.86 17.31,3 15,3C11.08,3 7.76,5.51 6.52,9H3L2,11H6.06C6.02,11.33 6,11.66 6,12C6,12.34 6.02,12.67 6.06,13H3L2,15H6.52C7.76,18.49 11.08,21 15,21C17.31,21 19.41,20.14 21,18.71L19.22,16.93C18.09,17.91 16.62,18.5 15,18.5Z',
			label: 'Ricavi',
			value: `EUR ${formatCents(d.revenue)}`,
			valueClass: 'text-emerald-600',
			subs: [{ text: `EUR ${formatCents(d.revenue_month)} questo mese`, cls: 'text-emerald-600' }],
		},
		{
			key: 'users',
			bg: 'bg-purple-50',
			color: 'text-purple-600',
			accent: '#6D28D9',
			border: '#E5DBFF',
			svgPath:
				'M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V18H22V16.5C22,14.17 18.33,13 16,13M8,13C5.67,13 2,14.17 2,16.5V18H14V16.5C14,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z',
			label: 'Utenti',
			value: d.users.total,
			subs: [
				{ text: `${d.users.verified} verificati`, cls: 'text-emerald-600' },
				{ text: `${d.users.pro} Pro`, cls: 'text-[var(--color-brand-primary)]' },
			],
		},
		{
			key: 'tracking',
			bg: 'bg-indigo-50',
			color: 'text-indigo-600',
			accent: '#0F766E',
			border: '#D6ECE9',
			svgPath:
				'M18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5M19.5,9.5L21.46,12H17V9.5M6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5M20,8H17V4H3C1.89,4 1,4.89 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8Z',
			label: 'Tracking',
			value: d.shipments.with_label,
			subs: [
				{ text: `${d.shipments.in_transit} in transito`, cls: 'text-indigo-600' },
				{ text: `${d.shipments.delivered} consegnate`, cls: 'text-teal-600' },
			],
		},
	];
});

const periodKpis = computed(() => {
	const d = dashboardData.value;
	if (!d) return [];
	return [
		{ key: 'today', label: 'Oggi', value: d.orders.today },
		{ key: 'week', label: 'Settimana', value: d.orders.week },
		{ key: 'month', label: 'Mese', value: d.orders.month },
	];
});

const adminQuickLinks = [
	{
		label: 'Ordini',
		to: '/account/amministrazione/ordini',
		iconBg: '#EEF4FF',
		iconColor: '#1D4ED8',
		hoverBorder: '#BFD0F3',
		svgPath:
			'M13,12H20V13.5H13M13,9.5H20V11H13M13,14.5H20V16H13M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M21,19H12V6H21',
	},
	{
		label: 'Tracking',
		to: '/account/amministrazione/spedizioni',
		iconBg: '#ECF8F8',
		iconColor: '#0F766E',
		hoverBorder: '#B9DDD8',
		svgPath:
			'M3,4A2,2 0 0,0 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8H17V4M10,6L14,10L10,14V11H4V9H10M17,9.5H19.5L21.47,12H17M6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5M18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5Z',
	},
	{
		label: 'Prelievi',
		to: '/account/amministrazione/prelievi',
		iconBg: '#FFF7E8',
		iconColor: '#B45309',
		hoverBorder: '#E7D3A6',
		svgPath: 'M2,5H22V7H2V5M15,10H22V12H15V10M15,16H22V18H15V16M2,10H13L8,15H2V10M2,16H8L13,21H2V16Z',
	},
	{
		label: 'Messaggi',
		to: '/account/amministrazione/messaggi',
		iconBg: '#F3F1FF',
		iconColor: '#6D28D9',
		hoverBorder: '#D4C8F6',
		svgPath: 'M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z',
	},
	{
		label: 'Utenti',
		to: '/account/amministrazione/utenti',
		iconBg: '#F4F5F7',
		iconColor: '#475569',
		hoverBorder: '#D5DAE1',
		svgPath:
			'M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V18H22V16.5C22,14.17 18.33,13 16,13M8,13C5.67,13 2,14.17 2,16.5V18H14V16.5C14,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z',
	},
];

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
		d.pending_withdrawals > 0
			? {
					key: 'withdrawals',
					to: '/account/amministrazione/prelievi',
					label: `${d.pending_withdrawals} prelievi in attesa`,
					tone: 'warning',
				}
			: null,
		d.unread_messages > 0
			? { key: 'messages', to: '/account/amministrazione/messaggi', label: `${d.unread_messages} messaggi non letti`, tone: 'info' }
			: null,
		d.orders.payment_failed > 0
			? { key: 'payments', to: '/account/amministrazione/ordini', label: `${d.orders.payment_failed} pagamenti falliti`, tone: 'critical' }
			: null,
		d.shipments.without_label > 0
			? { key: 'labels', to: '/account/amministrazione/ordini', label: `${d.shipments.without_label} senza etichetta`, tone: 'warning' }
			: null,
		d.pending_pro_requests > 0
			? { key: 'pro', to: '/account/amministrazione/utenti', label: `${d.pending_pro_requests} richieste Pro`, tone: 'info' }
			: null,
	].filter(Boolean);
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[48px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Console admin"
				:description="dashboardSummary"
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Amministrazione' }]">
				<template #meta>
					<div v-if="dashboardHeaderMeta.length" class="flex flex-wrap gap-[8px]">
						<span
							v-for="item in dashboardHeaderMeta"
							:key="item.label"
							class="inline-flex items-center gap-[6px] rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[var(--color-brand-primary)]">
							{{ item.label }}: {{ item.value }}
						</span>
					</div>
				</template>
			</AccountPageHeader>

			<div class="sf-account-panel mb-[16px] rounded-[24px] p-[16px] tablet:p-[18px]">
				<div class="grid grid-cols-2 gap-[8px] tablet:grid-cols-3 desktop:grid-cols-5">
					<NuxtLink
						v-for="link in adminQuickLinks"
						:key="link.to"
						:to="link.to"
						class="sf-admin-quick-link group flex min-h-[52px] items-center gap-[10px] rounded-[12px] px-[14px] py-[10px]"
						:style="{ '--sf-link-hover-border': link.hoverBorder }">
						<div
							class="sf-admin-quick-link__icon flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[12px]"
							:style="{ backgroundColor: link.iconBg, color: link.iconColor }">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="currentColor">
								<path :d="link.svgPath" />
							</svg>
						</div>
						<p class="text-[0.8125rem] font-semibold leading-[1.15] text-[var(--color-brand-text)]">{{ link.label }}</p>
					</NuxtLink>
				</div>
			</div>

			<div v-if="isLoading" class="flex justify-center py-[48px]">
				<div class="h-[40px] w-[40px] animate-spin rounded-full border-3 border-[var(--color-brand-border)] border-t-[var(--color-brand-primary)]"></div>
			</div>

			<template v-else>
				<div v-if="dashboardData">
					<div class="sf-account-panel mb-[16px] rounded-[24px] px-[16px] py-[14px] desktop:px-[20px] desktop:py-[16px]">
						<div class="flex flex-col gap-[10px] desktop:flex-row desktop:items-center desktop:justify-between">
							<div>
								<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[var(--color-brand-primary)]">Vista rapida</p>
								<h2 class="mt-[4px] text-[1rem] font-bold text-[var(--color-brand-text)]">Dashboard operativa e non archivio completo</h2>
								<p class="mt-[4px] text-[0.875rem] leading-[1.55] text-[#667281]">
									Questa schermata mostra gli ultimi {{ recentOrders.length }} ordini sincronizzati e le code prioritarie. Per filtro,
									ricerca e storico completo usa la gestione ordini dedicata.
								</p>
							</div>
							<div class="flex flex-wrap gap-[8px]">
								<span class="sf-account-meta-pill">Ordini live</span>
								<span class="sf-account-meta-pill sf-account-meta-pill--muted">Coda admin</span>
							</div>
						</div>
					</div>

					<div class="mb-[20px] grid gap-[16px] desktop:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
						<section
							class="sf-admin-chart-card rounded-[16px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfc_100%)] p-[20px] desktop:p-[28px]">
							<div
								class="flex flex-col gap-[10px] border-b border-[#E6EDF0] pb-[16px] desktop:flex-row desktop:items-start desktop:justify-between">
								<div>
									<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#7A8695]">Monitor ordini</p>
									<h2 class="mt-[4px] text-[1.2rem] font-bold text-[var(--color-brand-text)]">Andamento ultimi 30 giorni</h2>
								</div>

								<div class="flex flex-wrap gap-[8px]">
									<span
										v-for="pk in periodKpis"
										:key="pk.key"
										class="inline-flex flex-col rounded-[12px] border border-[#E2ECEF] bg-white px-[12px] py-[10px] shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
										<span class="text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-[#7A8695]">{{ pk.label }}</span>
										<span class="mt-[2px] text-[1rem] font-bold text-[var(--color-brand-text)]">{{ pk.value }}</span>
									</span>
								</div>
							</div>

							<div v-if="dashboardData.daily_orders?.length" class="mt-[18px] flex h-[180px] items-end gap-[6px]">
								<div
									v-for="(day, i) in dashboardData.daily_orders"
									:key="i"
									class="group relative flex h-full flex-1 flex-col items-center justify-end">
									<div
										class="min-h-[6px] w-full rounded-t-[6px] bg-[var(--color-brand-primary)] transition-colors hover:bg-[#0b6d7e]"
										:style="{ height: `${(day.count / chartMax) * 100}%` }"></div>
									<span v-if="i % 5 === 0" class="mt-[6px] text-[0.55rem] leading-none text-[#7A8695]">{{ day.date }}</span>
									<div
										class="pointer-events-none absolute bottom-full z-10 mb-[6px] whitespace-nowrap rounded-[6px] bg-[var(--color-brand-text)] px-[7px] py-[4px] text-[0.625rem] text-white opacity-0 transition-opacity group-hover:opacity-100">
										{{ day.date }}: {{ day.count }} ordini
									</div>
								</div>
							</div>

							<div
								v-else
								class="mt-[18px] rounded-[12px] border border-dashed border-[#D4E1E7] bg-white px-[16px] py-[22px] text-center text-[0.875rem] text-[#617182]">
								Nessun dato disponibile per il grafico ordini.
							</div>
						</section>

						<section class="sf-admin-chart-card rounded-[16px] bg-white p-[18px] desktop:p-[22px]">
							<div class="border-b border-[#E9EEF2] pb-[14px]">
								<p class="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#7A8695]">Priorita ora</p>
								<h2 class="mt-[4px] text-[1.0625rem] font-bold text-[var(--color-brand-text)]">Code operative</h2>
							</div>

							<div v-if="adminAlerts.length" class="mt-[16px] space-y-[10px]">
								<NuxtLink
									v-for="alert in adminAlerts"
									:key="alert.key"
									:to="alert.to"
									class="sf-action-card sf-action-card--locked min-h-[62px] rounded-[14px] border-l-[3px]"
									:class="alert.tone === 'critical' ? 'border-l-[var(--color-brand-accent)]' : 'border-l-[#0E6572]'">
									<div class="sf-action-card__icon-shell" :class="alert.tone === 'critical' ? 'sf-action-card__icon-shell--accent' : ''">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="currentColor">
											<path :d="alertSvgs[alert.key]" />
										</svg>
									</div>
									<div class="min-w-0">
										<p class="text-[0.875rem] font-semibold leading-[1.2] text-[var(--color-brand-text)]">{{ alert.label }}</p>
									</div>
								</NuxtLink>
							</div>

							<div
								v-else
								class="mt-[16px] rounded-[12px] border border-dashed border-[#D4E1E7] bg-[#F8FBFC] px-[14px] py-[18px] text-[0.875rem] text-[#617182]">
								Nessuna priorita aperta.
							</div>
						</section>
					</div>

					<div class="mb-[20px] grid grid-cols-1 gap-[12px] tablet:grid-cols-2 desktop:grid-cols-4 desktop:gap-[14px]">
						<div
							v-for="card in kpiCards"
							:key="card.key"
							class="sf-admin-kpi-card rounded-[12px] bg-white p-[14px] tablet:p-[16px]"
							:style="{ borderColor: card.border, boxShadow: `inset 0 3px 0 ${card.accent}, 0 8px 18px rgba(20, 37, 48, 0.045)` }">
							<div class="mb-[6px] flex items-center gap-[8px]">
								<div class="flex h-[32px] w-[32px] items-center justify-center rounded-[50px]" :class="card.bg">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										class="h-[18px] w-[18px]"
										:class="card.color"
										fill="currentColor">
										<path :d="card.svgPath" />
									</svg>
								</div>
								<p class="text-[0.75rem] font-medium uppercase tracking-[0.5px] text-[var(--color-brand-text-secondary)]">{{ card.label }}</p>
							</div>
							<p class="text-[1.5rem] font-bold" :class="card.valueClass || 'text-[var(--color-brand-text)]'">{{ card.value }}</p>
							<div class="mt-[6px] flex gap-[10px] text-[0.6875rem] text-[var(--color-brand-text-secondary)]">
								<span v-for="sub in card.subs" :key="sub.text" :class="sub.cls">{{ sub.text }}</span>
							</div>
						</div>
					</div>

					<div class="sf-admin-orders-card rounded-[12px] bg-white p-[20px] desktop:p-[28px]">
						<div class="mb-[16px] flex items-center justify-between">
							<div>
								<h2 class="text-[1.0625rem] font-bold text-[var(--color-brand-text)]">Ultimi ordini</h2>
								<p class="mt-[4px] text-[0.75rem] text-[var(--color-brand-text-secondary)]">
									Vista rapida limitata agli ultimi {{ recentOrders.length }} ordini sincronizzati.
								</p>
							</div>
							<NuxtLink
								to="/account/amministrazione/ordini"
								class="inline-flex items-center gap-[4px] text-[0.75rem] font-medium text-[var(--color-brand-text-secondary)] hover:text-[var(--color-brand-primary)] hover:underline">
								Gestione completa
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[14px] w-[14px]" fill="currentColor">
									<path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />
								</svg>
							</NuxtLink>
						</div>

						<div v-if="!recentOrders.length" class="py-[28px] text-center text-[var(--color-brand-text-secondary)]">
							<p>Nessun ordine recente.</p>
						</div>

						<div v-else class="space-y-[8px]">
							<div
								v-for="order in recentOrders"
								:key="order.id"
								class="flex items-center justify-between rounded-[12px] border border-[#F0F0F0] p-[12px] transition-colors hover:border-[var(--color-brand-border)]">
								<div class="flex items-center gap-[14px]">
									<span class="text-[0.8125rem] font-bold text-[var(--color-brand-text)]">#{{ order.id }}</span>
									<span class="text-[0.8125rem] text-[#404040]">{{ order.user?.name }} {{ order.user?.surname }}</span>
								</div>
								<div class="flex items-center gap-[12px]">
									<span class="text-[0.875rem] font-semibold text-[var(--color-brand-text)]">
										&euro;{{ formatCents(order.subtotal?.amount ?? order.subtotal) }}
									</span>
									<span
										:class="[
											'inline-flex items-center gap-[4px] rounded-full px-[10px] py-[3px] text-[0.6875rem] font-medium',
											orderStatusConfig[order.status]?.bg || 'bg-gray-50',
											orderStatusConfig[order.status]?.text || 'text-gray-700',
										]">
										<span
											class="h-[8px] w-[8px] rounded-full bg-current"
											:class="orderStatusConfig[order.status]?.text || 'text-gray-700'"></span>
										{{ orderStatusConfig[order.status]?.label || order.status }}
									</span>
									<span class="hidden text-[0.75rem] text-[var(--color-brand-text-secondary)] desktop:inline">{{ formatDate(order.created_at) }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div v-else class="py-[60px] text-center text-[var(--color-brand-text-secondary)]">
					<div class="sf-account-panel mx-auto max-w-[520px] rounded-[24px] p-[28px] desktop:p-[32px]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#B45309]">Dashboard non disponibile</p>
						<h2 class="mt-[6px] text-[1.125rem] font-bold text-[var(--color-brand-text)]">Sincronizzazione interrotta</h2>
						<p class="mt-[10px] text-[0.9375rem] leading-[1.6] text-[#667281]">
							{{ loadError || 'Impossibile caricare i dati della dashboard. Riprova.' }}
						</p>
						<button
							type="button"
							class="btn-secondary mt-[16px]"
							@click="
								isLoading = true;
								fetchDashboard().then(() => {
									isLoading = false;
								});
							">
							Riprova
						</button>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
