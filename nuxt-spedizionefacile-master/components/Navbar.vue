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
-->
<script setup>
const navLinks = [
	{ page: "/preventivo", text: "Preventivo", icon: 'price' },
	{ page: "/servizi", text: "Servizi", icon: 'truck' },
	{ page: '/guide', text: 'Guide', icon: 'book' },
	{ page: "/contatti", text: "Contatti", icon: 'message' },
];

const {
	accountLabel,
	isAuthenticatedForUi,
	liveAuthenticated,
	mobileAccountLabel,
} = useAuthUiState();
const { openAuthModal } = useAuthModal();
const { cart } = useCart();
const route = useRoute();
const authShellPaths = ['/autenticazione', '/login', '/registrazione', '/recupera-password', '/aggiorna-password'];
const isAuthShellRoute = computed(() => authShellPaths.some((path) => route.path.startsWith(path)));
const quoteFlowPaths = ['/preventivo', '/la-tua-spedizione', '/riepilogo', '/checkout', '/carrello'];
const isQuoteFlowRoute = computed(() => quoteFlowPaths.some((path) => route.path.startsWith(path)));
const showMobileQuoteCta = computed(() => !isAuthShellRoute.value && !isQuoteFlowRoute.value && !route.path.startsWith('/account'));
const mobileQuoteHref = computed(() => route.path === '/' ? '/#preventivo' : '/preventivo');

const getRequestedPath = () => {
	const redirectQuery = Array.isArray(route.query.redirect)
		? route.query.redirect[0]
		: route.query.redirect;

	if (route.path === '/autenticazione' || route.path === '/login' || route.path === '/registrazione') {
		if (typeof redirectQuery === 'string' && redirectQuery.startsWith('/')) {
			return redirectQuery;
		}
		return '/';
	}

	return route.fullPath;
};

const authUiHydrated = ref(false);
const showAuthenticatedUi = computed(() => authUiHydrated.value && isAuthenticatedForUi.value);
const accountButtonLabel = computed(() => {
	if (!authUiHydrated.value) return 'Accedi';
	return accountLabel.value === 'Accedi' ? 'Accedi' : accountLabel.value;
});
const mobileAccountButtonLabel = computed(() => {
	if (!authUiHydrated.value) return 'Accedi o Registrati';
	return showAuthenticatedUi.value ? mobileAccountLabel.value : 'Accedi o Registrati';
});
const cartCount = computed(() => cart?.value?.data?.length || cart?.data?.length || 0);
const scrolled = ref(false);
const mobileMenuOpen = ref(false);
const navbarBottomRef = ref(null);
const menuTopPx = ref(0);

const updateMenuPosition = () => {
	if (navbarBottomRef.value) {
		const rect = navbarBottomRef.value.getBoundingClientRect();
		menuTopPx.value = rect.bottom + 12;
	}
};

const onScroll = () => {
	if (typeof window === 'undefined') return;
	scrolled.value = window.scrollY > 8;
};

watch(mobileMenuOpen, (val) => {
	if (val) nextTick(() => updateMenuPosition());
});

const stopRouteWatch = watch(() => route.fullPath, () => {
	mobileMenuOpen.value = false;
	if (typeof window !== 'undefined') requestAnimationFrame(updateMenuPosition);
});

const isNavActive = (page) => {
	if (page === '/preventivo') {
		return (
			route.path === '/' ||
			route.path.startsWith('/preventivo') ||
			route.path.startsWith('/la-tua-spedizione') ||
			route.path.startsWith('/riepilogo') ||
			route.path.startsWith('/checkout')
		);
	}
	return route.path === page || route.path.startsWith(page + '/');
};

const openGuestAuthModal = (tab = 'login') => {
	mobileMenuOpen.value = false;
	openAuthModal({
		redirect: getRequestedPath(),
		tab,
	});
};

onMounted(() => {
	authUiHydrated.value = true;
	onScroll();
	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', updateMenuPosition);
});

onBeforeUnmount(() => {
	stopRouteWatch();
	window.removeEventListener('scroll', onScroll);
	window.removeEventListener('resize', updateMenuPosition);
});
</script>

