<!-- FILE: pages/account/amministrazione/audit-log.vue -->
<script setup lang="ts">
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Audit log | SpediamoFacile',
	robots: 'noindex, nofollow',
});

interface AuditEntry {
	id: number;
	created_at: string;
	action: string;
	actor_type: string;
	user_id: number | null;
	user?: { id: number; name?: string; surname?: string; email: string };
	target_type: string | null;
	target_id: number | null;
	ip: string | null;
	user_agent: string | null;
	context: Record<string, unknown> | null;
}

interface Paginated<T> {
	data: T[];
	current_page: number;
	last_page: number;
	per_page: number;
	total: number;
}

const sanctum = useSanctumClient();

const filters = reactive({
	action: '',
	user_id: '',
	target_type: '',
	ip: '',
	date_from: '',
	date_to: '',
	per_page: 50,
});

const page = ref(1);
const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<Paginated<AuditEntry> | null>(null);
const actions = ref<string[]>([]);
const selected = ref<AuditEntry | null>(null);

const queryParams = computed(() => {
	const q: Record<string, string | number> = { page: page.value, per_page: filters.per_page };
	if (filters.action) q.action = filters.action;
	if (filters.user_id) q.user_id = filters.user_id;
	if (filters.target_type) q.target_type = filters.target_type;
	if (filters.ip) q.ip = filters.ip;
	if (filters.date_from) q.date_from = filters.date_from;
	if (filters.date_to) q.date_to = filters.date_to;
	return q;
});

const buildQs = (params: Record<string, string | number>) =>
	Object.entries(params)
		.filter(([, v]) => v !== '' && v !== undefined && v !== null)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join('&');

const fetchData = async () => {
	loading.value = true;
	error.value = null;
	try {
		const qs = buildQs(queryParams.value);
		const res = await sanctum(`/api/admin/audit-logs?${qs}`) as Paginated<AuditEntry>;
		result.value = res;
	} catch (e: any) {
		error.value = e?.data?.message || 'Errore nel caricamento del registro.';
		result.value = null;
	} finally {
		loading.value = false;
	}
};

const fetchActions = async () => {
	try {
		const res = await sanctum('/api/admin/audit-logs/actions') as { actions: string[] };
		actions.value = res?.actions || [];
	} catch { /* noop */ }
};

const exportCsv = () => {
	const qs = buildQs(queryParams.value);
	const url = `/api/admin/audit-logs/export?${qs}`;
	window.open(url, '_blank');
};

const applyFilters = () => {
	page.value = 1;
	fetchData();
};

const resetFilters = () => {
	filters.action = '';
	filters.user_id = '';
	filters.target_type = '';
	filters.ip = '';
	filters.date_from = '';
	filters.date_to = '';
	page.value = 1;
	fetchData();
};

const goPage = (p: number) => {
	if (!result.value) return;
	page.value = Math.max(1, Math.min(result.value.last_page, p));
	fetchData();
};

const formatDate = (iso: string | null | undefined) => {
	if (!iso) return '—';
	try {
		return new Intl.DateTimeFormat('it-IT', {
			day: '2-digit', month: '2-digit', year: 'numeric',
			hour: '2-digit', minute: '2-digit', second: '2-digit',
		}).format(new Date(iso));
	} catch { return iso; }
};

const actorBadge = (a: string) => {
	const map: Record<string, string> = { admin: 'admin', user: 'user', system: 'system', guest: 'guest' };
	return map[a] || a;
};

const actionTone = (action: string): string => {
	if (action.startsWith('auth.login_failed') || action.includes('failed') || action.includes('reject')) return 'err';
	if (action.startsWith('admin.')) return 'admin';
	if (action.startsWith('order.') || action.startsWith('admin.order')) return 'order';
	return 'default';
};

onMounted(() => {
	fetchActions();
	fetchData();
});
</script>

