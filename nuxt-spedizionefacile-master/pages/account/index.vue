<!--
  FILE: pages/account/index.vue
  SCOPO: Dashboard account — griglia card con link a tutte le sezioni (spedizioni, pagamenti, profilo, admin).

  API: nessuna chiamata diretta (usa useSanctumAuth per dati utente e ruolo).
  COMPONENTI: nessuno di esterno (solo NuxtLink per navigazione).
  ROUTE: /account (middleware sanctum:auth).

  DATI IN INGRESSO: nessuno (legge il ruolo utente da useSanctumAuth).
  DATI IN USCITA: navigazione alle sotto-pagine account.

  VINCOLI: le icone SVG sono inline (NON usare componente Icon) per rendering garantito.
           Le sezioni admin sono filtrate in base al ruolo (isAdmin computed).
  ERRORI TIPICI: aggiungere una pagina senza impostare visible correttamente.
  PUNTI DI MODIFICA SICURI: aggiungere/rimuovere card in sections[], testi, icone SVG.
  COLLEGAMENTI: tutte le sotto-pagine /account/*, composables/useSanctumAuth.
-->
<script setup>
import { useAuthUiSnapshotPersistence } from '~/composables/useAuthUiSnapshotPersistence';
import { accountCardIcons, createAccountSections } from '~/utils/accountNavigation';

/* Richiede che l'utente sia autenticato per accedere a questa pagina */
definePageMeta({
	middleware: ["app-auth"],
});

/* Recupera i dati dell'utente loggato e la funzione per fare logout */
const { user, logout } = useSanctumAuth();
const { clearSnapshot } = useAuthUiSnapshotPersistence();
const { uiSnapshot } = useAuthUiState();
const accountUiReady = ref(false);

// Per la shell account usiamo lo snapshot auth come sorgente UI primaria:
// e' gia' allineato tra SSR e client e riduce i mismatch in hydration.
const effectiveRole = computed(() => uiSnapshot.value.role || user.value?.role || "Cliente");
const displayName = computed(() => uiSnapshot.value.name || user.value?.name || "Cliente");
const displaySurname = computed(() => uiSnapshot.value.surname || user.value?.surname || "");
const isAdmin = computed(() => effectiveRole.value === "Admin");
const isPro = computed(() => effectiveRole.value === "Partner Pro");
const cardIcons = accountCardIcons;
const sections = computed(() => createAccountSections({
	isAdmin: isAdmin.value,
	isPro: isPro.value,
}));

const resolveAccountPageUrl = (url = "") => {
	if (!url) return "/account";
	if (url.startsWith("/account")) return url;
	return `/account${url.startsWith("/") ? url : `/${url}`}`;
};

const openAccountSection = async (url) => {
	await navigateTo(resolveAccountPageUrl(url));
};

/* Filtra le sezioni: mostra solo quelle che hanno almeno una pagina visibile.
   Le sezioni admin appaiono dopo le sezioni utente. */
const visibleSections = computed(() => {
	return sections.value
		.map(section => ({
			...section,
			pages: section.pages.filter(page => page.visible),
		}))
		.filter(section => section.pages.length > 0);
});

/* Indica se il logout e' in corso (per mostrare "Uscita..." sul bottone) */
const isLoggingOut = ref(false);

/* Funzione chiamata quando l'utente clicca "Esci" per uscire dall'account */
const handleLogout = async () => {
	isLoggingOut.value = true;
	try {
		clearSnapshot();
		await logout();
	} finally {
		isLoggingOut.value = false;
	}
};

onMounted(() => {
	accountUiReady.value = true;
});
</script>