<template>
	<div class="relative w-full">
		<div
			v-if="!isAuthShellRoute"
			class="h-[3px] w-full rounded-full"
			style="background: linear-gradient(90deg, #E44203 0%, #ff6a33 50%, #E44203 100%);"
		></div>

		<div
			ref="navbarBottomRef"
			class="navbar-shell relative z-50 flex items-center justify-between px-[2px]"
			:class="isAuthShellRoute ? 'h-[52px] sm:h-[58px] border-b border-[#edf0f3]' : 'h-[56px] sm:h-[64px] lg:h-[70px]'"
			:style="!isAuthShellRoute ? { borderBottom: scrolled ? '1px solid rgba(9,88,102,0.08)' : '1px solid transparent' } : undefined"
		>
			<div class="flex min-w-0 flex-1 items-center gap-[6px] sm:gap-[8px] lg:flex-initial">
				<a
					href="/"
					class="flex items-center h-full outline-none shrink-0"
					@click="mobileMenuOpen = false">
					<Logo :is-navbar="true" />
				</a>
			</div>

			<nav v-if="!isAuthShellRoute" class="hidden lg:flex justify-center flex-1">
				<ul class="navbar-primary-nav">
					<li v-for="nav in navLinks" :key="nav.page">
						<NuxtLink
							:to="nav.page"
							active-class=""
							exact-active-class=""
							class="navbar-link-pill"
							:class="isNavActive(nav.page) ? 'navbar-link-pill--active' : 'navbar-link-pill--inactive'"
						>
							{{ nav.text }}
						</NuxtLink>
					</li>
				</ul>
			</nav>

			<div v-if="!isAuthShellRoute" class="flex shrink-0 items-center gap-[6px] sm:gap-[10px]">
				<a
					v-if="showMobileQuoteCta"
					:href="mobileQuoteHref"
					class="inline-flex lg:hidden navbar-mobile-quote"
					@click="mobileMenuOpen = false"
				>
					Preventivo
				</a>

				<button
					type="button"
					class="hidden lg:inline-flex items-center gap-[6px] navbar-account-ghost"
					@click="showAuthenticatedUi ? navigateTo('/account') : openGuestAuthModal('login')"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
						<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
						<circle cx="12" cy="7" r="4"/>
					</svg>
					{{ accountButtonLabel }}
				</button>

				<NuxtLink
					to="/carrello"
					active-class=""
					exact-active-class=""
					class="navbar-cart-cta"
					:class="isNavActive('/carrello') ? 'navbar-cart-cta--active' : ''"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
						<circle cx="9" cy="21" r="1"/>
						<circle cx="20" cy="21" r="1"/>
						<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
					</svg>
					<span class="hidden sm:inline text-[14px] tracking-[-0.2px] font-semibold">Carrello</span>
					<span v-if="cartCount > 0" class="navbar-cart-cta__badge">{{ cartCount }}</span>
				</NuxtLink>

				<button
					type="button"
					class="lg:hidden navbar-mobile-toggle"
					aria-label="Apri menu di navigazione"
					@click="mobileMenuOpen = !mobileMenuOpen"
				>
					<svg v-if="!mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
					<svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
		</div>

		<ClientOnly>
			<Teleport to="body">
				<Transition name="backdrop-fade">
					<div
						v-if="mobileMenuOpen && !isAuthShellRoute"
						class="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]"
						@click="mobileMenuOpen = false"
					></div>
				</Transition>

				<Transition name="mobile-sheet">
					<div
						v-if="mobileMenuOpen && !isAuthShellRoute"
						class="lg:hidden fixed left-[12px] right-[12px] z-[9999] bg-white rounded-[18px] overflow-hidden"
						:style="{ top: menuTopPx + 'px', boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(9,88,102,0.06)' }"
					>
						<nav class="py-[6px]">
							<ul class="flex flex-col">
								<li v-for="nav in navLinks" :key="nav.page">
									<NuxtLink
										:to="nav.page"
										active-class=""
										exact-active-class=""
										class="mobile-nav-link"
										:class="isNavActive(nav.page) ? 'mobile-nav-link--active' : ''"
									>
										<div class="mobile-nav-link__icon" :class="isNavActive(nav.page) ? 'mobile-nav-link__icon--active' : ''">
											<svg v-if="nav.icon === 'truck'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
											<svg v-else-if="nav.icon === 'price'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
											<svg v-else-if="nav.icon === 'book'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
											<svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
										</div>
										<span class="flex-1">{{ nav.text }}</span>
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#cfcfcf]"><path d="m9 18 6-6-6-6"/></svg>
									</NuxtLink>
								</li>
							</ul>
						</nav>
						<div class="border-t border-[#f0f0f0] px-[16px] py-[12px]">
							<button
								v-if="!showAuthenticatedUi"
								type="button"
								class="mobile-auth-cta"
								@click="openGuestAuthModal('login')"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
								{{ mobileAccountButtonLabel }}
							</button>
							<NuxtLink
								v-else
								to="/account"
								active-class=""
								exact-active-class=""
								class="mobile-auth-cta"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
								{{ mobileAccountButtonLabel }}
							</NuxtLink>
						</div>
					</div>
				</Transition>
			</Teleport>
		</ClientOnly>
	</div>
