<!-- COMPONENTE: SfToast (molecule) -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Props {
  type?: ToastType;
  title?: string;
  message?: string;
  duration?: number;  // ms, 0 = persistente
  closable?: boolean;
  action?: string;    // label bottone azione opzionale
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  title: '',
  message: '',
  duration: 5000,
  closable: true,
  action: '',
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'action'): void;
}>();

const visible = ref(true);
let timer: ReturnType<typeof setTimeout> | null = null;

// Icone SVG inline per ogni variante (nessuna dipendenza esterna)
const ICONS: Record<ToastType, string> = {
  success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="m8 12 3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M15 9 9 15m0-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  info:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8h.01M12 12v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 9v4m0 4h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

const icon = computed(() => ICONS[props.type]);
const ariaLive = computed(() => (props.type === 'error' ? 'assertive' : 'polite'));

function close() {
  visible.value = false;
  emit('close');
}

onMounted(() => {
  if (props.duration > 0) timer = setTimeout(close, props.duration);
});
onBeforeUnmount(() => { if (timer) clearTimeout(timer); });
</script>

<template>
  <Transition name="sf-toast-slide">
    <div
      v-if="visible"
      :class="['sf-toast', `sf-toast--${type}`]"
      role="status"
      :aria-live="ariaLive"
    >
      <!-- Icona variante -->
      <span class="sf-toast__icon" v-html="icon" aria-hidden="true" />

      <!-- Testo -->
      <div class="sf-toast__body">
        <span v-if="title" class="sf-toast__title">{{ title }}</span>
        <span v-if="message" :class="['sf-toast__message', { 'sf-toast__message--solo': !title }]">{{ message }}</span>
      </div>

      <!-- Azione opzionale -->
      <button
        v-if="action"
        type="button"
        class="sf-toast__action"
        @click="$emit('action')"
      >
        {{ action }}
      </button>

      <!-- Chiudi -->
      <button
        v-if="closable"
        type="button"
        class="sf-toast__close"
        aria-label="Chiudi notifica"
        @click="close"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Base ── */
.sf-toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--color-brand-card, #fff);
  border: 1px solid var(--color-brand-border, #E9EBEC);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, .08), 0 1px 3px rgba(15, 23, 42, .06);
  min-width: 280px;
  max-width: 420px;
  font-family: var(--font-inter, 'Inter', sans-serif);
  font-size: var(--font-size-sm, 14px);
  position: relative;
  overflow: hidden;
}

/* Striscia colorata sinistra */
.sf-toast::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  border-radius: 12px 0 0 12px;
}

/* ── Icona ── */
.sf-toast__icon {
  flex-shrink: 0;
  display: inline-flex;
  margin-top: 1px;
}

/* ── Body ── */
.sf-toast__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.sf-toast__title {
  font-weight: 600;
  color: var(--color-brand-text, #1D2738);
  line-height: 1.35;
  display: block;
}
.sf-toast__message {
  color: var(--color-brand-text-secondary, #5A6474);
  line-height: 1.45;
  display: block;
}
.sf-toast__message--solo {
  color: var(--color-brand-text, #1D2738);
}

/* ── Azione ── */
.sf-toast__action {
  background: transparent;
  border: none;
  font: inherit;
  font-weight: 600;
  font-size: 13px;
  color: var(--color-brand-primary, #095866);
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 6px;
  flex-shrink: 0;
  white-space: nowrap;
  align-self: center;
}
.sf-toast__action:hover { background: rgba(9, 88, 102, .08); }
.sf-toast__action:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(9, 88, 102, .5); }

/* ── Chiudi ── */
.sf-toast__close {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 3px;
  color: var(--color-brand-text-muted, #94A3B8);
  display: inline-flex;
  border-radius: 6px;
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 1px;
}
.sf-toast__close:hover { color: var(--color-brand-text, #1D2738); background: var(--color-brand-bg-alt, #f3f4f6); }
.sf-toast__close:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(9, 88, 102, .5); }

/* ── Varianti colore ── */
/* success — verde #166534 */
.sf-toast--success::before { background: #166534; }
.sf-toast--success .sf-toast__icon { color: #166534; }

/* error — arancione brand #E44203 */
.sf-toast--error::before { background: #E44203; }
.sf-toast--error .sf-toast__icon { color: #E44203; }

/* info — teal #095866 */
.sf-toast--info::before { background: #095866; }
.sf-toast--info .sf-toast__icon { color: #095866; }

/* warning — arancione soft */
.sf-toast--warning::before { background: #D97706; }
.sf-toast--warning .sf-toast__icon { color: #D97706; }

/* ── Animazione slide+fade ── */
.sf-toast-slide-enter-active,
.sf-toast-slide-leave-active {
  transition: opacity 220ms cubic-bezier(.22, 1, .36, 1), transform 220ms cubic-bezier(.22, 1, .36, 1);
}
.sf-toast-slide-enter-from {
  opacity: 0;
  transform: translateX(20px) scale(0.97);
}
.sf-toast-slide-leave-to {
  opacity: 0;
  transform: translateX(10px) scale(0.96);
}

@media (max-width: 640px) {
  /* Su mobile: slide dall'alto */
  .sf-toast-slide-enter-from { transform: translateY(-12px) scale(0.97); }
  .sf-toast-slide-leave-to   { transform: translateY(-8px) scale(0.96); }
}

@media (prefers-reduced-motion: reduce) {
  .sf-toast-slide-enter-active,
  .sf-toast-slide-leave-active { transition: opacity 150ms ease; }
  .sf-toast-slide-enter-from,
  .sf-toast-slide-leave-to { transform: none; }
}
</style>
