<!-- FILE: pages/account/pro/dashboard.vue -->
<script setup>
import { formatPrice } from '~/utils/price.js';

definePageMeta({ middleware: ['app-auth'] });

useSeoMeta({
	title: 'Dashboard Pro | SpediamoFacile',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const { user } = useSanctumAuth();

const isPro = computed(() => user.value?.role === 'Partner Pro');

const data = ref(null);
const isLoading = ref(true);
const loadError = ref('');

const fetchDashboard = async () => {
	isLoading.value = true;
	loadError.value = '';
	try {
		data.value = await sanctum('/api/pro/analytics/dashboard');
	} catch (e) {
		loadError.value = e?.response?._data?.message || 'Errore caricamento dashboard.';
	} finally {
		isLoading.value = false;
	}
};

const formatMonth = (ym) => {
	const [year, month] = ym.split('-');
	const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
	return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
};

const formatDate = (iso) => {
	if (!iso) return '—';
	const d = new Date(iso);
	return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusLabel = (status) => {
	const map = {
		pending: 'In attesa',
		processing: 'In lavorazione',
		label_generated: 'Etichetta pronta',
		in_transit: 'In transito',
		out_for_delivery: 'In consegna',
		delivered: 'Consegnata',
		returned: 'Reso',
		refused: 'Rifiutata',
		cancelled: 'Annullata',
		refunded: 'Rimborsata',
	};
	return map[status] || status;
};

/* Chart helpers */
const chartMaxValue = computed(() => {
	if (!data.value?.monthly_chart?.length) return 1;
	return Math.max(1, ...data.value.monthly_chart.map((m) => m.count));
});

const barHeight = (count) => {
	const pct = (count / chartMaxValue.value) * 100;
	return Math.max(2, pct);
};

/* Export CSV ultime 20 spedizioni */
const exportCsv = () => {
	if (!data.value?.latest_shipments?.length) return;
	const rows = data.value.latest_shipments;
	const header = 'id,status,subtotal_cents,created_at\n';
	const body = rows.map((r) => `${r.id},${r.status},${r.subtotal},${r.created_at}`).join('\n');
	const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `spedizioni_${new Date().toISOString().slice(0, 10)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
};

onMounted(() => {
	if (isPro.value) fetchDashboard();
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[20px] tablet:py-[24px] desktop:py-[28px]">
		<div class="my-container space-y-[20px]">
			<AccountPageHeader
				eyebrow="Pro"
				title="Dashboard Pro"
				description="Metriche, grafici e ultime spedizioni del tuo account Partner Pro."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Pro' },
					{ label: 'Dashboard' },
				]" />

			<div v-if="!isPro" class="ux-alert ux-alert--warning">
				<div class="flex-1">
					<p class="font-[700] text-[var(--color-brand-text)]">Funzionalità riservata ai Partner Pro</p>
				</div>
				<NuxtLink to="/account/account-pro" class="btn-primary btn-compact">Diventa Partner Pro</NuxtLink>
			</div>

			<template v-else>
				<div v-if="isLoading" class="grid gap-[14px] tablet:grid-cols-2 desktop:grid-cols-4">
					<div v-for="n in 4" :key="n" class="h-[100px] rounded-[16px] bg-[#F5F7F8] animate-pulse"></div>
				</div>

				<div v-else-if="loadError" class="ux-alert ux-alert--warning">
					<p class="flex-1">{{ loadError }}</p>
					<button type="button" class="btn-secondary btn-compact" @click="fetchDashboard">Riprova</button>
				</div>

				<template v-else-if="data">
					<!-- KPI cards -->
					<div class="grid gap-[14px] tablet:grid-cols-2 desktop:grid-cols-4">
						<div class="sf-account-panel rounded-[16px] p-[18px] border-l-[4px] border-l-[var(--color-brand-primary)]">
							<p class="text-[11px] uppercase font-[700] text-[var(--color-brand-text-muted)] tracking-wide">Spedizioni (30gg)</p>
							<p class="text-[28px] font-[900] text-[var(--color-brand-text)] mt-[4px]">{{ data.kpi.shipments_30d }}</p>
						</div>
						<div class="sf-account-panel rounded-[16px] p-[18px] border-l-[4px] border-l-[#E44203]">
							<p class="text-[11px] uppercase font-[700] text-[var(--color-brand-text-muted)] tracking-wide">Valore totale</p>
							<p class="text-[28px] font-[900] text-[var(--color-brand-text)] mt-[4px]">{{ formatPrice(data.kpi.total_value_cents) }}</p>
						</div>
						<div class="sf-account-panel rounded-[16px] p-[18px] border-l-[4px] border-l-[var(--color-brand-primary)]">
							<p class="text-[11px] uppercase font-[700] text-[var(--color-brand-text-muted)] tracking-wide">Media per spedizione</p>
							<p class="text-[28px] font-[900] text-[var(--color-brand-text)] mt-[4px]">{{ formatPrice(data.kpi.avg_per_shipment_cents) }}</p>
						</div>
						<div class="sf-account-panel rounded-[16px] p-[18px] border-l-[4px] border-l-[#047857]">
							<p class="text-[11px] uppercase font-[700] text-[var(--color-brand-text-muted)] tracking-wide">Consegne entro 48h</p>
							<p class="text-[28px] font-[900] text-[var(--color-brand-text)] mt-[4px]">{{ data.kpi.delivered_within_48h_rate }}%</p>
						</div>
					</div>

					<!-- Chart mensile -->
					<div class="sf-account-panel rounded-[16px] p-[20px] desktop:p-[24px]">
						<h3 class="text-[15px] font-[800] text-[var(--color-brand-text)] mb-[16px]">Spedizioni ultimi 12 mesi</h3>
						<div class="flex items-end gap-[6px] h-[180px] border-b border-[rgba(9,88,102,0.08)]">
							<div
								v-for="month in data.monthly_chart"
								:key="month.month"
								class="flex-1 flex flex-col items-center justify-end gap-[6px]">
								<span class="text-[10px] font-[700] text-[var(--color-brand-text-muted)]">{{ month.count }}</span>
								<div
									class="w-full rounded-t-[4px] transition-all duration-300"
									:class="month.count > 0 ? 'bg-[var(--color-brand-primary)]' : 'bg-[rgba(9,88,102,0.10)]'"
									:style="`height: ${barHeight(month.count)}%; min-height: 2px;`"
									:title="`${month.count} spedizioni — ${formatPrice(month.value_cents)}`"></div>
							</div>
						</div>
						<div class="flex gap-[6px] mt-[8px]">
							<span v-for="month in data.monthly_chart" :key="month.month" class="flex-1 text-center text-[10px] font-[700] text-[var(--color-brand-text-muted)]">
								{{ formatMonth(month.month) }}
							</span>
						</div>
					</div>

					<!-- Top destinazioni + servizi -->
					<div class="grid gap-[14px] tablet:grid-cols-2">
						<div class="sf-account-panel rounded-[16px] p-[20px]">
							<h3 class="text-[15px] font-[800] text-[var(--color-brand-text)] mb-[14px]">Top 5 destinazioni</h3>
							<div v-if="data.top_destinations.length === 0" class="text-[13px] text-[var(--color-brand-text-muted)]">Nessun dato disponibile.</div>
							<ul v-else class="space-y-[8px]">
								<li v-for="dest in data.top_destinations" :key="dest.province" class="flex items-center justify-between text-[13px]">
									<span class="font-[700] text-[var(--color-brand-text)]">{{ dest.province }}</span>
									<span class="text-[var(--color-brand-text-muted)]">{{ dest.count }} spedizioni</span>
								</li>
							</ul>
						</div>

						<div class="sf-account-panel rounded-[16px] p-[20px]">
							<h3 class="text-[15px] font-[800] text-[var(--color-brand-text)] mb-[14px]">Top 5 servizi</h3>
							<div v-if="data.top_services.length === 0" class="text-[13px] text-[var(--color-brand-text-muted)]">Nessun dato disponibile.</div>
							<ul v-else class="space-y-[8px]">
								<li v-for="svc in data.top_services" :key="svc.service_type" class="flex items-center justify-between text-[13px]">
									<span class="font-[700] text-[var(--color-brand-text)] capitalize">{{ svc.service_type }}</span>
									<span class="text-[var(--color-brand-text-muted)]">{{ svc.count }} spedizioni</span>
								</li>
							</ul>
						</div>
					</div>

					<!-- Ultime 20 spedizioni -->
					<div class="sf-account-panel rounded-[16px] p-[20px] desktop:p-[24px]">
						<div class="flex items-center justify-between gap-[12px] mb-[14px]">
							<h3 class="text-[15px] font-[800] text-[var(--color-brand-text)]">Ultime 20 spedizioni</h3>
							<button
								type="button"
								class="btn-secondary btn-compact inline-flex items-center gap-[6px]"
								:disabled="!data.latest_shipments.length"
								@click="exportCsv">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[12px] w-[12px]" fill="currentColor">
									<path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" />
								</svg>
								Export CSV
							</button>
						</div>

						<div v-if="data.latest_shipments.length === 0" class="text-center py-[40px] text-[13px] text-[var(--color-brand-text-muted)]">
							Nessuna spedizione ancora.
						</div>

						<div v-else class="overflow-x-auto">
							<table class="w-full text-[13px] border-collapse">
								<thead>
									<tr class="bg-[rgba(9,88,102,0.04)]">
										<th class="px-[10px] py-[8px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">ID</th>
										<th class="px-[10px] py-[8px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Stato</th>
										<th class="px-[10px] py-[8px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Importo</th>
										<th class="px-[10px] py-[8px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Data</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="ship in data.latest_shipments" :key="ship.id" class="border-b border-[rgba(9,88,102,0.06)]">
										<td class="px-[10px] py-[8px] font-mono">#{{ ship.id }}</td>
										<td class="px-[10px] py-[8px]">{{ statusLabel(ship.status) }}</td>
										<td class="px-[10px] py-[8px] font-[700]">{{ formatPrice(ship.subtotal) }}</td>
										<td class="px-[10px] py-[8px] text-[var(--color-brand-text-muted)]">{{ formatDate(ship.created_at) }}</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</template>
			</template>
		</div>
	</section>
</template>