</template>

<style scoped>
.navbar-shell {
	transition: border-color var(--sf-motion-base) var(--sf-ease-soft), box-shadow var(--sf-motion-base) var(--sf-ease-soft);
}

.navbar-primary-nav {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 2px;
	padding: 4px;
	border-radius: 999px;
	background: rgba(9, 88, 102, 0.045);
	box-shadow: inset 0 0 0 1px rgba(9, 88, 102, 0.05);
}

.navbar-link-pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	height: 44px;
	padding: 0 18px;
	border-radius: 999px;
	font-size: 15px;
	line-height: 1;
	letter-spacing: -0.22px;
	font-weight: 600;
	transition:
		color var(--sf-motion-base) var(--sf-ease-soft),
		background-color var(--sf-motion-base) var(--sf-ease-soft),
		box-shadow var(--sf-motion-base) var(--sf-ease-soft),
		transform var(--sf-motion-base) var(--sf-ease-soft);
}

.navbar-link-pill--active {
	color: #E44203;
	background: rgba(255, 255, 255, 0.96);
	box-shadow: 0 10px 18px rgba(9, 88, 102, 0.08);
	font-weight: 700;
}

.navbar-link-pill--inactive {
	color: #31414b;
}

.navbar-link-pill--inactive:hover {
	color: #16252f;
	background: rgba(255, 255, 255, 0.72);
	transform: translateY(-1px);
}

