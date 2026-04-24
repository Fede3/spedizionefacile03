<!-- COMPONENTE: SfSpinner (atom) -->
<script setup lang="ts">
import { computed } from 'vue';

type Size = 'sm' | 'md' | 'lg';

interface Props {
  size?: Size;
  color?: string;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: '',
  label: 'Caricamento in corso',
});

const dimension = computed(() => ({
  sm: 16,
  md: 24,
  lg: 32,
}[props.size]));

const strokeColor = computed(() => {
  if (!props.color) return 'var(--color-brand-primary, #095866)';
  if (props.color === 'inherit') return 'currentColor';
  return props.color;
});

const classes = computed(() => ['sf-spinner', `sf-spinner--${props.size}`]);
</script>

<template>
  <span
    :class="classes"
    role="status"
    :aria-label="label"
    :style="{ width: `${dimension}px`, height: `${dimension}px` }"
  >
    <svg
      class="sf-spinner__svg"
      :width="dimension"
      :height="dimension"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        :stroke="strokeColor"
        stroke-opacity="0.18"
        stroke-width="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        :stroke="strokeColor"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
    <span class="sf-spinner__sr">{{ label }}</span>
  </span>
</template>

<style scoped>
.sf-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  vertical-align: middle;
}
.sf-spinner__svg {
  animation: sf-spinner-rotate 720ms linear infinite;
  transform-origin: center;
}
.sf-spinner__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@keyframes sf-spinner-rotate {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .sf-spinner__svg { animation-duration: 1800ms; }
}
</style>
