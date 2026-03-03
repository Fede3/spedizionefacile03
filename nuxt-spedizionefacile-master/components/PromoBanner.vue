<!--
  COMPONENTE: PromoBanner.vue
  SCOPO: Banner promozionale personalizzabile dall'admin. Supporta immagine, testi, CTA e colori custom.
  PROPS: banner (oggetto con banner_title, banner_subtitle, banner_cta_text, banner_cta_url, banner_bg_color, banner_text_color, banner_image)
  DOVE SI USA: pages/index.vue (homepage)
-->
<script setup>
const props = defineProps({
	banner: { type: Object, required: true },
});

const bgColor = computed(() => props.banner.banner_bg_color || '#095866');
const textColor = computed(() => props.banner.banner_text_color || '#ffffff');
</script>

<template>
	<div
		class="promo-banner rounded-[16px] desktop:rounded-[20px] overflow-hidden"
		:style="{ backgroundColor: bgColor }">
		<div class="flex flex-col desktop:flex-row items-center gap-[20px] desktop:gap-[40px] p-[24px] desktop:p-[40px]">
			<!-- Immagine (se presente) -->
			<div v-if="banner.banner_image" class="w-full desktop:w-[280px] shrink-0">
				<img
					:src="banner.banner_image"
					:alt="banner.banner_title || ''"
					loading="lazy"
					decoding="async"
					class="w-full h-auto rounded-[12px] object-cover max-h-[200px] desktop:max-h-[160px]" >
			</div>

			<!-- Testo -->
			<div class="flex-1 text-center desktop:text-left">
				<h3
					v-if="banner.banner_title"
					class="text-[1.25rem] desktop:text-[1.5rem] font-bold tracking-[-0.48px] mb-[8px] leading-[130%]"
					:style="{ color: textColor }">
					{{ banner.banner_title }}
				</h3>
				<p
					v-if="banner.banner_subtitle"
					class="text-[0.875rem] desktop:text-[1rem] leading-[160%] mb-[16px] desktop:mb-[20px] opacity-85"
					:style="{ color: textColor }">
					{{ banner.banner_subtitle }}
				</p>
				<NuxtLink
					v-if="banner.banner_cta_text && banner.banner_cta_url"
					:to="banner.banner_cta_url"
					class="inline-flex items-center gap-[8px] px-[24px] py-[12px] rounded-[12px] bg-white/20 hover:bg-white/30 font-semibold text-[0.875rem] desktop:text-[0.9375rem] transition-colors min-h-[44px]"
					:style="{ color: textColor }">
					{{ banner.banner_cta_text }}
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10"/><path d="M9 4l4 4-4 4"/></svg>
				</NuxtLink>
			</div>
		</div>
	</div>
</template>
