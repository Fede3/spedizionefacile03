<!--
	COMPONENTE: Navbar (Navbar.vue)
	SCOPO: Barra di navigazione principale del sito, visibile in cima a ogni pagina.

	DOVE SI USA: components/Header.vue (unico padre)
	PROPS: nessuna
	EMITS: nessuno

	DATI IN INGRESSO: useSanctumAuth() (stato autenticazione), useCart() (contatore carrello),
	                  route (pagina corrente per evidenziare link attivo)
	DATI IN USCITA: nessuno (navigazione tramite NuxtLink)

	VINCOLI: il menu mobile usa Teleport al body — serve ClientOnly per evitare errori SSR
	PUNTI DI MODIFICA SICURI: navLinks (lista voci menu), icone SVG nel menu mobile
	COLLEGAMENTI: components/Logo.vue, composables/useCart.js

	STRUTTURA:
	- Desktop: logo | link centrali | bottone login | carrello
	- Mobile: logo | hamburger | icona account | carrello
	  Il menu mobile si apre come dropdown con backdrop scuro (Teleportato al body)
-->
<script setup>
const navLinks = [
	{ page: "/servizi", text: "Servizi" },
	{ page: '/preventivo', text: 'Preventivo Rapido' },
	{ page: '/guide', text: 'Guide' },
	{ page: "/contatti", text: "Contatti" },
];

const { isAuthenticated, user } = useSanctumAuth();
const { cart, status, refresh } = useCart();
const route = useRoute();

// Stato menu mobile
const mobileMenuOpen = ref(false);
const navbarBottomRef = ref(null);
const menuTopPx = ref(0);

// Calcola posizione del menu quando si apre
const updateMenuPosition = () => {
	if (navbarBottomRef.value) {
		const rect = navbarBottomRef.value.getBoundingClientRect();
		menuTopPx.value = rect.top;
	}
};

watch(mobileMenuOpen, (val) => {
	if (val) {
		nextTick(() => updateMenuPosition());
	}
});

// Chiudi menu quando cambia pagina.
// Aggiorna il carrello solo navigando da/verso pagine che modificano il carrello,
// per evitare una chiamata API inutile su ogni singola navigazione.
const cartRelatedPaths = ['/carrello', '/riepilogo', '/preventivo', '/la-tua-spedizione'];
const stopRouteWatch = watch(() => route.fullPath, (newPath, oldPath) => {
	mobileMenuOpen.value = false;
	const isCartRelated = cartRelatedPaths.some(p => newPath.startsWith(p)) ||
		(oldPath && cartRelatedPaths.some(p => oldPath.startsWith(p)));
	if (isCartRelated) {
		refresh();
	}
});

// Cleanup watch to prevent memory leaks
onBeforeUnmount(() => {
	stopRouteWatch();
});

// Link per il pulsante di login: passa la pagina corrente come parametro redirect
// cosi' dopo il login l'utente torna dove si trovava
const authLink = computed(() => {
	if (isAuthenticated.value) {
		return '/account';
	}
	const currentPath = route.fullPath;
	// Non passare redirect se siamo gia' sulla pagina di autenticazione o su pagine guest-only
	if (currentPath === '/autenticazione' || currentPath === '/login' || currentPath === '/registrazione') {
		return '/autenticazione';
	}
	return `/autenticazione?redirect=${encodeURIComponent(currentPath)}`;
});

watch(isAuthenticated, () => {
	refresh();
});

</script>

