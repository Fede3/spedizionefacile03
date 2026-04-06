<!--
  COMPONENTE: Navbar (Navbar.vue)
  SCOPO: Barra di navigazione principale — desktop nav pills + azioni + mobile menu.
  DESIGN: Replica esatta del prototipo Navbar.tsx.
  CSS: assets/css/navbar.css
-->
<script setup>
import '~/assets/css/navbar.css'

const navLinks = [
  { page: "/servizi", text: "Servizi", icon: 'truck' },
  { page: "/preventivo", text: "Preventivo", icon: 'price' },
  { page: "/traccia-spedizione", text: "Traccia", icon: 'tracking' },
  { page: '/guide', text: 'Guide', icon: 'book' },
  { page: "/contatti", text: "Contatti", icon: 'message' },
];

const { accountLabel, isAuthenticatedForUi, liveAuthenticated, mobileAccountLabel } = useAuthUiState();
const { openAuthModal } = useAuthModal();
const { cart } = useCart();
const route = useRoute();
const { isAccountRoute, isAuthMinimalShellRoute, isQuoteFlowRoute } = useShellRouteState();
const showMobileQuoteCta = computed(() => !isAuthMinimalShellRoute.value && !isQuoteFlowRoute.value && !isAccountRoute.value);
const mobileQuoteHref = computed(() => route.path === '/' ? '/#preventivo' : '/preventivo');

const getRequestedPath = () => {
  const redirectQuery = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect;
  if (route.path === '/autenticazione' || route.path === '/login' || route.path === '/registrazione') {
    return (typeof redirectQuery === 'string' && redirectQuery.startsWith('/')) ? redirectQuery : '/';
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
const mobileMenuOpen = ref(false);
const navbarBottomRef = ref(null);
const menuTopPx = ref(0);

const updateMenuPosition = () => {
  if (navbarBottomRef.value) {
    const rect = navbarBottomRef.value.getBoundingClientRect();
    menuTopPx.value = rect.bottom;
  }
};

watch(mobileMenuOpen, (val) => { if (val) nextTick(() => updateMenuPosition()); });

const stopRouteWatch = watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false;
  if (typeof window !== 'undefined') requestAnimationFrame(updateMenuPosition);
});

const isNavActive = (page) => {
  if (page === '/preventivo') {
    return route.path === '/' || route.path.startsWith('/preventivo') || route.path.startsWith('/la-tua-spedizione') || route.path.startsWith('/riepilogo') || route.path.startsWith('/checkout');
  }
  return route.path === page || route.path.startsWith(page + '/');
};

const isCartActive = computed(() => route.path === '/carrello');

const openGuestAuthModal = (tab = 'login') => {
  mobileMenuOpen.value = false;
  openAuthModal({ redirect: getRequestedPath(), tab });
};

onMounted(() => {
  authUiHydrated.value = true;
  window.addEventListener('resize', updateMenuPosition);
});

onBeforeUnmount(() => {
  stopRouteWatch();
  window.removeEventListener('resize', updateMenuPosition);
});
</script>

<template>
  <div class="relative w-full">
    <!-- Main bar — prototype: h-[56px] sm:h-[64px] lg:h-[70px] -->
    <div
      ref="navbarBottomRef"
      class="relative z-50 flex items-center justify-between"
      :class="isAuthMinimalShellRoute ? 'h-[52px] sm:h-[58px]' : 'h-[56px] sm:h-[64px] lg:h-[70px]'"
    >
      <!-- Logo -->
      <div class="flex min-w-0 flex-1 items-center gap-[6px] sm:gap-[8px] lg:flex-initial">
        <a href="/" class="flex items-center h-full outline-none shrink-0" @click="mobileMenuOpen = false">
          <Logo :is-navbar="true" />
        </a>
      </div>

      <!-- Desktop nav pills — prototype: centered, rounded-full, gap-x-[6px] -->
      <nav v-if="!isAuthMinimalShellRoute" class="hidden lg:flex justify-center flex-1">
        <ul class="flex items-center justify-center gap-x-[6px]">
          <li v-for="nav in navLinks" :key="nav.page">
            <NuxtLink :to="nav.page" custom v-slot="{ href, navigate }">
              <a
                :href="href"
                class="navbar-link-pill"
                :class="isNavActive(nav.page) ? 'navbar-link-pill--active' : ''"
                @click="navigate">
                {{ nav.text }}
              </a>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <!-- Right actions — prototype: gap-[8px] sm:gap-[10px] -->
      <div v-if="!isAuthMinimalShellRoute" class="flex shrink-0 items-center gap-[8px] sm:gap-[10px]">
        <!-- Mobile quote CTA -->
        <a v-if="showMobileQuoteCta" :href="mobileQuoteHref" class="inline-flex lg:hidden navbar-mobile-quote" @click="mobileMenuOpen = false">Preventivo</a>

        <!-- Login / Account — prototype: rounded-full, h-[42px], teal ghost -->
        <button
          v-if="!showAuthenticatedUi"
          type="button"
          class="hidden lg:inline-flex items-center gap-[6px] navbar-login-btn"
          @click="openGuestAuthModal('login')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Accedi
        </button>

        <NuxtLink
          v-else
          to="/account"
          class="hidden lg:inline-flex items-center gap-[6px] navbar-login-btn"
        >
          <!-- Avatar initials circle -->
          <div class="navbar-avatar-circle">
            <span class="text-white text-[10px] font-[800]">{{ (accountButtonLabel || '?')[0] }}</span>
          </div>
          {{ accountButtonLabel }}
        </NuxtLink>

        <!-- Cart — prototype: gradient orange, rounded-full -->
        <NuxtLink to="/carrello" custom v-slot="{ href, navigate }">
          <a
            :href="href"
            class="navbar-cart-btn"
            :class="isCartActive ? 'navbar-cart-btn--active' : ''"
            @click="navigate"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span class="hidden sm:inline text-[14px] tracking-[-0.2px]" style="font-weight: 600">Carrello</span>
            <span v-if="cartCount > 0" class="navbar-cart-badge">{{ cartCount }}</span>
          </a>
        </NuxtLink>

        <!-- Hamburger — prototype: w-[42px] h-[42px] rounded-full bg-[#095866] -->
        <button
          type="button"
          class="lg:hidden navbar-hamburger-btn"
          :aria-label="mobileMenuOpen ? 'Chiudi menu' : 'Apri menu'"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <div class="navbar-hamburger" :class="{ 'navbar-hamburger--open': mobileMenuOpen }">
            <span class="navbar-hamburger__line navbar-hamburger__line--1"></span>
            <span class="navbar-hamburger__line navbar-hamburger__line--2"></span>
            <span class="navbar-hamburger__line navbar-hamburger__line--3"></span>
          </div>
        </button>
      </div>
    </div>

    <!-- Mobile menu (delegated to sub-component) -->
    <NavbarMobileMenu
      v-if="!isAuthMinimalShellRoute"
      :open="mobileMenuOpen"
      :menu-top-px="menuTopPx"
      :nav-links="navLinks"
      :show-authenticated-ui="showAuthenticatedUi"
      :mobile-account-button-label="mobileAccountButtonLabel"
      :is-nav-active-fn="isNavActive"
      @close="mobileMenuOpen = false"
      @open-auth="openGuestAuthModal('login')"
      @open-register="openGuestAuthModal('register')"
    />
  </div>
</template>
