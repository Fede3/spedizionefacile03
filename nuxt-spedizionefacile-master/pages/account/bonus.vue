<!--
  FILE: pages/account/bonus.vue
  SCOPO: Pagina bonus e promozioni — mostra le offerte disponibili per l'utente.
         "Invita un amico" (solo Partner Pro), "Ricarica e risparmia", "Diventa Partner Pro".
         I bonus visibili cambiano in base al ruolo dell'utente.
  API: nessuna (solo dati utente da useSanctumAuth).
  COMPONENTI: nessun componente custom.
  ROUTE: /account/bonus (middleware sanctum:auth).

  DATI IN INGRESSO:
    - user (da useSanctumAuth) — ruolo utente per filtrare i bonus visibili.

  DATI IN USCITA: nessuna (pagina informativa con link di navigazione).

  VINCOLI:
    - L'utente deve essere autenticato.
    - I bonus "Invita un amico" e "Prelievi" sono visibili solo ai Partner Pro.

  ERRORI TIPICI: nessuno (pagina statica condizionale).

  PUNTI DI MODIFICA SICURI:
    - Aggiungere nuovi bonus: aggiungere una nuova card nel template.
    - Cambiare le condizioni di visibilita': modificare i v-if sui blocchi.

  COLLEGAMENTI:
    - pages/account/account-pro.vue → richiesta/gestione Partner Pro.
    - pages/account/portafoglio.vue → ricarica portafoglio.
    - pages/account/prelievi.vue → prelievi commissioni.
-->
<script setup>
import { accountCardIcons } from '~/utils/accountNavigation';

/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ['app-auth'],
});

useSeoMeta({
	title: 'Bonus account | SpediamoFacile',
	ogTitle: 'Bonus account | SpediamoFacile',
	description: 'Consulta bonus, referral, wallet e opportunità Partner Pro dalla tua area account SpediamoFacile.',
	ogDescription: 'Bonus e promozioni disponibili nell area account SpediamoFacile.',
});

const { user } = useSanctumAuth();
const { uiSnapshot } = useAuthUiState();

/* Controlla se l'utente e' Partner Pro */
const effectiveRole = computed(() => uiSnapshot.value.role || user.value?.role || null);
const isPro = computed(() => effectiveRole.value === 'Partner Pro');

/**
 * Lista di tutti i bonus disponibili.
 * Ogni bonus ha: icona, titolo, descrizione, badge, link
 * e flag "proOnly" (visibile solo ai Pro) e "available" (se mostrarlo).
 */
const bonuses = computed(() => [
	{
		iconKey: 'share-variant',
		title: 'Invita un amico',
		description:
			'Condividi il tuo codice referral e guadagna il 5% di commissione su ogni spedizione. Il tuo amico riceve il 5% di sconto.',
		badge: '5% commissione',
		badgeColor: 'bg-emerald-50 text-emerald-700',
		meta: 'Attivo per Partner Pro',
		available: true,
		proOnly: true,
		action: '/account/account-pro',
		actionLabel: 'Vai al codice referral',
	},
	{
		iconKey: 'wallet',
		title: 'Ricarica e risparmia',
		description: 'Ricarica il portafoglio per pagare le spedizioni in modo rapido e conveniente. Nessuna commissione sulle ricariche.',
		badge: '0% commissioni',
		badgeColor: 'bg-[#F0F6F7] text-[#095866]',
		meta: 'Wallet pronto per checkout e ricariche',
		available: true,
		proOnly: false,
		action: '/account/portafoglio',
		actionLabel: 'Apri portafoglio',
	},
	{
		iconKey: 'account',
		title: 'Diventa Partner Pro',
		description: 'Sblocca vantaggi esclusivi: codice referral personale, commissioni sulle vendite e funzioni avanzate.',
		badge: 'Pro',
		badgeColor: 'bg-amber-50 text-amber-700',
		meta: "Richiesta guidata dall'area account",
		available: !isPro.value,
		proOnly: false,
		action: '/account/account-pro',
		actionLabel: 'Scopri Partner Pro',
	},
]);

/* Filtra i bonus: nasconde quelli "solo Pro" se l'utente non e' Pro, e quelli non disponibili */
const filteredBonuses = computed(() => {
	return bonuses.value.filter((b) => {
		if (b.proOnly && !isPro.value) return false;
		return b.available;
	});
});

const bonusHeader = computed(() => ({
	eyebrow: 'Promozioni account',
	title: 'Bonus e promozioni',
	description: 'Scopri i vantaggi attivi e apri subito la sezione giusta per usarli al meglio.',
}));

