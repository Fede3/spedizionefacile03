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
	<section class="sf-account-shell py-[10px] tablet:py-[12px] desktop:py-[16px]">
		<div class="my-container">
			<AccountShellHero
				:crumbs="[]"
				:title="accountGreeting"
				:description="accountHeaderDescription"
				compact
				action-band-title="Nuova spedizione"
				action-band-description="Riparti dal preventivo con i dati del tuo account gia disponibili."
				action-label="Nuova spedizione"
				action-to="/preventivo"
				:logout-loading="isLoggingOut"
				@logout="handleLogout">
				<template #identity>
					<div class="sf-account-identity-avatar">{{ accountInitials }}</div>
				</template>
				<template #meta>
					<span class="sf-account-meta-pill sf-account-meta-pill--muted">{{ userTypeLabel }}</span>
					<span v-if="effectiveRole !== 'Cliente'" class="sf-account-meta-pill">{{ effectiveRole }}</span>
				</template>
			</AccountShellHero>
		</div>
	</section>

	<section class="sf-account-shell py-[4px] desktop:py-[8px]">
		<div class="my-container">
			<div
				v-for="(section, sectionIndex) in visibleSections"
				:key="sectionIndex"
				class="sf-account-section"
				:style="{ '--sf-section-accent': section.pages[0]?.iconColor || '#095866' }">
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
						<NuxtLink :to="resolveAccountPageUrl(page.url)" class="sf-account-nav-tile group">
							<div
								class="sf-account-nav-tile__icon"
								:style="{
									'--sf-icon-bg': page.iconBg || '#edf6f8',
									'--sf-icon-color': page.iconColor || '#095866',
									'--sf-icon-border': page.iconBorder || 'rgba(9, 88, 102, 0.14)',
								}">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									class="h-[22px] w-[22px]"
									:fill="page.iconColor"
									v-html="cardIcons[page.iconKey]"></svg>
							</div>
							<div class="sf-account-nav-tile__body">
								<h3 class="sf-account-nav-tile__title group-hover:text-[#095866]">
									{{ page.title }}
								</h3>
								<p v-if="page.description" class="sf-account-nav-tile__meta">{{ page.description }}</p>
							</div>
							<span class="sf-account-nav-tile__link" aria-hidden="true">→</span>
						</NuxtLink>
					</li>
				</ul>
			</div>
		</div>
	</section>
</template>
