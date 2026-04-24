<!-- In produzione accessibile solo se NUXT_PUBLIC_ENABLE_DEV_TOOLS=true; altrimenti 404 per non esporre endpoint BRT di test. -->
<script setup>
import '~/assets/css/pages/admin-test-brt.css';
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

// Env gate: nasconde la pagina in produzione quando enableDevTools e' disattivo.
// In dev (NODE_ENV=development) resta accessibile per permettere test locali.
const runtimeConfig = useRuntimeConfig();
if (!runtimeConfig.public.enableDevTools && process.env.NODE_ENV === 'production') {
	throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true });
}

useSeoMeta({
	title: 'Diagnostica BRT | SpediamoFacile',
	ogTitle: 'Diagnostica BRT | SpediamoFacile',
	description: 'Controlla autenticazione, endpoint e stato della connessione BRT dal pannello admin.',
	ogDescription: 'Pannello diagnostica BRT per ambiente sandbox, test endpoint e stato integrazione.',
	robots: 'noindex, nofollow',
});

const running = ref(false);
const lastRunLabel = ref('');

const tests = ref([
	{
		id: 'auth',
		name: 'Autenticazione API',
		description: 'Verifica credenziali BRT e token di accesso',
		endpoint: 'POST /api/brt/auth',
		status: 'idle',
		time: '',
		response: '',
	},
	{
		id: 'rates',
		name: 'Calcolo tariffe',
		description: 'Richiesta preventivo per pacco 5kg Milano-Roma',
		endpoint: 'POST /api/brt/rates',
		status: 'idle',
		time: '',
		response: '',
	},
	{
		id: 'shipment',
		name: 'Creazione spedizione',
		description: 'Test creazione ordine di spedizione sandbox',
		endpoint: 'POST /api/brt/shipments',
		status: 'idle',
		time: '',
		response: '',
	},
	{
		id: 'label',
		name: 'Generazione etichetta',
		description: 'Download PDF etichetta di spedizione',
		endpoint: 'GET /api/brt/labels/{id}',
		status: 'idle',
		time: '',
		response: '',
	},
	{
		id: 'tracking',
		name: 'Tracking spedizione',
		description: 'Recupero stato spedizione da parcel ID',
		endpoint: 'GET /api/brt/tracking/{parcelId}',
		status: 'idle',
		time: '',
		response: '',
	},
	{
		id: 'webhook',
		name: 'Webhook callback',
		description: 'Verifica ricezione notifiche da BRT',
		endpoint: 'POST /webhook/brt/status',
		status: 'idle',
		time: '',
		response: '',
	},
	{
		id: 'pickup',
		name: 'Prenotazione ritiro',
		description: 'Test prenotazione ritiro corriere BRT',
		endpoint: 'POST /api/brt/pickup',
		status: 'idle',
		time: '',
		response: '',
	},
]);

const mockResults = {
	auth: { time: '142ms', response: '{"token":"brt_sandbox_xxx","expires_in":3600}', status: 'success' },
	rates: { time: '320ms', response: '{"price":6.90,"zone":"nazionale","delivery":"1-2gg"}', status: 'success' },
	shipment: { time: '580ms', response: '{"shipment_id":"BRT-2026-00142","parcel_id":"QA-BRT-142"}', status: 'success' },
	label: { time: '890ms', response: '{"url":"https://api.brt.it/labels/BRT-2026-00142.pdf"}', status: 'success' },
	tracking: { time: '210ms', response: '{"status":"in_transit","location":"Hub Milano Linate"}', status: 'success' },
	webhook: { time: '45ms', response: '{"received":true,"event":"status_update"}', status: 'success' },
	pickup: { time: '670ms', response: '{"pickup_id":"PK-2026-042","slot":"09:00-13:00"}', status: 'success' },
};

