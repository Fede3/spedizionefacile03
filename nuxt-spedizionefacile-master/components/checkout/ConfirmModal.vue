<!--
  Confirm-payment modal (teleported to body).
-->
<script setup>
defineProps({
  show:               { type: Boolean, required: true },
  finalTotalFormatted:{ type: String,  required: true },
  paymentMethod:      { type: String,  required: true },
  totalPackages:      { type: Number,  required: true },
})

const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center p-[20px] bg-[#09131c]/36 backdrop-blur-[6px]" @click.self="emit('close')">
      <div class="sf-modal-surface w-full max-w-[480px] animate-[scale-in_0.2s_ease-out]">
        <div class="sf-modal-content">
          <div class="sf-modal-header">
            <div class="sf-modal-header__main">
              <div class="sf-modal-icon sf-modal-icon--accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div>
                <h3 class="sf-modal-title">Conferma pagamento</h3>
                <p class="sf-modal-description">
                  Stai per pagare <span class="font-bold text-[var(--color-brand-text)]">{{ finalTotalFormatted }}</span>
                  <template v-if="paymentMethod === 'carta'">con carta di credito</template>
                  <template v-else-if="paymentMethod === 'bonifico'">tramite bonifico bancario</template>
                  <template v-else-if="paymentMethod === 'wallet'">con il tuo wallet</template>
                  per <span class="font-bold text-[var(--color-brand-text)]">{{ totalPackages }} {{ totalPackages === 1 ? 'spedizione' : 'spedizioni' }}</span>.
                </p>
              </div>
            </div>
          </div>
          <div class="sf-modal-divider" />
          <div class="sf-modal-actions">
            <button type="button" @click="emit('close')" class="btn-secondary flex-1 min-h-[48px]">
              Annulla
            </button>
            <button type="button" @click="emit('confirm')" class="btn-cta flex-1 min-h-[48px]">
              Conferma
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
</style>
