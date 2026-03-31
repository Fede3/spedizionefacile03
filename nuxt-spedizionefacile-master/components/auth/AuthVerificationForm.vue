<script setup lang="ts">
const props = defineProps<{
  email: string
  verificationCode: string[]
  verificationError: string
  verificationSuccess: string
  verificationLoading: boolean
  resendLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'input', index: number, event: Event): void
  (e: 'keydown', index: number, event: KeyboardEvent): void
  (e: 'verify'): void
  (e: 'resend'): void
  (e: 'back'): void
}>()
</script>

<template>
  <div class="auth-overlay-form auth-overlay-form--verification">
    <div>
      <p class="auth-panel-title">Verifica il tuo account</p>
      <p class="auth-panel-copy">Inserisci il codice a 6 cifre inviato a <strong>{{ email }}</strong>.</p>
    </div>
    <div class="flex items-center justify-center gap-[8px]">
      <input
        v-for="(digit, index) in verificationCode"
        :key="index"
        :value="digit"
        :data-verification-index="index"
        type="text"
        inputmode="numeric"
        maxlength="1"
        class="verification-digit"
        @input="emit('input', index, $event)"
        @keydown="emit('keydown', index, $event)"
      />
    </div>
    <div v-if="verificationError" class="auth-feedback auth-feedback--error">{{ verificationError }}</div>
    <div v-if="verificationSuccess" class="auth-feedback auth-feedback--success">{{ verificationSuccess }}</div>
    <div class="flex flex-col gap-[10px]">
      <button type="button" class="auth-primary-submit" :disabled="verificationLoading" @click="emit('verify')">
        {{ verificationLoading ? 'Verifica in corso...' : 'Verifica e continua' }}
      </button>
      <div class="flex items-center justify-between gap-[12px] text-[0.8125rem]">
        <button type="button" class="auth-text-link" :disabled="resendLoading" @click="emit('resend')">
          {{ resendLoading ? 'Invio...' : 'Invia nuovo codice' }}
        </button>
        <button type="button" class="auth-text-link auth-text-link--muted" @click="emit('back')">
          Torna indietro
        </button>
      </div>
    </div>
  </div>
</template>
