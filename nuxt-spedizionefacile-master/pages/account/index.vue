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

useSeoMeta({
	title: 'Il tuo account | SpediamoFacile',
	ogTitle: 'Il tuo account | SpediamoFacile',
	description: 'Gestisci spedizioni, indirizzi, pagamenti e profilo dalla tua area personale SpediamoFacile.',
	ogDescription: 'Area personale SpediamoFacile per monitorare spedizioni, pagamenti e profilo.',
});

/* Richiede che l'utente sia autenticato per accedere a questa pagina */
definePageMeta({
	middleware: ['app-auth'],
});

/* Recupera i dati dell'utente loggato e la funzione per fare logout */
const { user, logout } = useSanctumAuth();
const { clearSnapshot } = useAuthUiSnapshotPersistence();
const { uiSnapshot } = useAuthUiState();

// Per la shell account usiamo lo snapshot auth come sorgente UI primaria:
// e' gia' allineato tra SSR e client e riduce i mismatch in hydration.
const effectiveRole = computed(() => uiSnapshot.value.role || user.value?.role || 'Cliente');
const displayName = computed(() => {
	const snapshotFullName = [uiSnapshot.value.name, uiSnapshot.value.surname].filter(Boolean).join(' ').trim();
	if (snapshotFullName) return snapshotFullName;

	const profile = user.value || {};
	const fullName = [profile.name, profile.surname].filter(Boolean).join(' ').trim();
	if (fullName) return fullName;
	if (profile.name) return profile.name;
	if (profile.email) return String(profile.email).split('@')[0];
	return 'Cliente';
});
const accountGreeting = computed(() => `Ciao, ${displayName.value}`);
const isAdmin = computed(() => effectiveRole.value === 'Admin');
const isPro = computed(() => effectiveRole.value === 'Partner Pro');
const cardIcons = accountCardIcons;
const sectionDescriptions = {
	Spedizioni: 'Monitora ordini, tracking e modelli gia pronti.',
	Pagamenti: 'Carte salvate, saldo disponibile e movimenti.',
	'Partner Pro': 'Referral, bonus e strumenti partner in un solo punto.',
	Profilo: 'Dati account, indirizzi e preferenze di contatto.',
	Amministrazione: 'Ingresso unico alla console operativa.',
};