<template>
	<section v-if="accountUiReady" class="bg-[#f6f9fb] py-[8px] tablet:py-[10px] desktop:py-[12px]">
		<div class="my-container">
			<AccountPageHeader
				:title="`${displayName} ${displaySurname}`.trim()"
				description="">
				<template #actions>
					<button
						@click="handleLogout"
						:disabled="isLoggingOut"
						class="sf-action-pill sf-action-pill--neutral">
						{{ isLoggingOut ? "Uscita..." : "Esci" }}
					</button>
				</template>
			</AccountPageHeader>

			<div class="mt-[6px] flex flex-wrap gap-[6px]">
				<NuxtLink
					to="/preventivo"
					class="sf-action-pill sf-action-pill--soft inline-flex min-h-[38px] w-auto flex-none items-center gap-[7px] px-[14px] text-[0.8125rem]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
					<span>Nuova spedizione</span>
				</NuxtLink>
				<NuxtLink
					to="/carrello"
					class="sf-action-pill sf-action-pill--neutral inline-flex min-h-[38px] w-auto flex-none items-center gap-[7px] px-[14px] text-[0.8125rem]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M17,18A2,2 0 0,1 19,20A2,2 0 0,1 17,22C15.89,22 15,21.1 15,20C15,18.89 15.89,18 17,18M1,2H4.27L5.21,4H20A1,1 0 0,1 21,5C21,5.17 20.95,5.34 20.88,5.5L17.3,11.97C16.96,12.58 16.3,13 15.55,13H8.1L7.2,14.63L7.17,14.75A0.25,0.25 0 0,0 7.42,15H19V17H7C5.89,17 5,16.1 5,15C5,14.65 5.09,14.32 5.24,14.04L6.6,11.59L3,4H1V2M7,18A2,2 0 0,1 9,20A2,2 0 0,1 7,22C5.89,22 5,21.1 5,20C5,18.89 5.89,18 7,18M16,11L18.78,6H6.14L8.5,11H16Z"/></svg>
					<span>Vai al carrello</span>
				</NuxtLink>
				<NuxtLink
					to="/traccia-spedizione"
					class="sf-action-pill sf-action-pill--neutral inline-flex min-h-[38px] w-auto flex-none items-center gap-[7px] px-[14px] text-[0.8125rem]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M18,15A3,3 0 0,1 21,18A3,3 0 0,1 18,21C16.69,21 15.58,20.17 15.17,19H14V17H15.17C15.58,15.83 16.69,15 18,15M18,17A1,1 0 0,0 17,18A1,1 0 0,0 18,19A1,1 0 0,0 19,18A1,1 0 0,0 18,17M6,15A3,3 0 0,1 9,18A3,3 0 0,1 6,21A3,3 0 0,1 3,18C3,16.69 3.83,15.58 5,15.17V7.83C3.83,7.42 3,6.31 3,5A3,3 0 0,1 6,2A3,3 0 0,1 9,5C9,6.31 8.17,7.42 7,7.83V15.17C8.17,15.58 9,16.69 9,18M6,17A1,1 0 0,0 5,18A1,1 0 0,0 6,19A1,1 0 0,0 7,18A1,1 0 0,0 6,17M6,4A1,1 0 0,0 5,5A1,1 0 0,0 6,6A1,1 0 0,0 7,5A1,1 0 0,0 6,4M12,11V13H9.09C9.27,12.37 9.55,11.78 9.91,11.22L12,11M18,9A3,3 0 0,1 21,12H19C19,11.45 18.55,11 18,11A1,1 0 0,0 17,12V13H15V12A3,3 0 0,1 18,9Z"/></svg>
					<span>Traccia spedizione</span>
				</NuxtLink>
			</div>
		</div>
	</section>

	<section v-else class="bg-[#f6f9fb] py-[8px] tablet:py-[10px] desktop:py-[12px]">
		<div class="my-container">
			<div class="rounded-[22px] border border-[#E3EBF0] bg-white px-[14px] py-[16px] shadow-[0_12px_30px_rgba(9,88,102,0.06)] tablet:px-[20px] tablet:py-[20px] desktop:px-[24px] desktop:py-[22px]">
				<div class="flex flex-col gap-[14px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div class="min-w-0 flex-1">
						<div class="mb-[8px] h-[24px] w-[140px] rounded-full bg-[#EEF3F7] animate-pulse"></div>
						<div class="h-[30px] w-[240px] rounded-[12px] bg-[#EEF3F7] animate-pulse tablet:h-[36px] tablet:w-[320px]"></div>
						<div class="mt-[8px] h-[16px] w-full max-w-[520px] rounded-[12px] bg-[#F2F5F8] animate-pulse"></div>
					</div>
					<div class="h-[42px] w-[96px] rounded-[12px] bg-[#EEF3F7] animate-pulse"></div>
				</div>
				<div class="mt-[16px] grid grid-cols-1 gap-[8px] tablet:grid-cols-2 desktop:grid-cols-3">
					<div
						v-for="index in 3"
						:key="`account-top-skeleton-${index}`"
						class="h-[50px] rounded-[12px] bg-[#F2F5F8] animate-pulse"></div>
				</div>
			</div>
		</div>
	</section>

	<section v-if="accountUiReady" class="py-[20px] desktop:py-[32px]">
		<div class="my-container">
			<div
				v-for="(section, sectionIndex) in visibleSections"
				:key="sectionIndex"
				:class="[
					'mb-[24px] last:mb-0',
					sectionIndex > 0 ? 'pt-[16px] desktop:pt-[18px]' : '',
				]">
				<div v-if="sectionIndex > 0" class="h-[2px] rounded-full mb-[14px] desktop:mb-[18px] bg-[#d7e6e9]"></div>
				<div class="mb-[10px] desktop:mb-[12px] text-left">
					<div class="flex flex-wrap items-center gap-[8px]">
						<h2 class="text-[1rem] desktop:text-[1.05rem] font-bold tracking-tight text-[#252B42]">
							{{ section.title }}
						</h2>
					</div>
				</div>

				<ul class="grid grid-cols-1 account-pages:grid-cols-2 desktop:grid-cols-3 gap-[12px] desktop:gap-[16px]">
					<li
						v-for="(page, pageIndex) in section.pages"
						:key="pageIndex"
						class="w-full">
						<NuxtLink
							:to="resolveAccountPageUrl(page.url)"
							@click.prevent="openAccountSection(page.url)"
							class="account-card flex h-full min-h-[104px] flex-col items-start text-left rounded-[12px] p-[16px] desktop:min-h-[112px] desktop:p-[18px] transition-[box-shadow,background-color,border-color] duration-200 group border cursor-pointer bg-white border-[#E9EBEC] shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:border-[#D7E1E4] hover:shadow-[0_10px_24px_rgba(37,43,66,0.1)]">
								<div class="mb-[12px] flex items-start gap-[12px]">
									<div :class="['flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[12px]', page.iconBg]">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[22px] w-[22px]" :fill="page.iconColor" v-html="cardIcons[page.iconKey]"></svg>
									</div>
									<h3 class="pt-[2px] text-[0.9rem] desktop:text-[0.98rem] font-bold leading-[1.2] tracking-[0.1px] transition-colors text-[#252B42] group-hover:text-[#095866]">
										{{ page.title }}
									</h3>
								</div>
							<span class="mt-auto inline-flex items-center text-[0.75rem] font-semibold text-[#095866]">
								Apri
							</span>
						</NuxtLink>
					</li>
				</ul>
			</div>
		</div>
	</section>
</template>
