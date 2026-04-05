<!--
	COMPONENTE: ContenutoHeader (ContenutoHeader.vue)
	SCOPO: Mostra il contenuto dell'intestazione (hero) che cambia in base alla pagina corrente.

	DOVE SI USA: components/Header.vue (unico padre)
	PROPS: title, description, button, image, path (tutti opzionali, usati per pagine generiche)
	EMITS: nessuno

	DATI IN INGRESSO: useContenutoHeader() (hero config, stili, preload),
	                  usePriceBands() (prezzo minimo per il badge hero),
	                  route.path (per decidere quale sezione mostrare)
	DATI IN USCITA: nessuno (solo visualizzazione)

	VINCOLI: il prezzo minimo nel hero DEVE corrispondere alla prima fascia peso
	PUNTI DI MODIFICA SICURI: testi, stili CSS, struttura HTML delle singole sezioni
	COLLEGAMENTI: composables/useContenutoHeader.js, composables/usePriceBands.js
-->
<script setup>
const route = useRoute();

const props = defineProps({
	title: String,
	description: String,
	button: String,
	image: String,
	path: String,
});

// Hero logic (immagine, viewport, preview, lifecycle)
const { isHomepageHeroRoute, heroImageUrl, heroImageStyle, prefetchHero } = useContenutoHeader();

// Fasce prezzo per badge hero
const { loadPriceBands, getMinPrice, promoSettings } = usePriceBands();
const { formatEuro } = await import('~/utils/price.js');

if (isHomepageHeroRoute.value) {
	await prefetchHero();
	await loadPriceBands();
}

const minPriceInfo = computed(() => getMinPrice());
const minPriceFormatted = computed(() => {
	const p = minPriceInfo.value?.effectivePrice;
	if (!p) return '8,90';
	return formatEuro(p);
});
const minBasePriceFormatted = computed(() => {
	const p = minPriceInfo.value?.basePrice;
	if (!p) return null;
	return formatEuro(p);
});
const showMinPriceDiscount = computed(() => {
	return minPriceInfo.value?.hasDiscount && minPriceInfo.value?.showDiscount && promoSettings.value?.show_badges;
});
</script>

