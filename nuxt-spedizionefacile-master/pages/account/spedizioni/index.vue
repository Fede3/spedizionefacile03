<script setup>
definePageMeta({
	middleware: ["sanctum:auth"],
});

const filters = ref(["Tutti", "Aperti", "Chiusi", "Annullati", "In giacenza", "Bozze"]);
const activeFilter = ref(0);
const textFilter = ref("Tutti");

const { data: orders, refresh, status: ordersStatus } = useSanctumFetch("/api/orders", {
	method: "GET",
});

const changeFilter = (filter, filterIndex) => {
	activeFilter.value = filterIndex;
	textFilter.value = filter;
};

const statusRaw = (status) => {
	const map = {
		'In attesa': 'pending',
		'In lavorazione': 'processing',
		'Completato': 'completed',
		'Fallito': 'payment_failed',
		'Pagato': 'payed',
		'Annullato': 'cancelled',
		'In transito': 'in_transit',
		'Consegnato': 'delivered',
		'In giacenza': 'in_giacenza',
	};
	return map[status] || status;
};

const statusColor = (status) => {
	const raw = statusRaw(status);
	const map = {
		pending: 'bg-yellow-100 text-yellow-700',
		processing: 'bg-blue-100 text-blue-700',
		completed: 'bg-emerald-100 text-emerald-700',
		payment_failed: 'bg-red-100 text-red-700',
		payed: 'bg-emerald-100 text-emerald-700',
		cancelled: 'bg-gray-100 text-gray-700',
		in_transit: 'bg-blue-100 text-blue-700',
		delivered: 'bg-emerald-100 text-emerald-700',
		in_giacenza: 'bg-orange-100 text-orange-700',
	};
	return map[raw] || 'bg-gray-100 text-gray-700';
};

const filteredOrders = computed(() => {
	if (!orders.value?.data) return [];
	if (textFilter.value === 'Tutti') return orders.value.data;

	const filterMap = {
		'Aperti': ['In attesa', 'In lavorazione', 'In transito', 'Pagato'],
		'Chiusi': ['Completato', 'Consegnato'],
		'Annullati': ['Annullato', 'Fallito'],
		'In giacenza': ['In giacenza'],
		'Bozze': ['pending'],
	};

	const allowed = filterMap[textFilter.value] || [];
	return orders.value.data.filter(order => allowed.includes(order.status));
});

const formatDate = (dateStr) => {
	if (!dateStr) return '—';
	try {
		const d = new Date(dateStr);
		return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
	} catch (e) {
		return dateStr;
	}
};

const getPackageIcon = (item) => {
	const type = item?.package_type?.toLowerCase() || '';
	if (type.includes('pallet')) return '/img/quote/first-step/pallet.png';
	if (type.includes('busta')) return '/img/quote/first-step/envelope.png';
	return '/img/quote/first-step/pack.png';
};

const getRouteLabel = (order) => {
	if (!order.packages?.length) return '—';
	const pkg = order.packages[0];
	const originCity = pkg.origin_address?.city || '';
	const originProv = pkg.origin_address?.province || '';
	const destCity = pkg.destination_address?.city || '';
	const destProv = pkg.destination_address?.province || '';
	return `${originCity}${originProv ? '(' + originProv + ')' : ''} → ${destCity}${destProv ? '(' + destProv + ')' : ''}`;
};

const getServiceLabel = (order) => {
	if (!order.packages?.length) return '—';
	return order.packages[0].services?.service_type?.split(',')[0]?.trim() || 'Espresso Nazionale';
};

const getSenderName = (order) => {
	if (!order.packages?.length) return '—';
	return order.packages[0].origin_address?.name || '—';
};