<template>
	<div>
		<AccountPageHeader
			title="Registro attività"
			eyebrow="Amministrazione"
			description="Tutte le azioni significative tracciate per audit GDPR e sicurezza."
			:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Amministrazione', to: '/account/amministrazione/utenti' }, { label: 'Audit log' }]"
		/>

		<!-- Filtri -->
		<section class="sf-audit-filters">
			<div class="sf-audit-filters__row">
				<label>
					<span>Azione</span>
					<select v-model="filters.action">
						<option value="">Tutte</option>
						<option v-for="a in actions" :key="a" :value="a">{{ a }}</option>
					</select>
				</label>

				<label>
					<span>User ID</span>
					<input v-model="filters.user_id" type="number" placeholder="es. 42" min="1" />
				</label>

				<label>
					<span>Tipo target</span>
					<input v-model="filters.target_type" type="text" placeholder="es. Order" />
				</label>

				<label>
					<span>IP</span>
					<input v-model="filters.ip" type="text" placeholder="es. 10.0.0.1" />
				</label>

				<label>
					<span>Dal</span>
					<input v-model="filters.date_from" type="datetime-local" />
				</label>

				<label>
					<span>Al</span>
					<input v-model="filters.date_to" type="datetime-local" />
				</label>
			</div>

			<div class="sf-audit-filters__actions">
				<button type="button" class="sf-btn-primary" @click="applyFilters">Applica filtri</button>
				<button type="button" class="sf-btn-ghost" @click="resetFilters">Reset</button>
				<button type="button" class="sf-btn-ghost" @click="exportCsv">Export CSV</button>
			</div>
		</section>

		<!-- Risultati -->
		<div v-if="error" class="sf-audit-alert sf-audit-alert--err">{{ error }}</div>
		<div v-if="loading" class="sf-audit-loading">Caricamento…</div>

		<section v-else-if="result" class="sf-audit-table">
			<div class="sf-audit-table__meta">
				{{ result.total }} eventi · pagina {{ result.current_page }}/{{ result.last_page }}
			</div>
			<div class="sf-audit-table__wrap">
				<table>
					<thead>
						<tr>
							<th>Data/Ora</th>
							<th>Azione</th>
							<th>Attore</th>
							<th>Utente</th>
							<th>Target</th>
							<th>IP</th>
							<th aria-label="Azioni"></th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="row in result.data" :key="row.id" :class="`sf-audit-row sf-audit-row--${actionTone(row.action)}`">
							<td class="mono">{{ formatDate(row.created_at) }}</td>
							<td>
								<span class="sf-audit-action">{{ row.action }}</span>
							</td>
							<td>
								<span class="sf-audit-pill" :data-tone="row.actor_type">{{ actorBadge(row.actor_type) }}</span>
							</td>
							<td>
								<template v-if="row.user">
									<div class="sf-audit-user">
										<strong>{{ row.user.email }}</strong>
										<small>#{{ row.user.id }}</small>
									</div>
								</template>
								<span v-else class="muted">—</span>
							</td>
							<td>
								<template v-if="row.target_type">
									<span class="sf-audit-target">{{ row.target_type }}#{{ row.target_id }}</span>
								</template>
								<span v-else class="muted">—</span>
							</td>
							<td class="mono">{{ row.ip || '—' }}</td>
							<td>
								<button type="button" class="sf-audit-detail-btn" @click="selected = row">Dettagli</button>
							</td>
						</tr>
						<tr v-if="result.data.length === 0">
							<td colspan="7" class="sf-audit-empty">Nessun evento trovato per i filtri attuali.</td>
						</tr>
					</tbody>
				</table>
			</div>

			<!-- Paginazione -->
			<nav v-if="result.last_page > 1" class="sf-audit-pager" aria-label="Paginazione registro">
				<button type="button" :disabled="page <= 1" @click="goPage(page - 1)">‹ Prec</button>
				<span>Pagina {{ page }} di {{ result.last_page }}</span>
				<button type="button" :disabled="page >= result.last_page" @click="goPage(page + 1)">Succ ›</button>
			</nav>
		</section>

		<!-- Dettaglio modal -->
		<Teleport v-if="selected" to="body">
			<div class="sf-audit-modal" role="dialog" aria-modal="true">
				<div class="sf-audit-modal__overlay" @click="selected = null" />
				<div class="sf-audit-modal__panel" @click.stop>
					<header class="sf-audit-modal__head">
						<div>
							<h2>Dettaglio evento #{{ selected.id }}</h2>
							<p class="muted mono">{{ formatDate(selected.created_at) }}</p>
						</div>
						<button type="button" aria-label="Chiudi" @click="selected = null">×</button>
					</header>
					<dl class="sf-audit-modal__body">
						<div><dt>Azione</dt><dd>{{ selected.action }}</dd></div>
						<div><dt>Attore</dt><dd>{{ selected.actor_type }}</dd></div>
						<div><dt>Utente</dt><dd>{{ selected.user?.email || (selected.user_id ? `#${selected.user_id}` : '—') }}</dd></div>
						<div><dt>Target</dt><dd>{{ selected.target_type ? `${selected.target_type}#${selected.target_id}` : '—' }}</dd></div>
						<div><dt>IP</dt><dd class="mono">{{ selected.ip || '—' }}</dd></div>
						<div><dt>User agent</dt><dd class="ua">{{ selected.user_agent || '—' }}</dd></div>
						<div class="full">
							<dt>Context (JSON)</dt>
							<dd>
								<pre>{{ selected.context ? JSON.stringify(selected.context, null, 2) : '— vuoto —' }}</pre>
							</dd>
						</div>
					</dl>
				</div>
			</div>
		</Teleport>
	</div>
</template>

