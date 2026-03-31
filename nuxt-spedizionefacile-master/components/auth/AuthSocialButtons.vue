<script setup lang="ts">
defineProps<{
  providers: { google: boolean; facebook: boolean; apple: boolean }
}>()

const emit = defineEmits<{
  (e: 'social-auth', provider: 'google' | 'facebook' | 'apple'): void
}>()
</script>

<template>
  <div class="auth-overlay-social-stack">
    <div class="auth-social-grid">
      <button
        type="button"
        :class="['auth-social-button', !providers.google ? 'auth-social-button--unavailable' : '']"
        @click="emit('social-auth', 'google')"
      >
        <span class="auth-social-button__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
        </span>
        <span class="auth-social-button__text">Google</span>
      </button>
      <button
        type="button"
        :class="['auth-social-button', !providers.facebook ? 'auth-social-button--unavailable' : '']"
        @click="emit('social-auth', 'facebook')"
      >
        <span class="auth-social-button__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#1877F2" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.022 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.017 1.792-4.684 4.533-4.684 1.313 0 2.686.235 2.686.235v2.963H15.83c-1.491 0-1.956.927-1.956 1.879v2.27h3.328l-.532 3.49h-2.796V24C19.612 23.095 24 18.099 24 12.073z"/>
          </svg>
        </span>
        <span class="auth-social-button__text">Facebook</span>
      </button>
      <button
        type="button"
        :class="['auth-social-button', !providers.apple ? 'auth-social-button--unavailable' : '']"
        @click="emit('social-auth', 'apple')"
      >
        <span class="auth-social-button__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.37 12.36c.02 2.14 1.88 2.85 1.9 2.86-.02.05-.3 1.04-1 2.07-.61.89-1.24 1.77-2.24 1.79-.98.02-1.3-.58-2.42-.58-1.12 0-1.48.56-2.4.6-.96.04-1.69-.96-2.3-1.85-1.25-1.81-2.2-5.13-.92-7.36.63-1.11 1.76-1.81 2.99-1.83.93-.02 1.81.63 2.42.63.61 0 1.74-.78 2.93-.66.5.02 1.91.2 2.81 1.51-.07.04-1.68.98-1.67 2.82Zm-2.04-5.05c.51-.62.85-1.48.75-2.34-.73.03-1.62.48-2.14 1.09-.47.54-.88 1.41-.77 2.25.81.06 1.64-.42 2.16-1Z"/>
          </svg>
        </span>
        <span class="auth-social-button__text">Apple</span>
      </button>
    </div>
    <div class="auth-overlay-divider" aria-hidden="true"></div>
  </div>
</template>
