<!--
	COMPONENTE BARRA DI NAVIGAZIONE (Navbar.vue)

	Questa e' la barra di navigazione principale del sito, visibile in cima a ogni pagina.

	Contiene:
	- Il logo di SpedizioneFacile (a sinistra)
	- I link di navigazione: Servizi, Preventivo Rapido, Guide, Contatti (al centro)
	- Il pulsante "Accedi" o "Ciao [nome]" se l'utente e' loggato (a destra)
	- Il pulsante del carrello con il numero di articoli (a destra)

	Su schermi piccoli (cellulare/tablet):
	- I link di navigazione vengono nascosti e sostituiti da un menu hamburger animato
	- Icona account/login visibile su mobile
	- Il pulsante del carrello con il numero di articoli
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

// Chiudi menu quando cambia pagina
watch(() => route.fullPath, () => {
	mobileMenuOpen.value = false;
	refresh();
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
					class="mid-desktop-navbar:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[12px] transition-colors duration-200"
					:class="mobileMenuOpen ? 'bg-[#095866]' : 'bg-transparent'"
					aria-label="Apri menu di navigazione"
					@click="mobileMenuOpen = !mobileMenuOpen"
				>
					<div class="hamburger-icon" :class="{ open: mobileMenuOpen }">
						<span></span>
						<span></span>
						<span></span>
					</div>
				</button>

				<!-- Account/Login icon (mobile) -->
				<NuxtLink
					:to="authLink"
					class="mid-desktop-navbar:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-[#095866] text-white transition-all duration-200 active:scale-95"
					aria-label="Account"
				>
					<!-- Icona utente loggato -->
					<svg v-if="isAuthenticated" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
						<circle cx="12" cy="7" r="4"/>
					</svg>
					<!-- Icona login -->
					<svg v-else xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
						<polyline points="10 17 15 12 10 7"/>
						<line x1="15" y1="12" x2="3" y2="12"/>
					</svg>
				</NuxtLink>

				<!-- Account/Login button (desktop) -->
				<NuxtLink
					:to="authLink"
					class="hidden mid-desktop-navbar:inline-block bg-[#E44203] desktop-xl:w-[143px] mid-desktop-navbar:w-[91px] mid-desktop-navbar:h-[41px] desktop-xl:h-full mid-desktop-navbar:leading-[41px] desktop-xl:leading-[65px] text-center text-white rounded-[50px] font-semibold desktop-xl:text-[1.25rem] desktop:text-[0.875rem] tracking-[-0.48px] transition-all duration-200 hover:bg-[#c93800] hover:shadow-[0_4px_12px_rgba(228,66,3,0.3)]">
					<span v-if="isAuthenticated">Ciao {{ user?.name }}</span>
					<span v-else>Accedi!</span>
				</NuxtLink>

				<!-- Carrello -->
				<NuxtLink to="/carrello" class="inline-flex items-center justify-center gap-[6px] bg-[#E44203] min-w-[44px] tablet:min-w-[88px] px-[10px] tablet:px-[20px] h-[44px] tablet:h-[48px] text-center text-white rounded-[24px] font-semibold whitespace-nowrap text-[0.875rem] tablet:text-[1rem] transition-all duration-200 hover:bg-[#c93800] hover:shadow-[0_4px_12px_rgba(228,66,3,0.3)]">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
						<circle cx="9" cy="21" r="1"/>
						<circle cx="20" cy="21" r="1"/>
						<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
					</svg>
					<span v-if="cart?.data?.length > 0">{{ cart.data.length }}</span>
				</NuxtLink>
			</div>
		</div>
		<div class="h-[4px] w-full bg-[#095866] rounded-full mt-2"></div>

		<!-- Menu mobile slide-down -->
		<Transition name="mobile-menu">
			<div
				v-if="mobileMenuOpen"
				class="mid-desktop-navbar:hidden absolute left-0 right-0 top-full z-40 bg-white border-b-[3px] border-[#095866] rounded-b-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden"
			>
				<nav class="py-[8px]">
					<ul class="flex flex-col">
						<li v-for="(nav, navIndex) in navLinks" :key="navIndex">
							<NuxtLink
								:to="nav.page"
								class="flex items-center gap-[12px] px-[20px] py-[14px] text-[1.0625rem] font-medium text-[#333] hover:bg-[#f0f7f8] hover:text-[#095866] transition-colors duration-150 active:bg-[#e6f0f2]"
								:class="{ 'text-[#E44203] font-semibold': route.path === nav.page || route.path.startsWith(nav.page + '/') }"
							>
								<svg v-if="nav.text === 'Servizi'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-[#095866]">
									<rect x="1" y="3" width="15" height="13"/>
									<polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
									<circle cx="5.5" cy="18.5" r="2.5"/>
									<circle cx="18.5" cy="18.5" r="2.5"/>
								</svg>
								<svg v-else-if="nav.text === 'Preventivo Rapido'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-[#095866]">
									<line x1="12" y1="1" x2="12" y2="23"/>
									<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
								</svg>
								<svg v-else-if="nav.text === 'Guide'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-[#095866]">
									<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
									<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
								</svg>
								<svg v-else-if="nav.text === 'Contatti'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-[#095866]">
									<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
								</svg>
								{{ nav.text }}
							</NuxtLink>
						</li>
					</ul>
				</nav>
				<!-- Login/Account nel menu mobile -->
				<div class="border-t border-[#e8e8e8] px-[20px] py-[12px]">
					<NuxtLink
						:to="authLink"
						class="flex items-center justify-center gap-[8px] w-full h-[48px] bg-[#095866] text-white rounded-[12px] font-semibold text-[1rem] transition-all duration-200 active:scale-[0.98]"
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
	background-color: #095866;
	border-radius: 2px;
	transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
	transform-origin: center;
}

.hamburger-icon.open span {
	background-color: #fff;
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

/* Menu mobile transition */
.mobile-menu-enter-active {
	transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.mobile-menu-leave-active {
	transition: all 0.2s cubic-bezier(0.55, 0, 1, 0.45);
}

.mobile-menu-enter-from {
	opacity: 0;
	transform: translateY(-8px);
}

.mobile-menu-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}
</style>
