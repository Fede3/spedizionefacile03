<script setup lang="ts">
// Blocco social auth (Google / Apple / Facebook) condiviso tra Login e Registrati.
// La logica di redirect OAuth vive in useAuthOverlay.startSocialAuth — qui solo presentazione.

defineProps({
  providers: {
    type: Object as () => { google?: boolean; apple?: boolean; facebook?: boolean },
    required: true,
  },
})

const emit = defineEmits<{
  (e: 'social-auth', provider: 'google' | 'apple' | 'facebook'): void
}>()
</script>

<template>
  <div>
    <!-- Divider -->
    <div class="flex items-center gap-[12px] mt-[6px]" aria-hidden="true">
      <div class="flex-1 h-[1px] bg-[#DFE2E7]" />
      <span class="text-[var(--color-brand-text-muted)] text-[11px] font-medium shrink-0">oppure continua con</span>
      <div class="flex-1 h-[1px] bg-[#DFE2E7]" />
    </div>

    <div class="flex flex-col gap-[8px] mt-[8px]">
      <!-- Google full-width — branded: white + border #dadce0 + logo multicolor -->
      <button
        type="button"
        :class="[
          'flex h-[44px] w-full items-center justify-center gap-[10px] rounded-full text-[14px] font-semibold cursor-pointer transition-all duration-[350ms] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#4285F4]/30 hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]',
          !providers.google && 'opacity-45 !cursor-not-allowed pointer-events-none',
        ]"
        style="background:#ffffff; border:1.5px solid #dadce0; color:#1f1f1f;"
        @click="emit('social-auth', 'google')"
      >
        <!-- Google G multicolor logo ufficiale -->
        <svg width="18" height="18" viewBox="0 0 48 48" class="shrink-0" aria-hidden="true">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
          <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
        </svg>
        Continua con Google
      </button>

      <!-- Apple + Facebook grid -->
      <div class="grid grid-cols-2 gap-[8px]">
        <!-- Apple — branded: black bg + white logo -->
        <button
          type="button"
          :class="[
            'flex h-[44px] items-center justify-center gap-[8px] rounded-full text-[13px] font-semibold cursor-pointer transition-all duration-[350ms] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-black/30 hover:shadow-[0_4px_14px_rgba(0,0,0,0.18)]',
            !providers.apple && 'opacity-45 !cursor-not-allowed pointer-events-none',
          ]"
          style="background:#000000; color:#ffffff; border:1.5px solid #000000;"
          @click="emit('social-auth', 'apple')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" class="shrink-0" aria-hidden="true">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-2.22 4.45-3.74 4.25z" />
          </svg>
          Apple
        </button>
        <!-- Facebook — neutral outline (brand rule: no blue) -->
        <button
          type="button"
          :class="[
            'flex h-[44px] items-center justify-center gap-[8px] rounded-full text-[13px] font-semibold cursor-pointer transition-all duration-[350ms] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#095866]/25 hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]',
            !providers.facebook && 'opacity-45 !cursor-not-allowed pointer-events-none',
          ]"
          style="background:#ffffff; color:#1d2738; border:1.5px solid #d5dae2;"
          @click="emit('social-auth', 'facebook')"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1d2738" class="shrink-0" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>
    </div>
  </div>
</template>
