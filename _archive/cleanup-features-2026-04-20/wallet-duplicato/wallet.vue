<!-- FILE: pages/account/wallet.vue -->
<script setup>
import { formatEuro } from '~/utils/price.js';

definePageMeta({ middleware: ['app-auth'] });

useHead({
	link: [
		{ rel: 'preconnect', href: 'https://js.stripe.com', crossorigin: '' },
		{ rel: 'preconnect', href: 'https://api.stripe.com', crossorigin: '' },
	],
});

useSeoMeta({
	title: 'Wallet | SpediamoFacile',
	ogTitle: 'Wallet | SpediamoFacile',
	description: 'Dashboard wallet: saldo, ricarica con Stripe, prelievi e storico transazioni.',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const { user } = useSanctumAuth();
const { uiSnapshot } = useAuthUiState();

const effectiveRole = computed(() => uiSnapshot.value.role || user.value?.role || null);
const isPro = computed(() => effectiveRole.value === 'Partner Pro');

/* ============ STATO ============ */
const balance = ref({ balance: 0, commission_balance: 0, pending: 0 });
const movements = ref([]);
const movementsMeta = ref({ current_page: 1, last_page: 1, total: 0 });
const movementsPage = ref(1);

const isLoadingBalance = ref(true);
const isLoadingMovements = ref(true);
const isRefreshing = ref(false);
const balanceError = ref('');
const movementsError = ref('');

const stripeConfigured = ref(false);
const defaultPaymentMethod = ref(null);

const showTopUpModal = ref(false);

const referralCode = ref('');
const isLoadingReferral = ref(false);
const referralCopied = ref(false);

const WITHDRAW_THRESHOLD_EUR = 5;

/* ============ HELPERS ============ */
const errMsg = (e, fallback) =>
	e?.response?._data?.message || e?.data?.message || e?.message || fallback;

const isValidStripeKey = (v) => {
	const k = String(v || '').trim();
	return k.startsWith('pk_') && !k.includes('placeholder');
};

/* ============ FETCH ============ */
const fetchBalance = async ({ silent = false } = {}) => {
	if (!silent) isLoadingBalance.value = true;
	balanceError.value = '';
	try {
		const res = await sanctum('/api/wallet/balance');
		balance.value = {
			balance: Number(res?.balance || 0),
			commission_balance: Number(res?.commission_balance || 0),
			pending: Number(res?.pending || 0),
		};
	} catch (e) {
		balanceError.value = errMsg(e, 'Saldo non disponibile.');
	} finally {
		isLoadingBalance.value = false;
	}
};

const fetchMovements = async ({ silent = false, page = movementsPage.value } = {}) => {
	if (!silent) isLoadingMovements.value = true;
	movementsError.value = '';
	try {
		const res = await sanctum(`/api/wallet/movements?page=${page}`);
		const data = res?.data || res || [];
		movements.value = Array.isArray(data) ? data : [];
		movementsMeta.value = {
			current_page: Number(res?.current_page || 1),
			last_page: Number(res?.last_page || 1),
			total: Number(res?.total || movements.value.length),
		};
	} catch (e) {
		movementsError.value = errMsg(e, 'Impossibile caricare i movimenti.');
		movements.value = [];
	} finally {
		isLoadingMovements.value = false;
	}
};

const fetchPaymentMethod = async () => {
	try {
		const res = await sanctum('/api/stripe/default-payment-method');
		defaultPaymentMethod.value = res || null;
	} catch {
		defaultPaymentMethod.value = null;
	}
};

const fetchStripeAvailability = async () => {
	const runtimeConfig = useRuntimeConfig();
	try {
		const cfg = await sanctum('/api/settings/stripe');
		const k = String(cfg?.publishable_key || '').trim();
		stripeConfigured.value = Boolean(cfg?.configured) && isValidStripeKey(k);
	} catch {
		const fb = String(runtimeConfig.public.stripeKey || '').trim();
		stripeConfigured.value = isValidStripeKey(fb);
	}
};

const fetchReferral = async () => {
	isLoadingReferral.value = true;
	try {
		const res = await sanctum('/api/referral/my-code');
		referralCode.value = res?.code || res?.referral_code || '';
	} catch {
		referralCode.value = '';
	} finally {
		isLoadingReferral.value = false;
	}
};

const refreshAll = async () => {
	isRefreshing.value = true;
	try {
		await Promise.allSettled([
			fetchBalance(),
			fetchMovements(),
			fetchPaymentMethod(),
			fetchStripeAvailability(),
			fetchReferral(),
		]);
	} finally {
		isRefreshing.value = false;
	}
};

onMounted(() => {
	refreshAll();
});

/* ============ STATISTICHE 30 GG ============ */
const stats30gg = computed(() => {
	const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
	const inRange = (movements.value || []).filter(
		(m) => new Date(m.created_at).getTime() >= cutoff,
	);
	const totCredit = inRange
		.filter((m) => m.type === 'credit')
		.reduce((s, m) => s + Number(m.amount || 0), 0);
	const totDebit = inRange
		.filter((m) => m.type === 'debit')
		.reduce((s, m) => s + Number(m.amount || 0), 0);
	const avg = inRange.length
		? inRange.reduce((s, m) => s + Number(m.amount || 0), 0) / inRange.length
		: 0;
	return {
		credit: totCredit,
		debit: totDebit,
		avg,
		count: inRange.length,
	};
});

/* ============ AZIONI ============ */
const openTopUp = () => {
	showTopUpModal.value = true;
};

const closeTopUp = () => {
	showTopUpModal.value = false;
};

const onTopUpSuccess = async () => {
	showTopUpModal.value = false;
	await Promise.allSettled([
		fetchBalance({ silent: true }),
		fetchMovements({ silent: true, page: 1 }),
	]);
	movementsPage.value = 1;
};

const goToWithdraw = async () => {
	// -- ARCHIVIATO 2026-04-20: pagina Prelievi dedicata (_archive/frontend-simplification-2026-04-20/features/prelievi-dedicati) --
	// Finché la feature è archiviata, indirizziamo l'utente al centro assistenza
	// per aprire richiesta di prelievo commissioni via canale manuale.
	await navigateTo('/account/assistenza');
};

const onMovementsPageChange = async (n) => {
	movementsPage.value = n;
	await fetchMovements({ page: n });
};

const onMovementsRetry = () => fetchMovements();
const onBalanceRetry = () => fetchBalance();

const copyReferral = async () => {
	if (!referralCode.value) return;
	const link = `${window.location.origin}/?ref=${referralCode.value}`;
	try {
		await navigator.clipboard.writeText(link);
		referralCopied.value = true;
		setTimeout(() => (referralCopied.value = false), 1800);
	} catch {
		/* noop */
	}
};
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[20px] tablet:py-[24px] desktop:py-[28px]">
		<div class="my-container max-w-[1280px]">
			<!-- Breadcrumb + header -->
			<AccountPageHeader
				eyebrow="Wallet"
				title="Il tuo wallet"
				description="Saldo disponibile, ricariche immediate e tutto lo storico in un'unica vista."
				current="Wallet">
				<template #meta>
					<div class="flex flex-wrap items-center gap-[8px]">
						<span class="sf-account-meta-pill">
							Saldo:
							{{ isLoadingBalance ? 'Caricamento' : `€${formatEuro(balance.balance)}` }}
						</span>
						<span class="sf-account-meta-pill sf-account-meta-pill--muted">
							Movimenti: {{ movementsMeta.total || 0 }}
						</span>
						<span class="sf-account-meta-pill sf-account-meta-pill--muted">
							Carta:
							{{
								defaultPaymentMethod?.card
									? `•••• ${defaultPaymentMethod.card.last4}`
									: 'Da aggiungere'
							}}
						</span>
					</div>
				</template>
			</AccountPageHeader>

			<!-- Saldo principale + statistiche -->
			<div
				class="grid grid-cols-1 gap-[18px] desktop:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] sf-animate-in sf-animate-in-1">
				<WalletBalanceCard
					:balance="balance.balance"
					:pending="balance.pending"
					:withdraw-threshold="WITHDRAW_THRESHOLD_EUR"
					:is-loading="isLoadingBalance"
					:error="balanceError"
					@ricarica="openTopUp"
					@preleva="goToWithdraw"
					@retry="onBalanceRetry" />

				<!-- Statistiche 30 gg -->
				<article
					class="rounded-[20px] border border-[var(--color-brand-border)] bg-white p-[20px] tablet:p-[22px]"
					aria-label="Statistiche ultimi 30 giorni">
					<header class="mb-[16px] flex items-center justify-between">
						<div>
							<h2 class="text-[1.0625rem] font-[800] text-[var(--color-brand-text)]">
								Ultimi 30 giorni
							</h2>
							<p class="text-[12px] text-[var(--color-brand-text-secondary)]">
								{{ stats30gg.count }} movimenti registrati
							</p>
						</div>
					</header>

					<dl class="grid grid-cols-3 gap-[10px]">
						<div
							class="rounded-[14px] border border-[var(--color-brand-border)] bg-[var(--color-brand-bg-alt)]/60 p-[12px]">
							<dt
								class="text-[10px] font-[700] uppercase tracking-[0.10em] text-[var(--color-brand-text-muted)]">
								Accrediti
							</dt>
							<dd class="mt-[6px] text-[1.125rem] font-[800] text-[#0a8a7a]">
								+&#8364;{{ formatEuro(stats30gg.credit) }}
							</dd>
						</div>
						<div
							class="rounded-[14px] border border-[var(--color-brand-border)] bg-[var(--color-brand-bg-alt)]/60 p-[12px]">
							<dt
								class="text-[10px] font-[700] uppercase tracking-[0.10em] text-[var(--color-brand-text-muted)]">
								Addebiti
							</dt>
							<dd class="mt-[6px] text-[1.125rem] font-[800] text-[var(--color-brand-accent)]">
								-&#8364;{{ formatEuro(stats30gg.debit) }}
							</dd>
						</div>
						<div
							class="rounded-[14px] border border-[var(--color-brand-border)] bg-[var(--color-brand-bg-alt)]/60 p-[12px]">
							<dt
								class="text-[10px] font-[700] uppercase tracking-[0.10em] text-[var(--color-brand-text-muted)]">
								Saldo medio
							</dt>
							<dd class="mt-[6px] text-[1.125rem] font-[800] text-[var(--color-brand-text)]">
								&#8364;{{ formatEuro(stats30gg.avg) }}
							</dd>
						</div>
					</dl>

					<button
						type="button"
						class="mt-[14px] inline-flex h-[36px] items-center gap-[6px] rounded-full border border-[var(--color-brand-border)] bg-white px-[14px] text-[12px] font-[700] text-[var(--color-brand-text)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors disabled:opacity-50"
						:disabled="isRefreshing"
						@click="refreshAll">
						<svg
							width="13"
							height="13"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true">
							<path d="M21 2v6h-6" />
							<path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
							<path d="M3 22v-6h6" />
							<path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
						</svg>
						{{ isRefreshing ? 'Aggiornamento…' : 'Aggiorna dati' }}
					</button>
				</article>
			</div>

			<!-- Storico transazioni -->
			<div class="mt-[20px] sf-animate-in sf-animate-in-2">
				<WalletTransactionList
					:items="movements"
					:is-loading="isLoadingMovements"
					:error="movementsError"
					:current-page="movementsMeta.current_page"
					:total-pages="movementsMeta.last_page"
					@page-change="onMovementsPageChange"
					@retry="onMovementsRetry"
					@ricarica="openTopUp" />
			</div>

			<!-- Referral mini -->
			<div class="mt-[20px] sf-animate-in sf-animate-in-3">
				<article
					class="rounded-[20px] border border-[var(--color-brand-border)] bg-gradient-to-br from-white to-[var(--color-brand-bg-alt)]/50 p-[20px] tablet:p-[24px]"
					aria-label="Programma referral">
					<div class="flex flex-col gap-[16px] tablet:flex-row tablet:items-center tablet:justify-between">
						<div class="max-w-[460px]">
							<p
								class="text-[11px] font-[700] uppercase tracking-[0.12em] text-[var(--color-brand-accent)]">
								Invita gli amici
							</p>
							<h2
								class="mt-[2px] text-[1.125rem] font-[800] leading-[1.25] text-[var(--color-brand-text)] tablet:text-[1.25rem]">
								Guadagna ad ogni nuovo iscritto
							</h2>
							<p class="mt-[6px] text-[13px] text-[var(--color-brand-text-secondary)]">
								Condividi il tuo codice: i tuoi amici ricevono uno sconto e tu un bonus sul wallet.
							</p>
						</div>

						<div class="flex flex-col items-stretch gap-[8px] tablet:items-end">
							<div
								v-if="referralCode"
								class="inline-flex items-center gap-[8px] rounded-full border border-[var(--color-brand-primary)]/30 bg-white px-[14px] py-[8px]">
								<span
									class="text-[10px] font-[700] uppercase tracking-[0.12em] text-[var(--color-brand-text-muted)]">
									Codice
								</span>
								<span
									class="font-mono text-[14px] font-[800] tracking-[0.08em] text-[var(--color-brand-primary)]">
									{{ referralCode }}
								</span>
							</div>
							<div v-else-if="isLoadingReferral" class="text-[12px] text-[var(--color-brand-text-muted)]">
								Caricamento codice…
							</div>

							<div class="flex gap-[8px]">
								<button
									type="button"
									class="btn-cta btn-sm"
									:disabled="!referralCode"
									@click="copyReferral">
									{{ referralCopied ? 'Copiato!' : 'Copia link' }}
								</button>
								<!-- -- ARCHIVIATO 2026-04-20: link "Dettagli" -> /account/bonus (_archive/frontend-simplification-2026-04-20/features/bonus-fedelta) -- -->
							</div>
						</div>
					</div>
				</article>
			</div>
		</div>

		<!-- Modale Ricarica -->
		<WalletTopUpModal
			:open="showTopUpModal"
			:default-payment-method="defaultPaymentMethod"
			:stripe-configured="stripeConfigured"
			@close="closeTopUp"
			@success="onTopUpSuccess"
			@payment-method-updated="fetchPaymentMethod" />
	</section>
</template>
