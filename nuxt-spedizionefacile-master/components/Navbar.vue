<!--
  COMPONENTE: Navbar (Navbar.vue)
  SCOPO: Barra di navigazione principale — desktop nav + pulsanti + mobile menu (delegato a NavbarMobileMenu).
  CSS estratto in assets/css/navbar.css
-->
<script setup>
import '~/assets/css/navbar.css'

const navLinks = [
  { page: "/preventivo", text: "Preventivo", icon: 'price' },
  { page: "/servizi", text: "Servizi", icon: 'truck' },
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

const openGuestAuthModal = (tab = 'login') => {
  mobileMenuOpen.value = false;
  openAuthModal({ redirect: getRequestedPath(), tab });
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
    <div v-if="!isAuthMinimalShellRoute" class="navbar-accent-bar h-[3px] w-full rounded-full"></div>

    <div ref="navbarBottomRef" class="navbar-shell relative z-50 flex items-center justify-between px-[2px]"
      :class="isAuthMinimalShellRoute ? 'h-[52px] sm:h-[58px] border-b border-[#edf0f3]' : 'h-[56px] sm:h-[64px] lg:h-[70px]'"
      :style="!isAuthMinimalShellRoute ? { borderBottom: scrolled ? '1px solid rgba(9,88,102,0.08)' : '1px solid transparent' } : undefined">

      <div class="flex min-w-0 flex-1 items-center gap-[6px] sm:gap-[8px] lg:flex-initial">
        <a href="/" class="flex items-center h-full outline-none shrink-0" @click="mobileMenuOpen = false">
          <Logo :is-navbar="true" />
        </a>
      </div>

      <!-- Desktop nav pills -->
      <nav v-if="!isAuthMinimalShellRoute" class="hidden lg:flex justify-center flex-1">
        <ul class="navbar-primary-nav">
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

      <!-- Right-side actions -->
      <div v-if="!isAuthMinimalShellRoute" class="flex shrink-0 items-center gap-[6px] sm:gap-[10px]">
        <a v-if="showMobileQuoteCta" :href="mobileQuoteHref" class="inline-flex lg:hidden navbar-mobile-quote btn-cta btn-compact" @click="mobileMenuOpen = false">Preventivo</a>

        <button type="button" class="hidden lg:inline-flex items-center gap-[6px] navbar-nav-action btn-secondary btn-compact"
          @click="showAuthenticatedUi ? navigateTo('/account') : openGuestAuthModal('login')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {{ accountButtonLabel }}
        </button>

        <NuxtLink to="/carrello" custom v-slot="{ href, navigate }">
          <a
            :href="href"
            class="navbar-nav-action btn-secondary btn-compact"
            :class="isNavActive('/carrello') ? 'navbar-nav-action--active' : ''"
            @click="navigate">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span class="hidden sm:inline text-[14px] tracking-[-0.2px] font-semibold">Carrello</span>
            <span v-if="cartCount > 0" class="navbar-nav-action__badge">{{ cartCount }}</span>
          </a>
        </NuxtLink>

        <button type="button" class="lg:hidden navbar-mobile-toggle btn-secondary btn-compact inline-flex items-center justify-center !w-[42px] !px-0" aria-label="Apri menu di navigazione" @click="mobileMenuOpen = !mobileMenuOpen">
          <svg v-if="!mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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
    />
  </div>
</template>
