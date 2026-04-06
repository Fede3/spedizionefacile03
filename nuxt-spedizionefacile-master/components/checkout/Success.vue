<!--
  Payment-success screen with animation.
  Props: successOrderId, paymentMethod.
-->
<script setup>
defineProps({
  successOrderId: { type: [String, Number], required: true },
  paymentMethod: { type: String, default: '' },
})
</script>

<template>
  <div class="max-w-[520px] mx-auto text-center py-[48px] sm:py-[64px]">
    <!-- Animated checkmark -->
    <div class="w-[72px] h-[72px] mx-auto mb-[20px] rounded-full flex items-center justify-center animate-[success-bounce_0.6s_ease-out]"
      style="background: rgba(16, 185, 129, 0.08); outline: 1px solid rgba(16, 185, 129, 0.15); outline-offset: -1px">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="animate-[check-draw_0.5s_ease-out_0.2s_both]">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>

    <!-- Title -->
    <h1 class="text-[var(--color-brand-text)] text-[22px] sm:text-[26px] tracking-[-0.5px] mb-[10px]" style="font-weight:800">
      Pagamento completato!
    </h1>

    <!-- Description -->
    <p class="text-[var(--color-brand-text-secondary)] text-[15px] leading-[1.6] mb-[6px]" style="font-weight:400">
      <template v-if="String(successOrderId).includes(',')">
        I tuoi ordini <span class="text-[var(--color-brand-text)]" style="font-weight:700">#{{ successOrderId }}</span> sono stati creati con successo.
      </template>
      <template v-else>
        Il tuo ordine <span class="text-[var(--color-brand-text)]" style="font-weight:700">#{{ successOrderId }}</span> è stato creato con successo.
      </template>
    </p>

    <p v-if="paymentMethod === 'bonifico'" class="text-[var(--color-brand-text-secondary)] text-[14px] mb-[24px]" style="font-weight:400">
      Riceverai le coordinate bancarie via email per completare il pagamento.
    </p>
    <p v-else class="text-[var(--color-brand-text-secondary)] text-[14px] mb-[24px]" style="font-weight:400">
      Il pagamento è stato elaborato correttamente.
    </p>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-[10px] justify-center">
      <NuxtLink to="/account/spedizioni"
        class="inline-flex items-center justify-center gap-[6px] h-[46px] px-[24px] rounded-full text-white text-[14px]"
        style="font-weight:700; background: linear-gradient(135deg, #E44203, #c73600); box-shadow: 0 4px 16px rgba(228,66,3,0.2)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        Vedi le tue spedizioni
      </NuxtLink>
      <NuxtLink to="/"
        class="inline-flex items-center justify-center gap-[6px] h-[46px] px-[24px] rounded-full text-[var(--color-brand-text-secondary)] text-[14px] bg-white"
        style="font-weight:600; outline: 1.5px solid #DFE2E7; outline-offset: -1.5px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Torna alla home
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
@keyframes success-bounce {
  0%   { opacity: 0; transform: scale(0); }
  50%  { transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes check-draw {
  0%   { stroke-dasharray: 0 100; stroke-dashoffset: 0; }
  100% { stroke-dasharray: 100 100; stroke-dashoffset: 0; }
}
</style>
