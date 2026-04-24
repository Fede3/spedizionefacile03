<script setup lang="ts">
import { computed } from 'vue';

type IconPreset = 'package' | 'search' | 'inbox' | 'lock' | 'error';

interface Props {
  title: string;
  description?: string;
  /** Preset enum (SVG duotone inline) oppure stringa icona UIcon (backward-compat) */
  icon?: IconPreset | string;
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  icon: '',
});

// SVG duotone: strato bg in teal soft (#E8F3F5), strato fg in teal (#095866) + accent (#E44203)
const PRESET_ICONS: Record<IconPreset, string> = {
  package: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect width="64" height="64" rx="20" fill="#E8F3F5"/>
    <path d="M32 14l18 9v18L32 50 14 41V23L32 14Z" fill="#095866" fill-opacity=".12" stroke="#095866" stroke-width="2" stroke-linejoin="round"/>
    <path d="M32 14l18 9M32 14l-18 9M32 32v18M14 23l18 9 18-9" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M23 19l18 9" stroke="#E44203" stroke-width="2" stroke-linecap="round" opacity=".7"/>
  </svg>`,

  search: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect width="64" height="64" rx="20" fill="#E8F3F5"/>
    <circle cx="29" cy="29" r="13" fill="#095866" fill-opacity=".10" stroke="#095866" stroke-width="2"/>
    <path d="m39 39 8 8" stroke="#095866" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M24 29h10M29 24v10" stroke="#E44203" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  </svg>`,

  inbox: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect width="64" height="64" rx="20" fill="#E8F3F5"/>
    <rect x="13" y="20" width="38" height="28" rx="4" fill="#095866" fill-opacity=".10" stroke="#095866" stroke-width="2"/>
    <path d="M13 33h10l4 6h10l4-6h10" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M24 26h16" stroke="#E44203" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    <path d="M28 31h8" stroke="#E44203" stroke-width="2" stroke-linecap="round" opacity=".5"/>
  </svg>`,

  lock: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect width="64" height="64" rx="20" fill="#E8F3F5"/>
    <rect x="16" y="30" width="32" height="22" rx="5" fill="#095866" fill-opacity=".12" stroke="#095866" stroke-width="2"/>
    <path d="M21 30v-7a11 11 0 0 1 22 0v7" stroke="#095866" stroke-width="2" stroke-linecap="round"/>
    <circle cx="32" cy="41" r="4" fill="#E44203" opacity=".85"/>
    <path d="M32 44v3" stroke="#E44203" stroke-width="2" stroke-linecap="round" opacity=".7"/>
  </svg>`,

  error: `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <rect width="64" height="64" rx="20" fill="#FEF0EB"/>
    <circle cx="32" cy="32" r="16" fill="#E44203" fill-opacity=".12" stroke="#E44203" stroke-width="2"/>
    <path d="M32 22v12" stroke="#E44203" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="32" cy="40" r="1.5" fill="#E44203"/>
    <path d="M26 26l12 12M38 26 26 38" stroke="#095866" stroke-width="1.5" stroke-linecap="round" opacity=".25"/>
  </svg>`,
};

const ENUM_KEYS = Object.keys(PRESET_ICONS) as IconPreset[];

const isPreset = computed(() => ENUM_KEYS.includes(props.icon as IconPreset));
const presetSvg = computed(() => (isPreset.value ? PRESET_ICONS[props.icon as IconPreset] : null));
const isUIcon = computed(() => !isPreset.value && props.icon && props.icon.includes(':'));
</script>

<template>
  <div class="sf-empty" role="status">
    <!-- Slot icon (override totale) -->
    <div v-if="$slots.icon" class="sf-empty__visual sf-empty__visual--slot">
      <slot name="icon" />
    </div>

    <!-- Preset SVG duotone inline -->
    <div v-else-if="isPreset" class="sf-empty__visual sf-empty__visual--preset" v-html="presetSvg" />

    <!-- UIcon backward-compat (stringa tipo "mdi:package-variant") -->
    <div v-else-if="isUIcon" class="sf-empty__visual sf-empty__visual--uicon">
      <UIcon :name="icon" class="sf-empty__icon" aria-hidden="true" />
    </div>

    <h3 class="sf-empty__title">{{ title }}</h3>
    <p v-if="description" class="sf-empty__description">{{ description }}</p>
    <div v-if="$slots.action" class="sf-empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
/* v2 */
.sf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  gap: 12px;
  max-width: 420px;
  margin-inline: auto;
}

/* Visual wrapper */
.sf-empty__visual {
  margin-bottom: 4px;
}
.sf-empty__visual--preset,
.sf-empty__visual--slot {
  line-height: 0; /* evita spazio extra sotto SVG */
}
.sf-empty__visual--uicon {
  width: 72px;
  height: 72px;
  border-radius: 9999px;
  background: var(--color-brand-secondary-soft-bg, #E8F3F5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-brand-primary, #095866);
}
.sf-empty__icon {
  width: 36px;
  height: 36px;
}

/* Testi */
.sf-empty__title {
  font-family: var(--font-montserrat, 'Montserrat', sans-serif);
  font-size: var(--font-size-lg, 18px);
  font-weight: 700;
  color: var(--color-brand-text, #1D2738);
  margin: 0;
  line-height: 1.35;
}
.sf-empty__description {
  font-size: var(--font-size-sm, 14px);
  line-height: 1.55;
  color: var(--color-brand-text-muted, #94A3B8);
  margin: 0;
}

/* Azioni */
.sf-empty__action {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
