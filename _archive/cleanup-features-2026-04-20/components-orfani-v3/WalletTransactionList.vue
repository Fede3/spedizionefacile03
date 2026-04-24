<!-- Backend /api/wallet/movements: paginated Laravel {data, current_page, last_page}, amount in EUR, type ∈ {credit,debit}, source ∈ {stripe,wallet,commission,withdrawal,admin}. -->
<script setup>
import { formatEuro } from '~/utils/price.js';

const props = defineProps({
	items: { type: Array, default: () => [] },
	isLoading: { type: Boolean, default: false },
	error: { type: String, default: '' },
	currentPage: { type: Number, default: 1 },
	totalPages: { type: Number, default: 1 },
});

const emit = defineEmits(['page-change', 'retry', 'filter-change', 'ricarica']);

const selectedType = ref('all');
const selectedPeriod = ref('all');

const typeOptions = [
	{ value: 'all', label: 'Tutti i tipi' },
	{ value: 'credit', label: 'Accrediti' },
	{ value: 'debit', label: 'Addebiti' },
];

const periodOptions = [
	{ value: 'all', label: 'Sempre' },
	{ value: '7', label: 'Ultimi 7 giorni' },
	{ value: '30', label: 'Ultimi 30 giorni' },
	{ value: '90', label: 'Ultimi 90 giorni' },
];

watch([selectedType, selectedPeriod], () => {
	emit('filter-change', { type: selectedType.value, period: selectedPeriod.value });
});

/* Filtro client-side aggiuntivo per UX immediata */
const filtered = computed(() => {
	let out = Array.isArray(props.items) ? [...props.items] : [];
	if (selectedType.value !== 'all') {
		out = out.filter((m) => m.type === selectedType.value);
	}
	if (selectedPeriod.value !== 'all') {
		const days = Number(selectedPeriod.value);
		const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
		out = out.filter((m) => new Date(m.created_at).getTime() >= cutoff);
	}
	return out;
});

const sourceLabels = {
	stripe: 'Ricarica Stripe',
	wallet: 'Pagamento spedizione',
	commission: 'Commissione referral',
	withdrawal: 'Prelievo',
	admin: 'Aggiustamento admin',
	referral: 'Bonus referral',
};

const sourceLabel = (source) => sourceLabels[source] || source || 'Movimento';

const formatDate = (iso) => {
	if (!iso) return '-';
	try {
		return new Date(iso).toLocaleDateString('it-IT', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		});
	} catch {
		return iso;
	}
};

