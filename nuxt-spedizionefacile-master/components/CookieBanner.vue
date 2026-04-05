<script setup>
const visible = ref(false);

onMounted(() => {
  if (!localStorage.getItem('cookie_consent')) {
    visible.value = true;
  }
});

const accept = (type) => {
  localStorage.setItem('cookie_consent', type);
  visible.value = false;
};
</script>

<template>
  <Transition name="cookie-banner">
    <div
      v-if="visible"
      class="fixed right-[12px] bottom-[max(12px,env(safe-area-inset-bottom))] z-[9999] w-[min(calc(100vw-24px),340px)] rounded-[18px] border border-[#dce7ea] bg-white/96 px-[14px] py-[14px] shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-[14px] tablet:right-[20px] tablet:bottom-[20px] tablet:w-[min(calc(100vw-40px),340px)] tablet:px-[16px] tablet:py-[16px]">
      <div class="grid gap-[12px]">
        <p class="text-[0.78125rem] leading-[1.5] text-[#252B42]">
          Utilizziamo i cookie per migliorare la tua esperienza.
          <NuxtLink to="/cookie-policy" class="text-[#095866] hover:underline font-medium">Scopri di più</NuxtLink>
        </p>
        <div class="grid grid-cols-2 gap-[8px]">
          <button
            type="button"
            @click="accept('essential')"
            class="btn-tertiary btn-compact min-h-[40px] px-[12px] text-[0.75rem]">
            Solo necessari
          </button>
          <button
            type="button"
            @click="accept('all')"
            class="btn-cta btn-compact min-h-[40px] px-[12px] text-[0.75rem]">
            Accetta tutti
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.cookie-banner-enter-active,
.cookie-banner-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.cookie-banner-enter-from,
.cookie-banner-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