<template>
	<div class="relative w-full">
		<div class="h-[4px] w-full bg-[#E44203] rounded-full mb-2"></div>
		<div class="flex items-center justify-between desktop:h-[65px] tablet:h-[50px] h-[44px] relative z-50">
			<!-- Logo -->
			<NuxtLink to="/" class="flex items-center h-full outline-none shrink-0">
				<Logo :is-navbar="true" />
			</NuxtLink>

			<!-- Nav desktop -->
			<nav class="desktop-xl:text-[1.25rem] desktop:text-[1rem] hidden mid-desktop-navbar:flex justify-center flex-1">
				<ul class="flex items-center justify-center desktop-xl:gap-x-[40px] mid-desktop-navbar:gap-x-[22px] text-[rgba(64,64,64,.67)] tracking-[-0.48px]">
					<li v-for="(nav, navIndex) in navLinks" :key="navIndex">
						<NuxtLink :to="nav.page" class="hover:text-[#E44203] transition-colors duration-200 py-[8px]">
							{{ nav.text }}
						</NuxtLink>
					</li>
				</ul>
			</nav>

			<!-- Azioni destra -->
			<div class="flex items-center gap-[8px] tablet:gap-[12px] shrink-0">
				<!-- Hamburger mobile -->
				<button
					type="button"
					class="mid-desktop-navbar:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[50px] bg-[#095866] transition-colors duration-200"
					aria-label="Apri menu di navigazione"
					@click="mobileMenuOpen = !mobileMenuOpen"
				>
					<div class="hamburger-icon" :class="{ open: mobileMenuOpen }">
						<span></span>
						<span></span>
						<span></span>
					</div>
				</button>

				<!-- Account icon (mobile) — icona omino, sempre visibile -->
				<NuxtLink
					:to="authLink"
					class="mid-desktop-navbar:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-[#095866] text-white transition-[transform] duration-200 active:scale-95"
					aria-label="Account"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
						<circle cx="12" cy="7" r="4"/>
					</svg>
				</NuxtLink>

				<!-- Account/Login button (desktop) -->
				<NuxtLink
					:to="authLink"
					class="hidden mid-desktop-navbar:inline-block bg-[#E44203] desktop-xl:w-[143px] mid-desktop-navbar:w-[91px] mid-desktop-navbar:h-[41px] desktop-xl:h-full mid-desktop-navbar:leading-[41px] desktop-xl:leading-[65px] text-center text-white rounded-[50px] font-semibold desktop-xl:text-[1.25rem] desktop:text-[0.875rem] tracking-[-0.48px] transition-[background-color,box-shadow] duration-200 hover:bg-[#c93800] hover:shadow-[0_4px_12px_rgba(228,66,3,0.3)]">
					<span v-if="isAuthenticated">Ciao {{ user?.name }}</span>
					<span v-else>Accedi!</span>
				</NuxtLink>

				<!-- Carrello -->
				<NuxtLink to="/carrello" class="inline-flex items-center justify-center gap-[6px] bg-[#E44203] min-w-[44px] tablet:min-w-[88px] px-[10px] tablet:px-[20px] h-[44px] tablet:h-[48px] text-center text-white rounded-[50px] font-semibold whitespace-nowrap text-[0.875rem] tablet:text-[1rem] transition-[background-color,box-shadow] duration-200 hover:bg-[#c93800] hover:shadow-[0_4px_12px_rgba(228,66,3,0.3)]">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
						<circle cx="9" cy="21" r="1"/>
						<circle cx="20" cy="21" r="1"/>
						<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
					</svg>
					<span v-if="cart?.data?.length > 0">{{ cart.data.length }}</span>
				</NuxtLink>
			</div>
		</div>
		<div ref="navbarBottomRef" class="h-[4px] w-full bg-[#095866] rounded-full mt-2 relative z-[10000]"></div>

		<!-- Menu mobile — Teleportato al body per stare SOPRA tutto -->
		<ClientOnly>
			<Teleport to="body">
				<!-- Backdrop -->
				<Transition name="backdrop-fade">
					<div
						v-if="mobileMenuOpen"
						class="mid-desktop-navbar:hidden fixed inset-0 bg-black/30 z-[9998]"
						@click="mobileMenuOpen = false"
					></div>
				</Transition>

				<!-- Menu dropdown -->
				<Transition name="mobile-menu">
					<div
						v-if="mobileMenuOpen"
						class="mid-desktop-navbar:hidden fixed left-[20px] right-[20px] z-[9999] bg-[#095866] rounded-b-[16px] rounded-t-none shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden"
						:style="{ top: menuTopPx + 'px' }"
					>
						<nav class="py-[8px]">
							<ul class="flex flex-col">
								<li v-for="(nav, navIndex) in navLinks" :key="navIndex">
									<NuxtLink
										:to="nav.page"
										class="flex items-center gap-[12px] px-[20px] py-[14px] text-[1.0625rem] font-medium text-white/90 hover:bg-white/10 hover:text-white transition-colors duration-150 active:bg-white/15"
										:class="{ 'text-white font-semibold': route.path === nav.page || route.path.startsWith(nav.page + '/') }"
									>
										<svg v-if="nav.text === 'Servizi'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-white">
											<rect x="1" y="3" width="15" height="13"/>
											<polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
											<circle cx="5.5" cy="18.5" r="2.5"/>
											<circle cx="18.5" cy="18.5" r="2.5"/>
										</svg>
										<svg v-else-if="nav.text === 'Preventivo Rapido'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-white">
											<line x1="12" y1="1" x2="12" y2="23"/>
											<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
										</svg>
										<svg v-else-if="nav.text === 'Guide'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-white">
											<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
											<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
										</svg>
										<svg v-else-if="nav.text === 'Contatti'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-white">
											<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
										</svg>
										{{ nav.text }}
									</NuxtLink>
								</li>
							</ul>
						</nav>
						<!-- Login/Account -->
						<div class="border-t border-white/20 px-[20px] py-[12px]">
							<NuxtLink
								:to="authLink"
								class="flex items-center justify-center gap-[8px] w-full h-[48px] bg-white text-[#095866] rounded-[50px] font-semibold text-[1rem] transition-[transform] duration-200 active:scale-[0.98]"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
									<circle cx="12" cy="7" r="4"/>
								</svg>
								<span v-if="isAuthenticated">Il mio account</span>
								<span v-else>Accedi o Registrati</span>
							</NuxtLink>
						</div>
					</div>
				</Transition>
			</Teleport>
		</ClientOnly>
	</div>
