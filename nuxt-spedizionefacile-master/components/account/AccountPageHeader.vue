<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  crumbs: {
    type: Array,
    default: () => [{ label: 'Account', to: '/account' }],
  },
  backTo: { type: String, default: '' },
  backLabel: { type: String, default: 'Torna all\'account' },
  centered: { type: Boolean, default: false },
});
</script>

<template>
  <div class="mb-[14px] tablet:mb-[18px] desktop:mb-[20px]">
    <div class="rounded-[12px] border border-[#E5EDF2] bg-white px-[14px] py-[14px] shadow-[0_6px_24px_rgba(9,88,102,0.05)] tablet:px-[18px] tablet:py-[16px] desktop:px-[22px] desktop:py-[18px]">
      <div v-if="crumbs.length" class="mb-[8px] flex flex-wrap items-center gap-x-[8px] gap-y-[4px] text-[0.75rem] tablet:text-[0.8125rem] text-[#7A8695]">
        <template v-for="(crumb, index) in crumbs" :key="`${crumb.label}-${index}`">
          <NuxtLink
            v-if="crumb.to"
            :to="crumb.to"
            class="text-[#095866] font-medium hover:underline"
          >
            {{ crumb.label }}
          </NuxtLink>
          <span v-else class="font-semibold text-[#252B42]">{{ crumb.label }}</span>
          <span v-if="index < crumbs.length - 1" class="text-[#C8CCD0]">/</span>
        </template>
      </div>

      <NuxtLink
        v-if="backTo"
        :to="backTo"
        class="mb-[8px] inline-flex items-center gap-[6px] text-[0.75rem] tablet:text-[0.8125rem] text-[#095866] hover:underline font-medium"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
        {{ backLabel }}
      </NuxtLink>

      <div
        :class="[
          'flex gap-[10px] tablet:gap-[14px]',
          centered
            ? 'items-center text-center flex-col'
            : 'flex-col desktop:flex-row desktop:items-center desktop:justify-between'
        ]"
      >
        <div :class="centered ? 'max-w-[720px]' : 'max-w-[56rem]'">
          <p v-if="eyebrow" class="sf-section-kicker mb-[6px]">{{ eyebrow }}</p>
          <h1 class="sf-section-title">{{ title }}</h1>
          <p v-if="description" class="sf-section-description mt-[6px]">{{ description }}</p>
          <div v-if="$slots.meta" class="mt-[6px]">
            <slot name="meta" />
          </div>
        </div>

        <div
          v-if="$slots.actions"
          :class="centered ? 'w-full flex justify-center' : 'w-full desktop:w-auto desktop:shrink-0'"
        >
          <div class="flex w-full flex-col gap-[8px] tablet:flex-row tablet:flex-wrap desktop:w-auto desktop:flex-row desktop:items-center desktop:justify-end">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
