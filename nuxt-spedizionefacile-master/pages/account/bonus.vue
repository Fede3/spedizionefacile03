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
		badgeColor: 'bg-[#f0fdf4] text-[#0a8a7a]',
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
		badgeColor: 'bg-[#F0F6F7] text-[var(--color-brand-primary)]',
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
	<section class="sf-account-shell min-h-[600px] py-[20px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container max-w-[1280px]">
			<!-- Page shell header -->
			<div class="flex flex-col gap-[16px] tablet:gap-[16px] mb-[20px]">
				<NuxtLink to="/account"
					class="flex items-center gap-[6px] text-[var(--color-brand-text-muted)] text-[13px] cursor-pointer hover:text-[var(--color-brand-text-secondary)] transition-colors duration-[350ms] font-[500]">
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
					Dashboard
				</NuxtLink>
				<div class="flex items-center gap-[16px]">
					<div class="w-[48px] h-[48px] rounded-[14px] bg-[rgba(228,66,3,0.08)] flex items-center justify-center shrink-0">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="#E44203"><path d="M5.5,9A1.5,1.5 0 0,0 7,7.5A1.5,1.5 0 0,0 5.5,6A1.5,1.5 0 0,0 4,7.5A1.5,1.5 0 0,0 5.5,9M17.41,11.58C17.77,11.94 18,12.44 18,13C18,13.55 17.78,14.05 17.41,14.41L12.41,19.41C12.05,19.77 11.55,20 11,20C10.45,20 9.95,19.78 9.58,19.41L2.59,12.42C2.22,12.05 2,11.55 2,11V6C2,4.89 2.89,4 4,4H9C9.55,4 10.05,4.22 10.41,4.58L17.41,11.58M13.54,5.71L14.54,4.71L21.41,11.58C21.78,11.94 22,12.45 22,13C22,13.55 21.78,14.05 21.42,14.41L16.04,19.79L15.04,18.79L20.75,13L13.54,5.71Z"/></svg>
					</div>
					<div>
						<h1 class="text-[var(--color-brand-text)] text-[24px] tablet:text-[28px] tracking-[-0.5px] font-[800]">Bonus e promozioni</h1>
						<p class="text-[var(--color-brand-text-muted)] text-[13px] tablet:text-[14px] mt-[2px]">Scopri i vantaggi attivi e le opportunita disponibili</p>
					</div>
				</div>
			</div>

			<div class="space-y-[12px]">
				<NuxtLink
					v-for="bonus in filteredBonuses"
					:key="bonus.title"
					:to="bonus.action"
					class="group block rounded-[20px] bg-white p-[20px] tablet:p-[24px] relative overflow-hidden transition-all duration-[350ms] hover:-translate-y-[3px]"
					style="box-shadow: 0 0 0 1px rgba(9,88,102,0.05), 0 4px 20px rgba(9,88,102,0.06), 0 16px 48px rgba(9,88,102,0.04);">
					<!-- Background glow -->
					<div class="absolute top-[-30px] right-[-30px] w-[100px] h-[100px] rounded-full opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-[500ms]"
						style="background: radial-gradient(circle, var(--color-brand-primary), transparent);"></div>

					<div class="flex flex-col gap-[16px] tablet:flex-row tablet:items-start tablet:justify-between relative z-[1]">
						<div class="flex items-start gap-[16px]">
							<div class="w-[48px] h-[48px] rounded-[14px] flex items-center justify-center shrink-0"
								style="background: linear-gradient(135deg, var(--color-brand-primary), #0b7d92); box-shadow: 0 4px 14px rgba(9,88,102,0.25);">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[22px] w-[22px]"
									fill="#ffffff"
									v-html="accountCardIcons[bonus.iconKey]"></svg>
							</div>
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-[8px] mb-[6px]">
									<h2 class="text-[var(--color-brand-text)] text-[15px] tablet:text-[16px] tracking-[-0.1px] font-[700]">
										{{ bonus.title }}
									</h2>
									<span
										:class="['inline-flex items-center rounded-full px-[9px] py-[3px] text-[0.625rem] font-[700]', bonus.badgeColor]">
										{{ bonus.badge }}
									</span>
								</div>
								<p class="text-[var(--color-brand-text-muted)] text-[12px] tablet:text-[13px] leading-[1.55]">
									{{ bonus.description }}
								</p>
							</div>
						</div>

						<div class="flex items-center shrink-0">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-40 group-hover:opacity-100 group-hover:translate-x-[3px] transition-all duration-[350ms]"><path d="M9 18l6-6-6-6"/></svg>
						</div>
					</div>
				</NuxtLink>
			</div>

			<div v-if="filteredBonuses.length === 0" class="flex flex-col items-center justify-center py-[40px] text-center">
				<div class="w-[48px] h-[48px] rounded-[14px] bg-[#F5F6F9] flex items-center justify-center mb-[12px]">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						class="h-[22px] w-[22px]"
						fill="#999"
						v-html="accountCardIcons['tag-multiple']"></svg>
				</div>
				<p class="text-[var(--color-brand-text-muted)] text-[14px] font-[500]">Nessun bonus disponibile al momento</p>
			</div>
		</div>
	</section>
</template>
