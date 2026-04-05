<script setup>
import { accountCardIcons } from '~/utils/accountNavigation';

defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  compact: { type: Boolean, default: false },
  crumbs: { type: Array, default: () => [] },
  tabs: { type: Array, default: () => [] },
  currentTab: { type: String, default: '' },
  summaryCards: { type: Array, default: () => [] },
  showLogout: { type: Boolean, default: true },
  logoutLabel: { type: String, default: 'Esci' },
  logoutLoadingLabel: { type: String, default: 'Uscita...' },
  logoutLoading: { type: Boolean, default: false },
  actionBandTitle: { type: String, default: 'Nuova spedizione' },
  actionBandDescription: { type: String, default: '' },
  actionLabel: { type: String, default: 'Nuova spedizione' },
  actionTo: { type: [String, Object], default: '/preventivo' },
});

defineEmits(['logout']);
</script>

<template>
  <AccountPageHeader
    :class="['sf-account-shell-hero', compact ? 'sf-account-shell-hero--compact' : '']"
    :crumbs="crumbs"
    :eyebrow="eyebrow"
    :title="title"
    :description="description">
    <template v-if="$slots.identity" #identity>
      <slot name="identity" />
    </template>

    <template v-if="$slots.meta" #meta>
      <div class="sf-account-inline-meta">
        <slot name="meta" />
      </div>
    </template>

    <template #actions>
      <nav v-if="tabs.length" class="sf-account-shell-tabs" aria-label="Sezioni account">
        <template v-for="tab in tabs" :key="tab.key">
          <span
            v-if="tab.key === currentTab"
            class="sf-account-shell-tabs__item sf-account-shell-tabs__item--active"
            aria-current="page">
            {{ tab.label }}
          </span>
          <NuxtLink
            v-else
            :to="tab.to"
            class="sf-account-shell-tabs__item">
            {{ tab.label }}
          </NuxtLink>
        </template>
      </nav>
      <button
        v-if="showLogout"
        type="button"
        @click="$emit('logout')"
        :disabled="logoutLoading"
        class="btn-secondary btn-compact inline-flex items-center justify-center">
        {{ logoutLoading ? logoutLoadingLabel : logoutLabel }}
      </button>
    </template>

    <div v-if="summaryCards.length" class="sf-account-summary-strip">
      <div v-for="card in summaryCards" :key="card.key" class="sf-account-summary-item">
        <div class="sf-account-summary-item__icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="h-[18px] w-[18px]"
            :fill="card.iconColor || 'var(--color-brand-primary)'"
            v-html="accountCardIcons[card.iconKey]"></svg>
        </div>
        <div class="sf-account-summary-item__body">
          <p class="sf-account-summary-item__value">{{ card.value }}</p>
          <p class="sf-account-summary-item__label">{{ card.label }}</p>
          <p class="sf-account-summary-item__meta">{{ card.meta }}</p>
        </div>
      </div>
    </div>
  </AccountPageHeader>

  <div v-if="actionLabel" :class="['sf-account-action-band', compact ? 'sf-account-action-band--compact' : '']">
    <div class="sf-account-action-band__lead">
      <p>{{ actionBandTitle }}</p>
      <p v-if="actionBandDescription">{{ actionBandDescription }}</p>
    </div>
    <div class="sf-account-action-band__actions">
      <NuxtLink
        :to="actionTo"
        class="btn-cta btn-compact inline-flex items-center gap-[7px]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor">
          <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
        </svg>
        <span>{{ actionLabel }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