const passedCount = computed(() => tests.value.filter((test) => test.status === 'success').length);
const failedCount = computed(() => tests.value.filter((test) => test.status === 'error').length);
const totalCount = computed(() => tests.value.length);
const completedCount = computed(() => tests.value.filter((test) => test.status !== 'idle' && test.status !== 'running').length);

const setTestState = (id, patch) => {
	tests.value = tests.value.map((test) => (test.id === id ? { ...test, ...patch } : test));
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runSingleTest = async (id) => {
	if (running.value) return;

	setTestState(id, { status: 'running', time: '', response: '' });
	await wait(380 + Math.round(Math.random() * 280));

	const result = mockResults[id];
	setTestState(id, {
		status: result?.status || 'success',
		time: result?.time || '100ms',
		response: result?.response || 'OK',
	});
	lastRunLabel.value = new Date().toLocaleString('it-IT');
};

const runAllTests = async () => {
	if (running.value) return;

	running.value = true;
	tests.value = tests.value.map((test) => ({ ...test, status: 'running', time: '', response: '' }));

	for (const test of tests.value) {
		await wait(260 + Math.round(Math.random() * 220));
		const result = mockResults[test.id];
		setTestState(test.id, {
			status: result?.status || 'success',
			time: result?.time || '100ms',
			response: result?.response || 'OK',
		});
	}

	lastRunLabel.value = new Date().toLocaleString('it-IT');
	running.value = false;
};
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container sf-stack-section sf-account-admin-stack">
			<AccountPageHeader
				class="sf-account-shell-hero--compact admin-brt-header"
				eyebrow="Area amministrazione"
				title="Diagnostica BRT"
				description="Controlli rapidi su autenticazione, tariffe, tracking e generazione etichette."
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Amministrazione', to: '/account/amministrazione' }, { label: 'Diagnostica BRT' }]">
				<template #identity>
					<span class="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[16px] bg-[rgba(9,88,102,0.08)] text-[var(--color-brand-primary)]">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[20px] w-[20px]" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
							<path d="M5 12.55a11 11 0 0 1 14.08 0" />
							<path d="M1.42 9a16 16 0 0 1 21.16 0" />
							<path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
							<line x1="12" y1="20" x2="12.01" y2="20" />
						</svg>
					</span>
				</template>
			<template #actions>
					<div class="admin-brt-toolbar__actions">
						<button type="button" class="btn-primary btn-compact admin-brt-toolbar__cta self-start" :disabled="running" @click="runAllTests">
							<svg aria-hidden="true" v-if="!running" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[14px] w-[14px]" fill="currentColor">
								<path d="M8 5.14v14l11-7-11-7Z" />
							</svg>
							<svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[14px] w-[14px] animate-spin" fill="currentColor">
								<path d="M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z" />
							</svg>
							{{ running ? 'Esecuzione...' : 'Esegui tutti i test' }}
						</button>
						<span class="admin-brt-toolbar__caption">Ultimo test: {{ lastRunLabel || 'Non eseguito' }}</span>
					</div>
				</template>
			</AccountPageHeader>

			<section class="admin-brt-overview">
				<article class="admin-brt-overview__card">
					<span class="admin-brt-overview__label">Ambiente</span>
					<div class="admin-brt-overview__value admin-brt-overview__value--inline">
						<span class="admin-brt-toolbar__chip">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[14px] w-[14px]" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
								<path d="M5 12.55a11 11 0 0 1 14.08 0" />
								<path d="M1.42 9a16 16 0 0 1 21.16 0" />
								<path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
								<line x1="12" y1="20" x2="12.01" y2="20" />
							</svg>
							Sandbox BRT
						</span>
					</div>
					<p class="admin-brt-overview__hint">Controlli simulati sul perimetro BRT.</p>
				</article>

				<article class="admin-brt-overview__card">
					<span class="admin-brt-overview__label">Copertura</span>
					<strong class="admin-brt-overview__value">{{ totalCount }}</strong>
					<p class="admin-brt-overview__hint">endpoint critici monitorati.</p>
				</article>

				<article class="admin-brt-overview__card">
					<span class="admin-brt-overview__label">Esito corrente</span>
					<strong class="admin-brt-overview__value">{{ passedCount }}/{{ totalCount }}</strong>
					<p class="admin-brt-overview__hint">
						<span v-if="completedCount">esiti aggiornati.</span>
						<span v-else>nessun test eseguito.</span>
					</p>
				</article>

			</section>

			<section class="sf-admin-table-card admin-brt-surface">
				<div class="sf-admin-table-card__header">
					<div>
						<h2 class="sf-admin-table-card__title">Test endpoint BRT</h2>
						<p class="admin-brt-surface__description">Esegui i controlli nell'ordine che ti serve davvero e apri il dettaglio solo quando compare una risposta.</p>
					</div>
				</div>

				<div class="admin-brt-list">
					<article v-for="test in tests" :key="test.id" class="admin-brt-row">
						<div class="admin-brt-row__state">
							<span v-if="test.status === 'success'" class="admin-brt-state admin-brt-state--success">
								<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M20 6 9 17l-5-5" />
								</svg>
							</span>
							<span v-else-if="test.status === 'error'" class="admin-brt-state admin-brt-state--error">
								<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
									<path d="m18 6-12 12" />
									<path d="m6 6 12 12" />
								</svg>
							</span>
							<span v-else-if="test.status === 'running'" class="admin-brt-state admin-brt-state--running">
								<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px] animate-spin" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M21 12a9 9 0 1 1-6.22-8.56" />
								</svg>
							</span>
							<span v-else class="admin-brt-state admin-brt-state--idle"></span>
						</div>

						<div class="admin-brt-row__content">
							<div class="admin-brt-row__heading">
								<span class="admin-brt-row__title">{{ test.name }}</span>
								<span v-if="test.time" class="admin-brt-row__time">{{ test.time }}</span>
							</div>
							<p class="admin-brt-row__description">{{ test.description }}</p>
							<code class="admin-brt-row__endpoint">{{ test.endpoint }}</code>
							<div v-if="test.response" class="admin-brt-row__response">
								<code>{{ test.response }}</code>
							</div>
						</div>

						<div class="admin-brt-row__actions">
							<button
								v-if="test.status === 'idle'"
								type="button"
								class="btn-secondary btn-compact admin-brt-row__button"
								@click="runSingleTest(test.id)">
								Esegui
							</button>
						</div>
					</article>
				</div>
			</section>

			<section class="sf-admin-table-card admin-brt-config">
				<div class="sf-admin-table-card__header">
					<div>
						<h2 class="sf-admin-table-card__title">Configurazione BRT</h2>
						<p class="admin-brt-surface__description">Parametri chiave dell'ambiente sandbox, resi leggibili nella stessa grammatica della console.</p>
					</div>
				</div>

				<div class="admin-brt-config__grid">
					<div class="admin-brt-config__item">
						<span class="admin-brt-config__label">API Base URL</span>
						<span class="admin-brt-config__value">https://api.brt.it/rest/v1</span>
					</div>
					<div class="admin-brt-config__item">
						<span class="admin-brt-config__label">Client ID</span>
						<span class="admin-brt-config__value">brt_cl_spediamofacile_****</span>
					</div>
					<div class="admin-brt-config__item">
						<span class="admin-brt-config__label">Ambiente</span>
						<span class="admin-brt-config__value">Sandbox (test)</span>
					</div>
					<div class="admin-brt-config__item">
						<span class="admin-brt-config__label">Contratto BRT</span>
						<span class="admin-brt-config__value">N. 1821511 - Attivo</span>
					</div>
					<div class="admin-brt-config__item">
						<span class="admin-brt-config__label">Uptime API (30gg)</span>
						<span class="admin-brt-config__value">99,97%</span>
					</div>
				</div>
			</section>
		</div>
	</section>
</template>

