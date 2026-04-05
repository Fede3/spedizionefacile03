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
  <div class="max-w-[600px] mx-auto text-center py-[60px]">
    <div class="w-[80px] h-[80px] mx-auto mb-[20px] bg-emerald-100 rounded-full flex items-center justify-center animate-[success-bounce_0.6s_ease-out]">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="animate-[check-draw_0.5s_ease-out_0.2s_both]">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
    <h1 class="text-[1.75rem] font-bold text-[var(--color-brand-text)] mb-[12px]">Pagamento completato!</h1>
    <p class="text-[var(--color-brand-text-secondary)] text-[1rem] leading-[1.6] mb-[8px]">
      <template v-if="String(successOrderId).includes(',')">
        I tuoi ordini <span class="font-semibold text-[var(--color-brand-text)]">#{{ successOrderId }}</span> sono stati creati con successo.
      </template>
      <template v-else>
        Il tuo ordine <span class="font-semibold text-[var(--color-brand-text)]">#{{ successOrderId }}</span> è stato creato con successo.
      </template>
    </p>
    <p v-if="paymentMethod === 'bonifico'" class="text-[var(--color-brand-text-secondary)] text-[0.9375rem] mb-[24px]">
      Riceverai le coordinate bancarie via email per completare il pagamento.
    </p>
    <p v-else class="text-[var(--color-brand-text-secondary)] text-[0.9375rem] mb-[24px]">
      Il pagamento è stato elaborato correttamente.
    </p>
    <div class="flex flex-col tablet:flex-row gap-[12px] justify-center">
      <NuxtLink to="/account/spedizioni" class="inline-flex items-center justify-center gap-[6px] px-[24px] py-[12px] min-h-[48px] bg-[var(--color-brand-primary)] text-white rounded-[50px] font-semibold text-[0.9375rem] hover:bg-[var(--color-brand-primary-hover)] transition">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        Vedi le tue spedizioni
      </NuxtLink>
      <NuxtLink to="/" class="inline-flex items-center justify-center gap-[6px] px-[24px] py-[12px] min-h-[48px] border border-[var(--color-brand-border)] text-[var(--color-brand-text-secondary)] rounded-[50px] font-medium text-[0.9375rem] hover:bg-white transition">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
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
