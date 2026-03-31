<!--
  FILE: components/cart/AuthGateModal.vue
  SCOPO: Modal per login/registrazione inline quando un guest prova ad andare al checkout.
  PROPS: open, loading, error, success, redirectPath
  EMITS: update:open, login(form), register(form)
-->
<script setup>
const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  success: { type: String, default: '' },
  redirectPath: { type: String, default: '/checkout' },
})

const emit = defineEmits(['update:open', 'login', 'register'])

const tab = ref('login')

const loginForm = ref({
  email: '',
  password: '',
})

const registerForm = ref({
  name: '',
  surname: '',
  email: '',
  email_confirmation: '',
  prefix: '+39',
  telephone_number: '',
  password: '',
  password_confirmation: '',
  role: 'Cliente',
  user_type: 'privato',
})

const switchTab = (newTab) => {
  tab.value = newTab
}

const handleLogin = () => {
  emit('login', { ...loginForm.value })
}

const handleRegister = () => {
  emit('register', { ...registerForm.value })
}

const closeModal = () => {
  emit('update:open', false)
}
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)" :dismissible="!loading" :close="false">
    <template #title>
      <h3 class="text-[1.125rem] font-bold text-[#252B42]">Continua senza perdere il carrello</h3>
    </template>
    <template #body>
      <div class="space-y-[14px]">
        <p class="text-[0.875rem] text-[#737373] leading-[1.5]">
          Accedi o registrati qui. Dopo il successo continui direttamente al pagamento.
        </p>

        <div class="inline-flex rounded-[12px] bg-[#F2F4F5] p-[4px]">
          <button
            type="button"
            @click="switchTab('login')"
            :class="tab === 'login' ? 'bg-white text-[#252B42] shadow-sm' : 'text-[#737373]'"
            class="px-[14px] py-[8px] rounded-[12px] text-[0.8125rem] font-semibold transition cursor-pointer">
            Accedi
          </button>
          <button
            type="button"
            @click="switchTab('register')"
            :class="tab === 'register' ? 'bg-white text-[#252B42] shadow-sm' : 'text-[#737373]'"
            class="px-[14px] py-[8px] rounded-[12px] text-[0.8125rem] font-semibold transition cursor-pointer">
            Registrati
          </button>
        </div>

        <!-- Login form -->
        <div v-if="tab === 'login'" class="space-y-[10px]">
          <div>
            <label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Email</label>
            <input
              v-model="loginForm.email"
              type="email"
              autocomplete="email"
              class="w-full bg-white rounded-[12px] h-[44px] px-[12px] text-[0.9375rem] border border-[#E9EBEC] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
          </div>
          <div>
            <label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Password</label>
            <input
              v-model="loginForm.password"
              type="password"
              autocomplete="current-password"
              class="w-full bg-white rounded-[12px] h-[44px] px-[12px] text-[0.9375rem] border border-[#E9EBEC] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
          </div>
        </div>

        <!-- Register form -->
        <div v-else class="space-y-[10px]">
          <div class="grid grid-cols-1 tablet:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Nome</label>
              <input
                v-model="registerForm.name"
                type="text"
                autocomplete="given-name"
                class="w-full bg-white rounded-[12px] h-[44px] px-[12px] text-[0.9375rem] border border-[#E9EBEC] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
            </div>
            <div>
              <label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Cognome</label>
              <input
                v-model="registerForm.surname"
                type="text"
                autocomplete="family-name"
                class="w-full bg-white rounded-[12px] h-[44px] px-[12px] text-[0.9375rem] border border-[#E9EBEC] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
            </div>
          </div>

          <div class="grid grid-cols-1 tablet:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Email</label>
              <input
                v-model="registerForm.email"
                type="email"
                autocomplete="email"
                class="w-full bg-white rounded-[12px] h-[44px] px-[12px] text-[0.9375rem] border border-[#E9EBEC] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
            </div>
            <div>
              <label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Conferma email</label>
              <input
                v-model="registerForm.email_confirmation"
                type="email"
                autocomplete="email"
                class="w-full bg-white rounded-[12px] h-[44px] px-[12px] text-[0.9375rem] border border-[#E9EBEC] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
            </div>
          </div>

          <div class="grid grid-cols-1 tablet:grid-cols-[120px_1fr] gap-2.5">
            <div>
              <label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Prefisso</label>
              <input
                v-model="registerForm.prefix"
                type="text"
                class="w-full bg-white rounded-[12px] h-[44px] px-[12px] text-[0.9375rem] border border-[#E9EBEC] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
            </div>
            <div>
              <label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Telefono</label>
              <input
                v-model="registerForm.telephone_number"
                type="tel"
                autocomplete="tel"
                class="w-full bg-white rounded-[12px] h-[44px] px-[12px] text-[0.9375rem] border border-[#E9EBEC] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
            </div>
          </div>

          <div class="grid grid-cols-1 tablet:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Password</label>
              <input
                v-model="registerForm.password"
                type="password"
                autocomplete="new-password"
                class="w-full bg-white rounded-[12px] h-[44px] px-[12px] text-[0.9375rem] border border-[#E9EBEC] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
            </div>
            <div>
              <label class="block text-[0.8125rem] text-[#737373] mb-[4px]">Conferma password</label>
              <input
                v-model="registerForm.password_confirmation"
                type="password"
                autocomplete="new-password"
                class="w-full bg-white rounded-[12px] h-[44px] px-[12px] text-[0.9375rem] border border-[#E9EBEC] focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)] transition" />
            </div>
          </div>
        </div>

        <p v-if="error" class="text-[0.8125rem] text-red-600 bg-red-50 border border-red-200 rounded-[12px] px-[10px] py-[8px]">
          {{ error }}
        </p>
        <p v-if="success" class="text-[0.8125rem] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-[12px] px-[10px] py-[8px]">
          {{ success }}
        </p>

        <div v-if="error && error.toLowerCase().includes('verific')" class="text-[0.8125rem]">
          <NuxtLink :to="`/autenticazione?redirect=${encodeURIComponent(redirectPath)}`" class="text-[#095866] font-semibold hover:underline cursor-pointer">
            Apri verifica account
          </NuxtLink>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex flex-col-reverse tablet:flex-row justify-end gap-2.5">
        <button
          type="button"
          @click="closeModal"
          :disabled="loading"
          class="inline-flex items-center justify-center gap-1.5 px-[16px] min-h-[42px] rounded-[12px] border border-[#E9EBEC] text-[#737373] hover:bg-[#F7F9FA] transition cursor-pointer disabled:opacity-60">
          Annulla
        </button>
        <button
          v-if="tab === 'login'"
          type="button"
          @click="handleLogin"
          :disabled="loading"
          class="inline-flex items-center justify-center gap-1.5 px-[16px] min-h-[42px] rounded-[12px] bg-[#E44203] text-white font-semibold hover:bg-[#c93800] transition cursor-pointer disabled:opacity-60">
          {{ loading ? 'Accesso...' : 'Accedi e continua' }}
        </button>
        <button
          v-else
          type="button"
          @click="handleRegister"
          :disabled="loading"
          class="inline-flex items-center justify-center gap-1.5 px-[16px] min-h-[42px] rounded-[12px] bg-[#E44203] text-white font-semibold hover:bg-[#c93800] transition cursor-pointer disabled:opacity-60">
          {{ loading ? 'Registrazione...' : 'Registrati e continua' }}
        </button>
      </div>
    </template>
  </UModal>
</template>