.navbar-quote-cta {
	align-items: center;
	justify-content: center;
	height: 46px;
	padding: 0 22px;
	border-radius: 999px;
	cursor: pointer;
	background: linear-gradient(135deg, #E44203 0%, #d63b00 100%);
	color: #fff;
	font-size: 15px;
	line-height: 1;
	font-weight: 700;
	letter-spacing: -0.18px;
	box-shadow: 0 10px 22px rgba(228, 66, 3, 0.2);
	transition:
		transform var(--sf-motion-base) var(--sf-ease-soft),
		box-shadow var(--sf-motion-base) var(--sf-ease-soft),
		filter var(--sf-motion-base) var(--sf-ease-soft);
}

.navbar-quote-cta:hover {
	transform: translateY(-1px);
	box-shadow: 0 14px 28px rgba(228, 66, 3, 0.24);
	filter: saturate(1.04);
}

.navbar-account-ghost {
	height: 46px;
	padding: 0 22px;
	border-radius: 999px;
	cursor: pointer;
	background: rgba(9, 88, 102, 0.06);
	color: #095866;
	font-size: 15px;
	letter-spacing: -0.16px;
	font-weight: 600;
	transition:
		background-color var(--sf-motion-base) var(--sf-ease-soft),
		box-shadow var(--sf-motion-base) var(--sf-ease-soft),
		transform var(--sf-motion-base) var(--sf-ease-soft),
		color var(--sf-motion-base) var(--sf-ease-soft);
}

.navbar-account-ghost:hover {
	background: rgba(9, 88, 102, 0.12);
	box-shadow: 0 2px 12px rgba(9, 88, 102, 0.08);
	transform: translateY(-1px);
}

.navbar-cart-cta {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	gap: 6px;
	height: 46px;
	min-width: 46px;
	padding: 0 20px;
	border-radius: 999px;
	color: #fff;
	background: linear-gradient(135deg, #E44203 0%, #d63b00 100%);
	transition:
		background var(--sf-motion-base) var(--sf-ease-soft),
		box-shadow var(--sf-motion-base) var(--sf-ease-soft),
		transform var(--sf-motion-base) var(--sf-ease-soft);
}

.navbar-cart-cta:hover {
	box-shadow: 0 4px 16px rgba(228, 66, 3, 0.25);
	transform: translateY(-1px);
}

.navbar-cart-cta--active {
	box-shadow: 0 4px 16px rgba(228, 66, 3, 0.3), 0 0 0 2px rgba(228, 66, 3, 0.18);
}

.navbar-cart-cta__badge {
	display: inline-flex;
	min-width: 20px;
	height: 20px;
	align-items: center;
	justify-content: center;
	border-radius: 999px;
	padding: 0 6px;
	background: rgba(255, 255, 255, 0.2);
	font-size: 12px;
	line-height: 1;
	font-weight: 700;
}

.navbar-mobile-toggle {
	width: 42px;
	height: 42px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	border-radius: 999px;
	background: #095866;
	color: white;
	transition:
		background-color var(--sf-motion-base) var(--sf-ease-soft),
		box-shadow var(--sf-motion-base) var(--sf-ease-soft),
		transform var(--sf-motion-base) var(--sf-ease-soft);
}

.navbar-mobile-toggle:hover {
	background: #0a6b7d;
	box-shadow: 0 4px 14px rgba(9, 88, 102, 0.2);
	transform: translateY(-1px);
}

.navbar-mobile-quote {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 34px;
	padding: 0 12px;
	border-radius: 999px;
	background: linear-gradient(135deg, #E44203 0%, #d63b00 100%);
	color: #fff;
	font-size: 12.5px;
	line-height: 1;
	font-weight: 700;
	letter-spacing: -0.15px;
	box-shadow: 0 8px 18px rgba(228, 66, 3, 0.18);
	white-space: nowrap;
	transition:
		transform var(--sf-motion-base) var(--sf-ease-soft),
		box-shadow var(--sf-motion-base) var(--sf-ease-soft),
		filter var(--sf-motion-base) var(--sf-ease-soft);
}

.navbar-mobile-quote:hover {
	transform: translateY(-1px);
	box-shadow: 0 12px 22px rgba(228, 66, 3, 0.22);
	filter: saturate(1.05);
}

.mobile-nav-link {
	display: flex;
	align-items: center;
	gap: 14px;
	cursor: pointer;
	padding: 14px 20px;
	font-size: 16px;
	color: #444;
	transition:
		background-color var(--sf-motion-fast) var(--sf-ease-soft),
		color var(--sf-motion-fast) var(--sf-ease-soft),
		transform var(--sf-motion-fast) var(--sf-ease-soft);
	font-weight: 500;
}

.mobile-nav-link:hover {
	background: #f7f7f7;
	color: #1d2738;
	transform: translateX(2px);
}

.mobile-nav-link--active {
	color: #095866;
	background: rgba(9, 88, 102, 0.04);
	font-weight: 650;
}

.mobile-nav-link__icon {
	width: 36px;
	height: 36px;
	border-radius: 10px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 36px;
	background: #f3f4f6;
	color: #888;
}

.mobile-nav-link__icon--active {
	background: rgba(9, 88, 102, 0.08);
	color: #095866;
}

.mobile-auth-cta {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	cursor: pointer;
	width: 100%;
	height: 48px;
	background: #095866;
	color: #fff;
	border-radius: 999px;
	font-size: 15px;
	font-weight: 600;
	transition:
		background-color var(--sf-motion-base) var(--sf-ease-soft),
		transform var(--sf-motion-base) var(--sf-ease-soft),
		box-shadow var(--sf-motion-base) var(--sf-ease-soft);
}

.mobile-auth-cta:hover {
	background: #0a6b7d;
	box-shadow: 0 10px 22px rgba(9, 88, 102, 0.18);
	transform: translateY(-1px);
}

.mobile-auth-cta:active {
	transform: translateY(0) scale(0.985);
}

.mobile-sheet-enter-active,
.mobile-sheet-leave-active {
	transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.25, 1, 0.5, 1);
}

.mobile-sheet-enter-from,
.mobile-sheet-leave-to {
	opacity: 0;
	transform: translateY(-8px) scale(0.98);
}

.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
	transition: opacity 0.2s ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
	opacity: 0;
}

@media (min-width: 1280px) {
	.navbar-link-pill {
		height: 46px;
		padding-inline: 22px;
		font-size: 16px;
	}

	.navbar-quote-cta,
	.navbar-account-ghost,
	.navbar-cart-cta {
		height: 46px;
		padding-inline: 24px;
	}
}

@media (min-width: 1024px) {
	.navbar-quote-cta {
		display: inline-flex;
	}

	.navbar-mobile-quote {
		display: none !important;
	}

	.navbar-mobile-toggle {
		display: none !important;
	}
}

@media (max-width: 22.5rem) {
	.navbar-mobile-quote {
		padding-inline: 10px;
		font-size: 12px;
	}
}
</style>