const formatMemberSince = (value) => {
	if (!value) return '';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return '';
	return new Intl.DateTimeFormat('it-IT', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(parsed);
};

const memberSince = computed(() => formatMemberSince(uiSnapshot.value.createdAt || user.value?.created_at));
const userEmail = computed(() => uiSnapshot.value.email || user.value?.email || 'Email account non disponibile');
const userTypeLabel = computed(() => ((uiSnapshot.value.userType || user.value?.user_type) === 'commerciante' ? 'Azienda' : 'Privato'));
const accountHeaderDescription = computed(() => {
	if (memberSince.value) {
		return `Membro dal ${memberSince.value}`;
	}
	return userEmail.value;
});
const accountInitials = computed(() => {
	const source =
		[uiSnapshot.value.name || displayName.value, uiSnapshot.value.surname || user.value?.surname].filter(Boolean).join(' ').trim() ||
		displayName.value;
	return source
		.split(' ')
		.filter(Boolean)
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
});

const sections = computed(() =>
	createAccountSections({
		isAdmin: isAdmin.value,
		isPro: isPro.value,
	}),
);

const resolveAccountPageUrl = (url = '') => {
	if (!url) return '/account';
	if (url.startsWith('/account')) return url;
	return `/account${url.startsWith('/') ? url : `/${url}`}`;
};

/* Filtra le sezioni: mostra solo quelle che hanno almeno una pagina visibile.
   Le sezioni admin appaiono dopo le sezioni utente. */
const visibleSections = computed(() => {
	return sections.value
		.map((section) => ({
			...section,
			pages: section.pages.filter((page) => page.visible),
		}))
		.map((section) => {
			if (section.title !== 'Amministrazione' || !section.pages.length) {
				return section;
			}

			const adminEntry = section.pages.find((page) => page.url === '/amministrazione') || section.pages[0];

			return {
				...section,
				pages: adminEntry
					? [
							{
								...adminEntry,
								title: 'Console admin',
								description: 'Ordini, tracking, utenti, code.',
							},
						]
					: [],
			};
		})
		.filter((section) => section.pages.length > 0);
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
</script>

<template>
	<section class="sf-account-shell py-[20px] tablet:py-[24px] desktop:py-[28px]">
		<div class="my-container max-w-[1280px]">
			<!-- Profile card (prototype-style) -->
			<div class="sf-account-profile-card rounded-[22px] overflow-hidden mb-[24px]"
				style="box-shadow: 0 0 0 1px rgba(9,88,102,0.05), 0 4px 20px rgba(9,88,102,0.06), 0 16px 48px rgba(9,88,102,0.04);">
				<!-- Teal accent bar -->
				<div class="h-[4px]" style="background: linear-gradient(90deg, #095866 0%, #0b9ab3 50%, #095866 100%);"></div>
				<div class="px-[20px] tablet:px-[32px] py-[24px] tablet:py-[28px] bg-white">
					<div class="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-[16px]">
						<div class="flex items-center gap-[16px]">
							<div class="sf-account-identity-avatar">{{ accountInitials }}</div>
							<div>
								<div class="flex items-center gap-[8px] flex-wrap">
									<h1 class="text-[var(--color-brand-text)] text-[20px] tablet:text-[24px] tracking-[-0.5px] font-[800]">
										{{ displayName }}
									</h1>
									<span v-if="effectiveRole !== 'Cliente'" class="sf-account-meta-pill">{{ effectiveRole }}</span>
									<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ userTypeLabel }}</span>
								</div>
								<p class="text-[var(--color-brand-text-muted)] text-[13px] mt-[2px]">{{ userEmail }}</p>
							</div>
						</div>
						<div class="flex items-center gap-[8px]">
							<NuxtLink to="/preventivo"
								class="h-[46px] px-[20px] rounded-full text-white text-[14px] font-[700] flex items-center gap-[7px] cursor-pointer transition-transform hover:-translate-y-[1px]"
								style="background: #E44203; box-shadow: 0 4px 14px rgba(228,66,3,0.25);">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
								Nuova spedizione
							</NuxtLink>
							<button
								@click="handleLogout"
								:disabled="isLoggingOut"
								class="h-[46px] w-[46px] rounded-full bg-[#F0F1F4] hover:bg-[#FFE8E0] text-[var(--color-brand-text-muted)] hover:text-[#E44203] flex items-center justify-center cursor-pointer transition-all duration-[350ms]">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
							</button>
						</div>
					</div>

					<!-- Stats bar -->
					<div class="flex items-center gap-[20px] tablet:gap-[32px] mt-[18px] pt-[16px] border-t border-[#F0F1F4]">
						<div class="flex items-center gap-[8px]">
							<div class="w-[28px] h-[28px] rounded-full flex items-center justify-center" style="background: rgba(228,66,3,0.07);">
								<svg width="13" height="13" viewBox="0 0 24 24" fill="#E44203"><path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L6.04,7.5L12,10.85L17.96,7.5L12,4.15M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z"/></svg>
							</div>
							<div>
								<span class="text-[var(--color-brand-text)] text-[16px] font-[800]">{{ memberSince || '--' }}</span>
								<span class="text-[var(--color-brand-text-muted)] text-[12px] ml-[5px]">Membro dal</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Section blocks -->
			<div
				v-for="(section, sectionIndex) in visibleSections"
				:key="sectionIndex"
				class="sf-account-section"
				:style="{ '--sf-section-accent': section.pages[0]?.iconColor || 'var(--color-brand-primary)' }">
				<div class="sf-account-section__header">
					<div class="sf-account-section__title-wrap">
						<h2 class="sf-account-section__title">{{ section.title }}</h2>
						<p v-if="sectionDescriptions[section.title]" class="sf-account-section__description">
							{{ sectionDescriptions[section.title] }}
						</p>
					</div>
					<span v-if="section.pages.length > 1" class="sf-account-section__badge">{{ section.pages.length }}</span>
				</div>

				<ul class="sf-account-nav-grid">
					<li v-for="(page, pageIndex) in section.pages" :key="pageIndex" class="w-full">
						<NuxtLink :to="resolveAccountPageUrl(page.url)" class="sf-account-nav-tile group"
							:style="{
								'--sf-icon-color': page.iconColor || 'var(--color-brand-primary)',
							}">
							<div
								class="sf-account-nav-tile__icon"
								:style="{
									'--sf-icon-color': page.iconColor || 'var(--color-brand-primary)',
								}">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[20px] w-[20px]"
									fill="#ffffff"
									v-html="cardIcons[page.iconKey]"></svg>
							</div>
							<div class="sf-account-nav-tile__body">
								<h3 class="sf-account-nav-tile__title group-hover:text-[var(--color-brand-primary)]">
									{{ page.title }}
								</h3>
								<p v-if="page.description" class="sf-account-nav-tile__meta">{{ page.description }}</p>
							</div>
							<span class="sf-account-nav-tile__link" aria-hidden="true">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
							</span>
						</NuxtLink>
					</li>
				</ul>
			</div>

			<!-- Help footer -->
			<div class="flex items-center justify-center gap-[6px] text-[var(--color-brand-text-muted)] text-[13px] pt-[24px] font-[500]">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
				Hai bisogno di aiuto?
				<NuxtLink to="/account/assistenza" class="text-[#095866] font-[600] hover:underline cursor-pointer">Contattaci</NuxtLink>
			</div>
		</div>
	</section>
</template>