const formatTime = (iso) => {
	if (!iso) return '';
	try {
		return new Date(iso).toLocaleTimeString('it-IT', {
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch {
		return '';
	}
};

const amountClass = (type) =>
	type === 'credit' ? 'text-[#0a8a7a]' : 'text-[var(--color-brand-text)]';

const amountSign = (type) => (type === 'credit' ? '+' : '-');

const downloadCsv = () => {
	const rows = [
		['Data', 'Ora', 'Tipo', 'Origine', 'Descrizione', 'Importo (EUR)', 'Stato'],
		...filtered.value.map((m) => [
			formatDate(m.created_at),
			formatTime(m.created_at),
			m.type === 'credit' ? 'Accredito' : 'Addebito',
			sourceLabel(m.source),
			(m.description || '').replace(/[\r\n,;]/g, ' '),
			`${amountSign(m.type)}${Number(m.amount || 0).toFixed(2).replace('.', ',')}`,
			m.status || 'confirmed',
		]),
	];
	const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
	const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `wallet-movimenti-${new Date().toISOString().slice(0, 10)}.csv`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

const goToPage = (n) => {
	if (n < 1 || n > props.totalPages || n === props.currentPage) return;
	emit('page-change', n);
};

const isEmpty = computed(() => !props.isLoading && !props.error && filtered.value.length === 0);
</script>

<template>
	<section
		class="rounded-[20px] border border-[var(--color-brand-border)] bg-white p-[20px] tablet:p-[24px]"
		aria-label="Storico transazioni wallet">
		<header class="mb-[18px] flex flex-col gap-[14px] desktop:flex-row desktop:items-end desktop:justify-between">
			<div>
				<h2 class="text-[1.25rem] font-[800] leading-[1.2] text-[var(--color-brand-text)] tablet:text-[1.5rem]">
					Storico movimenti
				</h2>
				<p class="mt-[4px] text-[13px] text-[var(--color-brand-text-secondary)]">
					Ricariche, pagamenti, commissioni e prelievi.
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-[8px]">
				<label class="sr-only" for="wallet-filter-type">Filtra per tipo</label>
				<select
					id="wallet-filter-type"
					v-model="selectedType"
					class="h-[38px] rounded-full border border-[var(--color-brand-border)] bg-white px-[14px] text-[13px] font-[600] text-[var(--color-brand-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]">
					<option v-for="o in typeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
				</select>

				<label class="sr-only" for="wallet-filter-period">Filtra per periodo</label>
				<select
					id="wallet-filter-period"
					v-model="selectedPeriod"
					class="h-[38px] rounded-full border border-[var(--color-brand-border)] bg-white px-[14px] text-[13px] font-[600] text-[var(--color-brand-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]">
					<option v-for="o in periodOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
				</select>

				<button
					type="button"
					class="inline-flex h-[38px] items-center gap-[6px] rounded-full border border-[var(--color-brand-border)] bg-white px-[14px] text-[13px] font-[700] text-[var(--color-brand-text)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors disabled:opacity-50"
					:disabled="!filtered.length"
					@click="downloadCsv">
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
					CSV
				</button>
			</div>
		</header>

		<!-- Loader: 3 card skeleton unificate via SfSkeleton -->
		<div v-if="isLoading" class="space-y-[10px]" aria-live="polite" aria-busy="true">
			<SfSkeleton
				v-for="i in 3"
				:key="i"
				variant="custom"
				width="100%"
				height="64px"
				rounded="14px" />
		</div>

		<!-- Errore -->
		<div
			v-else-if="error"
			class="rounded-[14px] border border-[#fecaca] bg-[#fef2f2] p-[18px] text-center">
			<p class="text-[14px] font-[600] text-[#b91c1c]">{{ error }}</p>
			<button
				type="button"
				class="btn-secondary btn-sm mt-[12px]"
				@click="emit('retry')">
				Riprova
			</button>
		</div>

		<!-- Vuoto — pattern sf-empty-state condiviso sitewide -->
		<div
			v-else-if="isEmpty"
			class="sf-empty-state"
			role="status">
			<div class="sf-empty-state__icon" aria-hidden="true">
				<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
					<rect x="2" y="6" width="20" height="13" rx="2.5" />
					<path d="M2 10h20" />
					<path d="M6 15h3" />
				</svg>
			</div>
			<h3 class="sf-empty-state__title">Il tuo portafoglio è ancora vuoto</h3>
			<p class="sf-empty-state__copy">
				Ricarica il credito in pochi secondi con Stripe: lo usi per pagare le spedizioni più rapidamente.
			</p>
			<div class="sf-empty-state__actions">
				<button
					type="button"
					class="sf-empty-state__cta"
					@click="emit('ricarica')">
					<span>Ricarica credito</span>
					<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
						<path d="M5 12h14" />
						<path d="m13 5 7 7-7 7" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Tabella desktop -->
		<div v-else class="hidden tablet:block">
			<table class="w-full border-collapse">
				<thead>
					<tr class="border-b border-[var(--color-brand-border)]">
						<th class="pb-[10px] pr-[12px] text-left text-[11px] font-[700] uppercase tracking-[0.10em] text-[var(--color-brand-text-muted)]">
							Data
						</th>
						<th class="pb-[10px] pr-[12px] text-left text-[11px] font-[700] uppercase tracking-[0.10em] text-[var(--color-brand-text-muted)]">
							Tipo
						</th>
						<th class="pb-[10px] pr-[12px] text-left text-[11px] font-[700] uppercase tracking-[0.10em] text-[var(--color-brand-text-muted)]">
							Descrizione
						</th>
						<th class="pb-[10px] pr-[12px] text-right text-[11px] font-[700] uppercase tracking-[0.10em] text-[var(--color-brand-text-muted)]">
							Importo
						</th>
						<th class="pb-[10px] text-right text-[11px] font-[700] uppercase tracking-[0.10em] text-[var(--color-brand-text-muted)]">
							Stato
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="m in filtered"
						:key="m.id"
						class="border-b border-[var(--color-brand-border)]/60 last:border-b-0 hover:bg-[var(--color-brand-bg-alt)]/60 transition-colors">
						<td class="py-[14px] pr-[12px] align-top">
							<p class="text-[13px] font-[700] text-[var(--color-brand-text)]">
								{{ formatDate(m.created_at) }}
							</p>
							<p class="text-[11px] text-[var(--color-brand-text-muted)]">
								{{ formatTime(m.created_at) }}
							</p>
						</td>
						<td class="py-[14px] pr-[12px] align-top">
							<span
								class="inline-flex items-center gap-[6px] rounded-full px-[10px] py-[3px] text-[11px] font-[700]"
								:class="
									m.type === 'credit'
										? 'bg-[#e7f5f1] text-[#0a8a7a]'
										: 'bg-[#fff1ec] text-[#E44203]'
								">
								<span
									class="h-[6px] w-[6px] rounded-full"
									:class="m.type === 'credit' ? 'bg-[#0a8a7a]' : 'bg-[#E44203]'"
									aria-hidden="true"></span>
								{{ m.type === 'credit' ? 'Accredito' : 'Addebito' }}
							</span>
						</td>
						<td class="py-[14px] pr-[12px] align-top">
							<p class="text-[13px] font-[600] text-[var(--color-brand-text)]">
								{{ m.description || sourceLabel(m.source) }}
							</p>
							<p class="text-[11px] text-[var(--color-brand-text-muted)]">
								{{ sourceLabel(m.source) }}
							</p>
						</td>
						<td class="py-[14px] pr-[12px] text-right align-top">
							<p class="text-[14px] font-[800]" :class="amountClass(m.type)">
								{{ amountSign(m.type) }}&#160;&#8364;{{ formatEuro(m.amount) }}
							</p>
						</td>
						<td class="py-[14px] text-right align-top">
							<span
								class="inline-flex items-center rounded-full px-[10px] py-[3px] text-[11px] font-[700]"
								:class="
									m.status === 'pending'
										? 'bg-[#fef3c7] text-[#92400e]'
										: 'bg-[#e7f5f1] text-[#0a8a7a]'
								">
								{{ m.status === 'pending' ? 'In attesa' : 'Confermato' }}
							</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Cards mobile -->
		<ul v-if="!isLoading && !error && !isEmpty" class="space-y-[10px] tablet:hidden">
			<li
				v-for="m in filtered"
				:key="m.id"
				class="rounded-[14px] border border-[var(--color-brand-border)] bg-white p-[14px]">
				<div class="flex items-start justify-between gap-[12px]">
					<div class="min-w-0">
						<span
							class="inline-flex items-center gap-[6px] rounded-full px-[8px] py-[2px] text-[10px] font-[700]"
							:class="
								m.type === 'credit'
									? 'bg-[#e7f5f1] text-[#0a8a7a]'
									: 'bg-[#fff1ec] text-[#E44203]'
							">
							{{ m.type === 'credit' ? 'Accredito' : 'Addebito' }}
						</span>
						<p class="mt-[6px] text-[13px] font-[700] text-[var(--color-brand-text)] truncate">
							{{ m.description || sourceLabel(m.source) }}
						</p>
						<p class="text-[11px] text-[var(--color-brand-text-muted)]">
							{{ formatDate(m.created_at) }} &#8226; {{ formatTime(m.created_at) }}
						</p>
					</div>
					<p class="shrink-0 text-[15px] font-[800]" :class="amountClass(m.type)">
						{{ amountSign(m.type) }}&#8364;{{ formatEuro(m.amount) }}
					</p>
				</div>
			</li>
		</ul>

		<!-- Paginazione -->
		<nav
			v-if="!isLoading && !error && totalPages > 1"
			class="mt-[18px] flex items-center justify-between border-t border-[var(--color-brand-border)] pt-[14px]"
			aria-label="Paginazione movimenti">
			<button
				type="button"
				class="inline-flex h-[36px] items-center gap-[6px] rounded-full border border-[var(--color-brand-border)] bg-white px-[14px] text-[13px] font-[700] text-[var(--color-brand-text)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
				:disabled="currentPage <= 1"
				@click="goToPage(currentPage - 1)">
				Precedente
			</button>
			<p class="text-[12px] font-[700] text-[var(--color-brand-text-secondary)]">
				Pagina {{ currentPage }} di {{ totalPages }}
			</p>
			<button
				type="button"
				class="inline-flex h-[36px] items-center gap-[6px] rounded-full border border-[var(--color-brand-border)] bg-white px-[14px] text-[13px] font-[700] text-[var(--color-brand-text)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
				:disabled="currentPage >= totalPages"
				@click="goToPage(currentPage + 1)">
				Successiva
			</button>
		</nav>
	</section>
</template>