</template>

<style scoped>
/* Hamburger animato */
.hamburger-icon {
	width: 22px;
	height: 16px;
	position: relative;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.hamburger-icon span {
	display: block;
	width: 100%;
	height: 2.5px;
	background-color: #fff;
	border-radius: 12px;
	/* Ottimizzato: transizione solo sulle proprietà animate (transform, opacity) */
	transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1), opacity 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
	transform-origin: center;
}

.hamburger-icon.open span:nth-child(1) {
	transform: translateY(6.75px) rotate(45deg);
}

.hamburger-icon.open span:nth-child(2) {
	opacity: 0;
	transform: scaleX(0);
}

.hamburger-icon.open span:nth-child(3) {
	transform: translateY(-6.75px) rotate(-45deg);
}

/* Menu mobile transition — scende dall'alto con dissolvenza */
.mobile-menu-enter-active {
	animation: menuReveal 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.mobile-menu-leave-active {
	animation: menuHide 0.25s cubic-bezier(0.55, 0, 1, 0.45) forwards;
}

@keyframes menuReveal {
	0% {
		opacity: 0;
		clip-path: inset(0 0 100% 0);
	}
	100% {
		opacity: 1;
		clip-path: inset(0 0 0 0);
	}
}

@keyframes menuHide {
	0% {
		opacity: 1;
		clip-path: inset(0 0 0 0);
	}
	100% {
		opacity: 0;
		clip-path: inset(0 0 100% 0);
	}
}

/* Backdrop fade */
.backdrop-fade-enter-active {
	transition: opacity 0.25s ease;
}
.backdrop-fade-leave-active {
	transition: opacity 0.2s ease;
}
.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
	opacity: 0;
}
</style>
