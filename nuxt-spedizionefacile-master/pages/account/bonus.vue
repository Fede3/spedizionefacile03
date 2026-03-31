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
/* Richiede che l'utente sia autenticato */
definePageMeta({
	middleware: ["app-auth"],
});

const { user } = useSanctumAuth();

/* Controlla se l'utente e' Partner Pro */
const isPro = computed(() => user.value?.role === "Partner Pro");

/**
 * Lista di tutti i bonus disponibili.
 * Ogni bonus ha: icona, titolo, descrizione, badge, link
 * e flag "proOnly" (visibile solo ai Pro) e "available" (se mostrarlo).
 */
const bonuses = [
	{
		iconSvg: '<path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.34C15.11,18.55 15.08,18.77 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.92,20.61 20.92,19A2.92,2.92 0 0,0 18,16.08Z" fill="currentColor"/>',
		title: "Invita un amico",
		description: "Condividi il tuo codice referral e guadagna il 5% di commissione su ogni spedizione. Il tuo amico riceve il 5% di sconto.",
		badge: "5% Commissione",
		badgeColor: "bg-emerald-50 text-emerald-700",
		available: true,
		proOnly: true,
		action: "/account/account-pro",
		actionLabel: "Vai al codice referral",
	},
	{
		iconSvg: '<path d="M5,3C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3H5M12,6A3,3 0 0,1 15,9C15,10.31 14.17,11.42 13,11.83V14H16V16H13V18H11V16H8V14H11V11.83C9.83,11.42 9,10.31 9,9A3,3 0 0,1 12,6M12,8A1,1 0 0,0 11,9A1,1 0 0,0 12,10A1,1 0 0,0 13,9A1,1 0 0,0 12,8Z" fill="currentColor"/>',
		title: "Ricarica e risparmia",
		description: "Ricarica il portafoglio per pagare le spedizioni in modo rapido e conveniente. Nessuna commissione sulle ricariche.",
		badge: "0% commissioni",
		badgeColor: "bg-blue-50 text-blue-700",
		available: true,
		proOnly: false,
		action: "/account/portafoglio",
		actionLabel: "Ricarica ora",
	},
	{
		iconSvg: '<path d="M12,2L15.09,8.26L22,9.27L17,14.14L18.18,21.02L12,17.77L5.82,21.02L7,14.14L2,9.27L8.91,8.26L12,2M12,5.4L9.95,9.74L5.2,10.46L8.6,13.79L7.82,18.53L12,16.29L16.18,18.53L15.4,13.79L18.8,10.46L14.05,9.74L12,5.4Z" fill="currentColor"/>',
		title: "Diventa Partner Pro",
		description: "Sblocca vantaggi esclusivi: codice referral personale, commissioni sulle vendite e funzioni avanzate.",
		badge: "Pro",
		badgeColor: "bg-amber-50 text-amber-700",
		available: !isPro.value,
		proOnly: false,
		action: "/account/account-pro",
		actionLabel: "Scopri di più",
	},
];

/* Filtra i bonus: nasconde quelli "solo Pro" se l'utente non e' Pro, e quelli non disponibili */
const filteredBonuses = computed(() => {
	return bonuses.filter((b) => {
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
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				:eyebrow="bonusHeader.eyebrow"
				:title="bonusHeader.title"
				:description="bonusHeader.description"
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Bonus' },
				]"
			>
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

			<!-- Bonus Cards -->
			<div class="space-y-[16px]">
				<NuxtLink
					v-for="(bonus, index) in filteredBonuses"
					:key="index"
					:to="bonus.action"
					class="group flex flex-col gap-[16px] bg-white rounded-[12px] p-[20px] desktop:flex-row desktop:items-start desktop:p-[24px] border border-[#E9EBEC] shadow-sm hover:shadow-md hover:border-[#E9EBEC] transition-all">
					<!-- Icon -->
					<div class="w-[52px] h-[52px] rounded-[12px] bg-[#e8f4fb] flex items-center justify-center shrink-0">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[26px] h-[26px] text-[#1a7fba]" v-html="bonus.iconSvg"></svg>
					</div>

					<!-- Content -->
					<div class="flex-1 min-w-0">
						<div class="flex flex-wrap items-center gap-[8px] mb-[6px]">
							<h2 class="text-[1.0625rem] font-bold text-[#252B42] group-hover:text-[#095866] transition-colors">
								{{ bonus.title }}
							</h2>
							<span :class="['inline-block px-[10px] py-[3px] rounded-full text-[0.6875rem] font-semibold', bonus.badgeColor]">
								{{ bonus.badge }}
							</span>
						</div>
						<p class="text-[#737373] text-[0.875rem] leading-[1.6] mb-[12px] max-w-[70ch]">
							{{ bonus.description }}
						</p>
						<span class="inline-flex items-center gap-[4px] text-[0.8125rem] text-[#095866] font-semibold group-hover:underline">
							{{ bonus.actionLabel }}
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"/></svg>
						</span>
					</div>
				</NuxtLink>
			</div>

			<!-- Empty state if no bonuses -->
			<div v-if="filteredBonuses.length === 0" class="bg-white rounded-[12px] p-[48px] shadow-sm border border-[#E9EBEC] text-center">
				<div class="w-[72px] h-[72px] mx-auto mb-[20px] bg-[#F8F9FB] rounded-full flex items-center justify-center">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[32px] h-[32px] text-[#C8CCD0]" fill="currentColor"><path d="M22,12V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V12A1,1 0 0,1 1,11V8A2,2 0 0,1 3,6H6.17C6.06,5.69 6,5.35 6,5A3,3 0 0,1 9,2C10,2 10.88,2.49 11.43,3.24L12,4L12.57,3.24C13.12,2.49 14,2 15,2A3,3 0 0,1 18,5C18,5.35 17.94,5.69 17.83,6H21A2,2 0 0,1 23,8V11A1,1 0 0,1 22,12M4,20H11V12H4V20M20,20V12H13V20H20M9,4A1,1 0 0,0 8,5A1,1 0 0,0 9,6H11V5C11,4.45 10.55,4 10,4H9M15,4A1,1 0 0,0 14,4L13,4V6H15A1,1 0 0,0 16,5A1,1 0 0,0 15,4M3,8V10H11V8H3M13,8V10H21V8H13Z"/></svg>
				</div>
				<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Nessun bonus disponibile</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto leading-[1.6]">Al momento non ci sono promozioni attive. Torna a controllare presto!</p>
			</div>
		</div>
	</section>
</template>
