<script setup>
import '~/assets/css/account-shell.css';

defineProps({
	title: { type: String, required: true },
	description: { type: String, default: '' },
	eyebrow: { type: String, default: '' },
	crumbs: {
		type: Array,
		default: () => [{ label: 'Account', to: '/account' }],
	},
	backTo: { type: String, default: '' },
	backLabel: { type: String, default: "Torna all'account" },
	centered: { type: Boolean, default: false },
});
</script>

<template>
	<div class="sf-account-page-header">
		<div class="sf-account-page-header__surface">
			<div v-if="crumbs.length || backTo" class="sf-account-page-header__topline">
				<div v-if="crumbs.length" class="sf-account-page-header__crumbs">
					<template v-for="(crumb, index) in crumbs" :key="`${crumb.label}-${index}`">
						<NuxtLink v-if="crumb.to" :to="crumb.to" class="sf-account-page-header__crumb-link">
							{{ crumb.label }}
						</NuxtLink>
						<span v-else class="sf-account-page-header__crumb-current">{{ crumb.label }}</span>
						<span v-if="index < crumbs.length - 1" class="sf-account-page-header__crumb-divider">/</span>
					</template>
				</div>

				<NuxtLink v-if="backTo" :to="backTo" class="sf-account-page-header__backlink">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor">
						<path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
					</svg>
					{{ backLabel }}
				</NuxtLink>
			</div>

			<div :class="['sf-account-page-header__body', centered ? 'items-center text-center' : '']">
				<div
					:class="[
						'sf-account-page-header__main',
						$slots.identity ? 'sf-account-page-header__main--identity' : '',
						centered ? 'items-center text-center' : '',
					]">
					<div v-if="$slots.identity" class="sf-account-page-header__identity">
						<slot name="identity" />
					</div>

					<div :class="['sf-account-page-header__intro', centered ? 'items-center text-center max-w-[720px]' : '']">
						<p v-if="eyebrow" class="sf-section-kicker mb-[6px]">{{ eyebrow }}</p>
						<h1 class="sf-section-title">{{ title }}</h1>
						<p v-if="description" class="sf-section-description mt-[6px]">{{ description }}</p>
						<div v-if="$slots.meta" class="sf-account-page-header__meta mt-[6px]">
							<slot name="meta" />
						</div>
					</div>
				</div>

				<div
					v-if="$slots.actions"
					:class="['sf-account-page-header__actions', centered ? 'w-full justify-center' : 'w-full desktop:w-auto desktop:shrink-0']">
					<slot name="actions" />
				</div>
			</div>

			<div v-if="$slots.default" class="sf-account-page-header__content">
				<slot />
			</div>
		</div>
	</div>
</template>