<template>
	<!-- ============================================================
	     HOMEPAGE HERO
	     ============================================================ -->
	<div class="relative z-[2] overflow-hidden pt-[18px] pb-[28px] tablet:pt-[32px] tablet:pb-[60px] desktop:pt-[64px] desktop:pb-[40px] desktop-xl:pt-[68px] desktop-xl:pb-[48px]" v-if="isHomepageHeroRoute">
		<!-- Decorazione teal dietro la card -->
		<div
			class="pointer-events-none absolute right-[8px] top-[128px] h-[108px] w-[94px] rotate-[6deg] rounded-[12px] bg-gradient-to-br from-[var(--color-brand-primary)] to-[#0b6d7d] opacity-[0.05] tablet:right-[24px] tablet:top-[104px] tablet:h-[200px] tablet:w-[200px] tablet:opacity-[0.05] desktop:right-[2%] desktop:top-[48px] desktop:h-[140px] desktop:w-[620px] desktop:rotate-[5deg] desktop:opacity-[0.06] desktop-xl:right-[3%] desktop-xl:top-[48px] desktop-xl:h-[150px] desktop-xl:w-[700px]"></div>

			<div class="relative grid grid-cols-[48%_52%] items-start gap-x-[10px] gap-y-[4px] tablet:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] tablet:gap-x-[12px] tablet:gap-y-[6px] desktop:grid-cols-[minmax(0,340px)_minmax(0,1fr)] desktop:items-center desktop:gap-[24px] desktop-xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)] desktop-xl:gap-[28px]">
				<!-- Colonna sinistra: testo + card prezzo -->
				<div class="relative z-[5] col-start-1 row-start-1 tablet:col-start-1 tablet:row-start-1 desktop:flex desktop:min-h-[300px] desktop:max-w-[420px] desktop:flex-col desktop:justify-center desktop:self-center desktop-xl:min-h-[320px]">
					<h1 class="max-w-[158px] text-[#1a1a1a] text-[1.95rem] leading-[0.92] tracking-[-0.9px] font-extrabold tablet:max-w-none tablet:text-[3rem] desktop:max-w-[280px] desktop:text-[4.1rem] desktop:tracking-[-2.2px] desktop-xl:max-w-[300px] desktop-xl:text-[4.5rem] desktop-xl:tracking-[-2.6px]">
						<span class="block">Spedisci</span>
						<span class="block text-[var(--color-brand-primary)]">facile</span>
					</h1>

				<!-- Card prezzo bianca in risalto -->
				<div
						class="relative z-[7] mt-[8px] flex w-[132px] overflow-hidden rounded-[12px] bg-gradient-to-br from-[var(--color-brand-accent)] to-[var(--color-brand-primary)] shadow-[0_4px_12px_rgba(0,0,0,0.15)] tablet:mt-[16px] tablet:w-[320px] tablet:rounded-[12px] desktop:mt-[24px] desktop:w-[350px] desktop:shadow-[0_8px_24px_rgba(0,0,0,0.15)] desktop-xl:mt-[26px] desktop-xl:w-[370px]">
					<div class="flex flex-col px-[10px] py-[8px] tablet:px-[24px] tablet:py-[20px] desktop:px-[30px] desktop:py-[22px] desktop-xl:px-[36px] desktop-xl:py-[26px]">
						<span class="text-[0.8125rem] font-medium uppercase tracking-[0.8px] text-white/75 tablet:text-[0.875rem] desktop:text-[1rem] desktop:tracking-[1px] desktop-xl:text-[1.0625rem]">a partire da</span>
						<div class="mt-[2px] flex items-baseline gap-[8px]">
							<span v-if="showMinPriceDiscount" class="text-[0.9375rem] font-medium text-white/50 line-through">{{ minBasePriceFormatted }}&euro;</span>
							<span class="text-[2.5rem] font-extrabold leading-[1] tracking-[-1.6px] text-white tablet:text-[4rem] tablet:tracking-[-2.5px] desktop:text-[4.25rem] desktop:tracking-[-2.5px] desktop-xl:text-[5rem] desktop-xl:tracking-[-3px]">{{ minPriceFormatted }}<span class="ml-[1px] align-super text-[1rem] font-bold tracking-[0] text-white tablet:text-[1.75rem] desktop:text-[2.25rem] desktop-xl:text-[2.75rem]">&euro;</span></span>
						</div>
						<span class="mt-[4px] inline-flex items-center gap-[4px] text-[0.58rem] font-semibold text-white/90 tablet:text-[0.8125rem] desktop:mt-[8px] desktop:text-[0.9375rem] desktop-xl:mt-[10px] desktop-xl:text-[1rem]">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="shrink-0"><circle cx="12" cy="12" r="12" fill="rgba(255,255,255,0.3)"/><path d="M7 12.5l3 3 7-7" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							IVA e ritiro incluso
						</span>
					</div>
				</div>

				<!-- Promo badges -->
				<div v-if="showMinPriceDiscount" class="mt-[10px]">
					<span class="inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-[12px] bg-emerald-500 text-white text-[0.8125rem] font-bold">
						-{{ minPriceInfo.discountPercent }}%
					</span>
				</div>
				<div v-if="promoSettings?.active && promoSettings?.label_text" class="mt-[8px]">
					<span
						:style="{ backgroundColor: promoSettings.label_color || 'var(--color-brand-accent)' }"
						class="inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-[12px] text-white text-[0.75rem] font-bold tracking-wide shadow-sm">
						<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" decoding="async" width="40" height="16" class="h-[16px] w-auto shrink-0" />
						{{ promoSettings.label_text }}
					</span>
				</div>
				<p v-if="promoSettings?.active && promoSettings?.description" class="text-[0.8125rem] text-[#555] font-medium mt-[6px]">
					{{ promoSettings.description }}
				</p>
			</div>

			<!-- Colonna destra: immagine -->
				<div class="relative z-[2] col-start-2 row-start-1 row-span-2 mt-[8px] h-[164px] w-full max-w-none rounded-[12px] tablet:col-start-2 tablet:row-start-1 tablet:row-span-1 tablet:mt-[20px] tablet:h-[390px] tablet:max-w-[520px] tablet:mx-auto desktop:mt-0 desktop:h-[320px] desktop:w-full desktop:max-w-[760px] desktop:self-center desktop:justify-self-end desktop-xl:h-[340px] desktop-xl:max-w-[820px]">
				<div class="relative h-full w-full overflow-hidden rounded-[12px] border border-[#DDE5EB] bg-[#EAF1F6] shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
					<img
						:src="heroImageUrl"
						alt="Hero SpediamoFacile"
						class="h-full w-full select-none pointer-events-none"
						:style="heroImageStyle"
						loading="eager"
						fetchpriority="high"
						decoding="async" />
				</div>
			</div>
		</div>
	</div>

	<!-- Servizi -->
	<div v-if="route.path === '/servizi'" class="relative z-2 flex flex-col items-center justify-center desktop:h-[calc(100%-48px)] tablet:h-[calc(100%-42px)] h-[calc(100%-30px)]">
		<h1 class="content-header-kicker text-center">I nostri servizi</h1>
		<p class="text-[1.75rem] desktop-xl:text-[4.5rem] leading-[110%] tracking-[-1.76px] font-medium text-[#222222] text-center desktop:mb-[22px] mb-[18px] mt-[10px] desktop:text-[3.5rem]">
			Soluzioni pratiche per spedire meglio
		</p>
		<a href="#servizi" class="content-header-scroll-link mx-auto block">
			<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:rotate-90 after:align-[-1px]">Scendi</span>
		</a>
	</div>

	<!-- Servizi - pagamento alla consegna -->
	<div
		class="relative z-2 flex flex-col items-start justify-center h-[calc(100%-30px)] desktop:h-[calc(100%-48px)] tablet:h-[calc(100%-42px)]"
		v-if="route.path.includes('pagamento-alla-consegna')">
		<div class="w-full">
			<p class="content-header-kicker text-left">Dettagli servizio</p>
			<h1 class="text-[1.5rem] desktop:text-[3rem] desktop-xl:text-[5.5rem] leading-[110%] tracking-[-0.576px] desktop:tracking-[-2.2112px] font-medium text-[#222222] text-left mt-[12px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[200px] desktop:max-w-full">
				Pagamento alla consegna
			</h1>
			<a href="#pagamento-alla-consegna" class="content-header-scroll-link mt-[16px] desktop-xl:mt-[30px]">
				<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:rotate-90 after:align-[-1px]">Scendi</span>
			</a>
		</div>
	</div>

	<!-- Contatti -->
	<div
		class="relative z-2 flex flex-col items-start justify-center h-[calc(100%-30px)] desktop:h-[calc(100%-48px)] tablet:h-[calc(100%-42px)]"
		v-if="route.path === '/contatti'">
		<div class="w-full max-w-[640px]">
			<h1 class="text-[#222222] font-semibold leading-[105%] tracking-[-0.8px] text-[1.75rem] tablet:text-[2.25rem] desktop:text-[2.75rem]">
				Contatti
			</h1>
			<p class="mt-[10px] max-w-[560px] text-[0.9375rem] tablet:text-[1rem] desktop:text-[1.0625rem] leading-[1.55] text-[#5B6670]">
				Ti aiutiamo con spedizioni, assistenza e richieste commerciali senza farti perdere tempo.
			</p>
		</div>
	</div>

	<!-- Chi siamo -->
	<div
		class="relative z-2 flex flex-col items-center justify-center h-[calc(100%-30px)] desktop:h-[calc(100%-48px)] tablet:h-[calc(100%-42px)]"
		v-if="route.path === '/chi-siamo'">
		<div class="w-full max-w-[760px]">
			<h1 class="content-header-kicker text-center">Chi siamo</h1>
			<p class="text-[1.375rem] desktop:text-[2.75rem] desktop-xl:text-[4.75rem] leading-[108%] tracking-[-0.552px] desktop:tracking-[-1.98px] font-medium text-[#222222] text-center mt-[10px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[320px] desktop:max-w-[620px]">
				Spedizioni chiare, veloci e senza stress
			</p>
			<a href="#chi-siamo" class="content-header-scroll-link mx-auto mt-[18px]">
				<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:rotate-90 after:align-[-1px]">Scendi</span>
			</a>
		</div>
	</div>

	<!-- Guide -->
	<div
		class="relative z-2 flex flex-col items-center justify-between h-[calc(100%-30px)] desktop:h-[calc(100%-48px)] tablet:h-[calc(100%-42px)]"
		v-if="route.path.startsWith('/guide')">
		<div class="mt-[34px] mid-desktop:mt-[18px] desktop:mt-[50px]">
			<h1 class="content-header-kicker text-center">Guide</h1>
			<p class="text-[1.375rem] desktop:text-[2.75rem] desktop-xl:text-[4.75rem] leading-[108%] tracking-[-0.552px] desktop:tracking-[-1.98px] font-medium text-[#222222] text-center mt-[10px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[320px] desktop:max-w-[620px]">
				Guide pratiche per spedire meglio
			</p>
			<a href="#guide" class="content-header-scroll-link mx-auto mt-[24px]">
				<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:rotate-90 after:align-[-1px]">Scendi</span>
			</a>
		</div>
	</div>

	<!-- FAQ -->
	<div class="relative z-2 flex flex-col items-center justify-between h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)]" v-if="route.path === '/faq'">
		<div class="mt-[34px] mid-desktop:mt-[18px] desktop:mt-[50px]">
			<h1 class="text-[var(--color-brand-accent)] text-center font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">FAQ</h1>
			<p class="text-[1.375rem] desktop:text-[2.75rem] desktop-xl:text-[4.75rem] leading-[108%] tracking-[-0.552px] desktop:tracking-[-1.98px] font-medium text-[#222222] text-center mt-[10px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[320px] desktop:max-w-[620px]">
				Risposte rapide alle domande comuni
			</p>
		</div>
	</div>

</template>
