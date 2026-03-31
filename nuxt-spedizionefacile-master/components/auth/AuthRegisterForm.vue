<script setup lang="ts">
type RegisterFormData = {
  name: string
  surname: string
  email: string
  email_confirmation: string
  prefix: string
  telephone_number: string
  password: string
  password_confirmation: string
  role: string
  user_type: string
  referred_by: string
}

const props = defineProps<{
  modelValue: RegisterFormData
  isLoading: boolean
  showPassword: boolean
  showPasswordConfirm: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: RegisterFormData): void
  (e: 'update:showPassword', value: boolean): void
  (e: 'update:showPasswordConfirm', value: boolean): void
  (e: 'submit'): void
}>()

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const updateField = (field: keyof RegisterFormData, value: string) => {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}
</script>

<template>
  <form class="auth-overlay-form" @submit.prevent="emit('submit')">
    <div class="auth-segmented-row">
      <button
        type="button"
        :class="form.user_type === 'privato' ? 'auth-segment auth-segment--active' : 'auth-segment'"
        @click="updateField('user_type', 'privato')"
      >
        Privato
      </button>
      <button
        type="button"
        :class="form.user_type === 'commerciante' ? 'auth-segment auth-segment--active' : 'auth-segment'"
        @click="updateField('user_type', 'commerciante')"
      >
        Azienda
      </button>
    </div>
    <div class="auth-grid-two">
      <div class="auth-field-group">
        <label class="auth-field-label">Nome</label>
        <input
          :value="form.name"
          class="auth-field-input"
          type="text"
          autocomplete="given-name"
          placeholder="Nome"
          @input="updateField('name', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="auth-field-group">
        <label class="auth-field-label">Cognome</label>
        <input
          :value="form.surname"
          class="auth-field-input"
          type="text"
          autocomplete="family-name"
          placeholder="Cognome"
          @input="updateField('surname', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
    <div class="auth-grid-two">
      <div class="auth-field-group">
        <label class="auth-field-label">Email</label>
        <input
          :value="form.email"
          class="auth-field-input"
          type="email"
          autocomplete="email"
          placeholder="La tua email"
          @input="updateField('email', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="auth-field-group">
        <label class="auth-field-label">Conferma email</label>
        <input
          :value="form.email_confirmation"
          class="auth-field-input"
          type="email"
          autocomplete="email"
          placeholder="Conferma email"
          @input="updateField('email_confirmation', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
    <div class="auth-grid-phone">
      <div class="auth-field-group">
        <label class="auth-field-label">Prefisso</label>
        <select
          :value="form.prefix"
          class="auth-field-input auth-field-select"
          @change="updateField('prefix', ($event.target as HTMLSelectElement).value)"
        >
          <option value="+39">+39 IT</option>
          <option value="+49">+49 DE</option>
        </select>
      </div>
      <div class="auth-field-group">
        <label class="auth-field-label">Telefono</label>
        <input
          :value="form.telephone_number"
          class="auth-field-input"
          type="tel"
          autocomplete="tel"
          placeholder="Numero di telefono"
          @input="updateField('telephone_number', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
    <div class="auth-grid-two">
      <div class="auth-field-group">
        <label class="auth-field-label">Password</label>
        <div class="auth-password-wrap">
          <input
            :value="form.password"
            class="auth-field-input auth-field-input--password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="Minimo 8 caratteri"
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
      <div class="auth-field-group">
        <label class="auth-field-label">Conferma password</label>
        <div class="auth-password-wrap">
          <input
            :value="form.password_confirmation"
            class="auth-field-input auth-field-input--password"
            :type="showPasswordConfirm ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="Ripeti la password"
            @input="updateField('password_confirmation', ($event.target as HTMLInputElement).value)"
          />
          <button type="button" class="auth-password-toggle" tabindex="-1" @click="emit('update:showPasswordConfirm', !showPasswordConfirm)">
            <svg v-if="showPasswordConfirm" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    </div>
    <button type="submit" class="auth-primary-submit" :disabled="isLoading">
      {{ isLoading ? 'Creazione account...' : 'Registrati e continua' }}
    </button>
  </form>
</template>
