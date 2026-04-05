<!--
  FILE: components/navbar/NavbarMobileMenu.vue
  SCOPO: Menu mobile a tendina (sheet) della navbar, con link di navigazione e pulsante auth.
-->
<script setup>
defineProps({
  open: { type: Boolean, default: false },
  menuTopPx: { type: Number, default: 80 },
  navLinks: { type: Array, required: true },
  showAuthenticatedUi: { type: Boolean, default: false },
  mobileAccountButtonLabel: { type: String, default: 'Accedi o Registrati' },
  isNavActiveFn: { type: Function, required: true },
})

const emit = defineEmits(['close', 'open-auth'])
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="backdrop-fade">
        <div
          v-if="open"
          class="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]"
          @click="emit('close')"
        ></div>
      </Transition>

      <Transition name="mobile-sheet">
        <div
          v-if="open"
          class="lg:hidden fixed left-[12px] right-[12px] z-[9999] bg-white rounded-[12px] overflow-hidden"
          :style="{ top: menuTopPx + 'px' }"
          style="box-shadow: 0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(9,88,102,0.06)"
        >
          <nav class="py-[6px]">
            <ul class="flex flex-col">
              <li v-for="nav in navLinks" :key="nav.page">
                <NuxtLink
                  :to="nav.page"
                  active-class="" exact-active-class=""
                  class="navbar-mobile-menu-link"
                  :class="isNavActiveFn(nav.page) ? 'navbar-mobile-menu-link--active' : ''"
                >
                  <div class="navbar-mobile-menu-link__icon" :class="isNavActiveFn(nav.page) ? 'navbar-mobile-menu-link__icon--active' : ''">
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
            <button v-if="!showAuthenticatedUi" type="button" class="navbar-mobile-auth-cta btn-secondary btn-compact" @click="emit('open-auth')">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {{ mobileAccountButtonLabel }}
            </button>
            <NuxtLink v-else to="/account" active-class="" exact-active-class="" class="navbar-mobile-auth-cta btn-secondary btn-compact">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {{ mobileAccountButtonLabel }}
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>
