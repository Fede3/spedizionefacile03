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
      class="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-[#E9EBEC] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] rounded-t-[12px] px-[16px] py-[16px] tablet:px-[24px] tablet:py-[20px]">
      <div class="max-w-[960px] mx-auto flex flex-col tablet:flex-row items-start tablet:items-center gap-[12px] tablet:gap-[20px]">
        <p class="text-[0.8125rem] text-[#252B42] leading-[1.5] flex-1">
          Utilizziamo i cookie per migliorare la tua esperienza.
          <NuxtLink to="/cookie-policy" class="text-[#095866] hover:underline font-medium">Scopri di più</NuxtLink>
        </p>
        <div class="flex items-center gap-[10px] shrink-0">
          <button
            type="button"
            @click="accept('essential')"
            class="px-[16px] py-[10px] rounded-[12px] border border-[#E9EBEC] text-[#252B42] text-[0.8125rem] font-semibold hover:bg-[#F7FAFC] transition-colors cursor-pointer">
            Solo necessari
          </button>
          <button
            type="button"
            @click="accept('all')"
            class="px-[16px] py-[10px] rounded-[12px] bg-[#095866] text-white text-[0.8125rem] font-semibold hover:bg-[#074a56] transition-colors cursor-pointer">
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
