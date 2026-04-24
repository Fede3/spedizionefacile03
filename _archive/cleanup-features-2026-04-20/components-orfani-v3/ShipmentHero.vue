<script setup>
/**
 * Estratta da pages/la-tua-spedizione/[step].vue.
 * Hero Preventivo (icona + H1 + descrizione) e breadcrumb.
 * Sprint 1.1: solo 1 icona + H1 + description. No eyebrow, no badge stage.
 */
defineProps({
	title: { type: String, required: true },
	description: { type: String, required: true },
});
</script>

<template>
	<div>
		<div class="mx-auto mb-[12px] max-w-[920px] px-[16px] py-[12px] text-center sm:px-[24px] sm:py-[16px]">
			<div class="flex justify-center">
				<span class="inline-flex h-[58px] w-[58px] items-center justify-center rounded-[18px] border border-[rgba(9,88,102,0.12)] bg-[#F3FAFB] text-[#095866] shadow-[0_14px_32px_rgba(9,88,102,0.08)]">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
						<path d="M3 7l9 4 9-4" />
						<path d="M12 11v10" />
					</svg>
				</span>
			</div>
			<h1 class="mt-[14px] text-[#1d2738] text-[32px] leading-[1.02] tracking-[-1.2px] sm:text-[42px]" style="font-weight:800">
				{{ title }}
			</h1>
			<p class="mx-auto mt-[10px] max-w-[720px] text-[15px] leading-[1.65] text-[#5C6473] sm:text-[17px]" style="font-weight:600">
				{{ description }}
			</p>
		</div>

		<nav class="page-breadcrumb" aria-label="Posizione" style="padding-left: 0; padding-right: 0; max-width: none">
			<NuxtLink to="/" class="page-breadcrumb__link">Home</NuxtLink>
			<span class="page-breadcrumb__separator" aria-hidden="true">/</span>
			<span class="page-breadcrumb__current">Preventivo</span>
		</nav>
	</div>
</template>