const getRecipientName = (order) => {
	if (!order.packages?.length) return '—';
	return order.packages[0].destination_address?.name || '—';
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[80px]">
		<div class="my-container max-w-[1200px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866]">Il tuo account</NuxtLink>
				<span class="mx-[6px]">/</span>
				<span class="font-semibold text-[#252B42]">Spedizioni</span>
			</div>

			<!-- Title -->
			<h1 class="text-[2rem] font-bold text-[#252B42] mb-[24px]">Spedizioni</h1>

			<!-- Table Header Row (like the screenshot) -->
			<div class="hidden desktop:block bg-[#E6E6E6] rounded-t-[12px] px-[20px] py-[12px] text-[0.75rem] font-bold text-[#252B42] border-b-[2px] border-[#E44203]">
				<div class="flex items-center gap-[8px] flex-wrap">
					<span class="w-[80px]"># Sped.</span>
					<span class="w-[80px]">[# Ordine]</span>
					<span class="w-[100px]">[Provenienza]</span>
					<span class="w-[100px]">[Data acquisto]</span>
					<span class="w-[70px]">Etichetta</span>
					<span class="w-[120px]">Servizio</span>
					<span class="w-[80px]">[Dett. Colli Dich.]</span>
					<span class="w-[80px]">[Dett. Colli Rilev.]</span>
					<span class="w-[70px]">Accessori</span>
					<span class="w-[90px]">Ultimo Status</span>
					<span class="flex-1">Azioni</span>
				</div>
			</div>

			<!-- Filter Tabs -->
			<div class="flex flex-wrap gap-[8px] mb-[24px] mt-[20px]">
				<button
					v-for="(filter, filterIndex) in filters"
					:key="filterIndex"
					@click="changeFilter(filter, filterIndex)"
					type="button"
					:class="filterIndex === activeFilter
						? 'bg-[#095866] text-white'
						: 'bg-[#F0F0F0] text-[#737373] hover:bg-[#E0E0E0]'"
					class="px-[18px] py-[10px] rounded-[30px] text-[0.875rem] font-medium cursor-pointer transition-colors">
					{{ filter }}
				</button>
			</div>

			<!-- Loading -->
			<div v-if="ordersStatus === 'pending'" class="space-y-[12px]">
				<div v-for="n in 3" :key="n" class="bg-white rounded-[16px] border border-[#E9EBEC] p-[20px_24px] animate-pulse">
					<div class="flex items-center gap-[16px]">
						<div class="w-[44px] h-[44px] rounded-[10px] bg-gray-200"></div>
						<div class="flex-1 space-y-[8px]">
							<div class="h-[14px] bg-gray-200 rounded w-[60%]"></div>
							<div class="h-[12px] bg-gray-200 rounded w-[40%]"></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Orders list -->
			<div v-else-if="filteredOrders.length > 0" class="space-y-[12px]">
				<div
					v-for="order in filteredOrders"
					:key="order.id"
					class="bg-white rounded-[16px] border border-[#E9EBEC] overflow-hidden">

					<!-- Card header -->
					<div class="bg-[#F8F9FB] px-[20px] py-[12px] border-b border-[#E9EBEC] flex items-center justify-between">
						<div class="flex items-center gap-[10px]">
							<span class="text-[0.9375rem] font-bold text-[#252B42]">
								Pacco {{ order.packages?.length || 0 }}#
							</span>
							<span class="text-[0.9375rem] text-[#252B42]">
								BRT {{ getServiceLabel(order) }}
							</span>
							<a href="#" class="text-[#095866]" title="Apri tracking">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
							</a>
						</div>
						<div class="flex items-center gap-[8px]">
							<span :class="statusColor(order.status)" class="px-[12px] py-[4px] rounded-full text-[0.75rem] font-semibold inline-block">
								{{ order.status }}
							</span>
							<span class="text-[0.8125rem] text-[#737373]">
								A <span class="font-semibold text-[#252B42]">{{ getRecipientName(order) }}</span>
							</span>
						</div>
					</div>

					<!-- Card body - grid -->
					<div class="px-[20px] py-[16px]">
						<div class="grid grid-cols-2 desktop:grid-cols-6 gap-[16px]">
							<!-- Numero Ordine -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Numero Ordine</p>
								<p class="text-[0.875rem] font-semibold text-[#252B42]">#{{ order.id }}</p>
							</div>
							<!-- Data -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Data</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ order.created_at }}</p>
							</div>
							<!-- Indirizzo -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Indirizzo</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ getRouteLabel(order) }}</p>
							</div>
							<!-- Mittente -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Mittente</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ getSenderName(order) }}</p>
							</div>
							<!-- Destinatario -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Destinatario</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ getRecipientName(order) }}</p>
							</div>
							<!-- Servizio -->
							<div>
								<p class="text-[0.6875rem] font-bold text-[#737373] uppercase tracking-wider mb-[4px]">Servizio</p>
								<p class="text-[0.875rem] text-[#252B42]">{{ getServiceLabel(order) }}</p>
							</div>
						</div>
					</div>

					<!-- Card footer - actions -->
					<div class="px-[20px] py-[10px] border-t border-[#E9EBEC] flex items-center justify-end gap-[8px]">
						<NuxtLink :to="`/account/spedizioni/${order.id}`" title="Vedi dettagli" class="w-[32px] h-[32px] rounded-[8px] bg-[#095866]/10 flex items-center justify-center hover:bg-[#095866]/20 transition">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
						</NuxtLink>
					</div>
				</div>
			</div>

			<!-- Empty state -->
			<div v-else class="bg-white rounded-[16px] p-[48px] border border-[#E9EBEC] text-center">
				<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" class="text-[#C8CCD0]"><path fill="currentColor" d="M18 18.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m1.5-9l1.96 2.5H17V9.5m-11 9a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 6 15.5A1.5 1.5 0 0 1 7.5 17A1.5 1.5 0 0 1 6 18.5M20 8h-3V4H3c-1.11 0-2 .89-2 2v11h2a3 3 0 0 0 3 3a3 3 0 0 0 3-3h6a3 3 0 0 0 3 3a3 3 0 0 0 3-3h2v-5z"/></svg>
				</div>
				<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessuna spedizione</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
					Non hai ancora effettuato nessun ordine. Configura la tua prima spedizione per iniziare.
				</p>
				<NuxtLink to="/preventivo" class="inline-block px-[24px] py-[12px] bg-[#095866] hover:bg-[#0a7a8c] text-white rounded-[10px] font-semibold text-[0.9375rem] transition-colors">
					Crea nuova spedizione
				</NuxtLink>
			</div>
		</div>
	</section>
</template>
