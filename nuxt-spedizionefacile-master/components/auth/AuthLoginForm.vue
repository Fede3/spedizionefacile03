<script setup lang="ts">
const props = defineProps<{
  modelValue: { email: string; password: string; remember: boolean }
  isLoading: boolean
  showPassword: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: { email: string; password: string; remember: boolean }): void
  (e: 'update:showPassword', value: boolean): void
  (e: 'submit'): void
}>()

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const updateField = (field: 'email' | 'password', value: string) => {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

const updateRemember = (value: boolean) => {
  emit('update:modelValue', { ...props.modelValue, remember: value })
}
</script>

<template>
  <form class="auth-overlay-form" @submit.prevent="emit('submit')">
    <div class="auth-field-group">
      <label class="auth-field-label" for="auth-modal-email">Email</label>
      <input
        id="auth-modal-email"
        :value="form.email"
        class="auth-field-input"
        type="email"
        autocomplete="username"
        placeholder="La tua email"
        @input="updateField('email', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="auth-field-group">
      <label class="auth-field-label" for="auth-modal-password">Password</label>
      <div class="auth-password-wrap">
        <input
          id="auth-modal-password"
          :value="form.password"
          class="auth-field-input auth-field-input--password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="La tua password"
          @input="updateField('password', ($event.target as HTMLInputElement).value)"
        />
        <button type="button" class="auth-password-toggle" tabindex="-1" @click="emit('update:showPassword', !showPassword)">
          <svg v-if="showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>
    </div>
    <label class="auth-checkbox-row" for="auth-modal-remember">
      <input
        id="auth-modal-remember"
        :checked="form.remember"
        type="checkbox"
        class="auth-checkbox"
        @change="updateRemember(($event.target as HTMLInputElement).checked)"
      />
      <span>Ricordami</span>
    </label>
    <button type="submit" class="auth-primary-submit" :disabled="isLoading">
      {{ isLoading ? 'Accesso in corso...' : 'Accedi e continua' }}
    </button>
  </form>
</template>