const bonusHeaderStats = computed(() => [
	{ label: 'Disponibili', value: `${filteredBonuses.value.length} voci` },
	{ label: 'Partner Pro', value: isPro.value ? 'Attivo' : 'Opzionale' },
]);
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[28px] desktop:py-[56px]">
		<div class="my-container">
			<AccountPageHeader
				:eyebrow="bonusHeader.eyebrow"
				:title="bonusHeader.title"
				:description="bonusHeader.description"
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Bonus' }]">
				<template #meta>
					<div class="flex flex-wrap gap-[8px]">
						<span
							v-for="stat in bonusHeaderStats"
							:key="stat.label"
							class="inline-flex items-center gap-[6px] rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.8125rem] font-semibold text-[#095866]">
							{{ stat.label }}: {{ stat.value }}
						</span>
					</div>
				</template>
			</AccountPageHeader>

			<div class="sf-account-panel mb-[16px] rounded-[24px] px-[16px] py-[14px] desktop:px-[20px] desktop:py-[16px]">
				<div class="flex flex-col gap-[10px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div>
						<p class="text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#095866]">Vantaggi attivi</p>
						<h2 class="mt-[4px] text-[1rem] font-bold text-[#252B42]">Stessa shell, azioni piu' immediate</h2>
						<p class="mt-[4px] text-[0.875rem] leading-[1.55] text-[#667281]">
							Apri subito la sezione giusta per referral, wallet o passaggio a Partner Pro senza uscire dal percorso account.
						</p>
					</div>
					<div class="flex flex-wrap gap-[8px]">
						<span class="sf-account-meta-pill">Account</span>
						<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ isPro ? 'Partner Pro attivo' : 'Upgrade disponibile' }}</span>
					</div>
				</div>
			</div>

			<div class="space-y-[14px]">
				<NuxtLink
					v-for="bonus in filteredBonuses"
					:key="bonus.title"
					:to="bonus.action"
					class="sf-account-panel group block rounded-[24px] p-[18px] desktop:p-[22px]">
					<div class="flex flex-col gap-[16px] desktop:flex-row desktop:items-start desktop:justify-between">
						<div class="flex flex-col gap-[16px] desktop:flex-row desktop:items-start">
							<div
								class="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[18px] bg-[#F0F6F7] text-[#095866] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[24px] w-[24px]"
									fill="currentColor"
									v-html="accountCardIcons[bonus.iconKey]"></svg>
							</div>
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-[8px]">
									<h2 class="text-[1.0625rem] font-bold text-[#252B42] transition-colors group-hover:text-[#095866]">
										{{ bonus.title }}
									</h2>
									<span
										:class="['inline-flex items-center rounded-full px-[10px] py-[4px] text-[0.6875rem] font-semibold', bonus.badgeColor]">
										{{ bonus.badge }}
									</span>
								</div>
								<p class="mt-[10px] max-w-[72ch] text-[0.875rem] leading-[1.6] text-[#667281]">
									{{ bonus.description }}
								</p>
								<p class="mt-[10px] text-[0.75rem] font-medium text-[#737373]">
									{{ bonus.meta }}
								</p>
							</div>
						</div>

						<div class="flex items-center">
							<span
								class="btn-secondary btn-compact inline-flex items-center gap-[6px] transition-transform group-hover:-translate-y-[1px]">
								{{ bonus.actionLabel }}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[16px] w-[16px]" fill="currentColor">
									<path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />
								</svg>
							</span>
						</div>
					</div>
				</NuxtLink>
			</div>

			<div v-if="filteredBonuses.length === 0" class="sf-account-panel mt-[14px] rounded-[24px] p-[32px] text-center desktop:p-[40px]">
				<div class="mx-auto mb-[18px] flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#F8F9FB] text-[#C8CCD0]">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						class="h-[30px] w-[30px]"
						fill="currentColor"
						v-html="accountCardIcons['tag-multiple']"></svg>
				</div>
				<h2 class="text-[1.2rem] font-bold text-[#252B42]">Nessun bonus disponibile</h2>
				<p class="mx-auto mt-[10px] max-w-[420px] text-[0.9375rem] leading-[1.6] text-[#667281]">
					Al momento non ci sono promozioni attive. Quando ci saranno nuovi vantaggi, compariranno qui nella stessa shell dell'account.
				</p>
			</div>
		</div>
	</section>
</template>
