<!--
	COMPONENTE CONTENUTO HEADER (ContenutoHeader.vue)

	Questo componente mostra il contenuto principale dell'intestazione (header),
	che cambia in base alla pagina in cui si trova l'utente.

	Per ogni pagina mostra testi e layout diversi:
	- Homepage: il titolo grande "Spedisci in Italia a partire da 8,90 euro"
	  con l'immagine del trasporto (caricata dall'admin o quella predefinita)
	- Servizi: titolo "Le nostre guide" con pulsante "Scendi"
	- Pagamento alla consegna: titolo e pulsante "Scendi"
	- Contatti: titolo "Siamo qui per aiutarti con le tue spedizioni"
	- Chi siamo: titolo "Spedire un pacco online non e' mai stato cosi' facile"
	- FAQ: titolo "Trova le tue risposte"
	- Account: titolo "Il tuo account"

	L'immagine nell'header della homepage viene caricata dal server tramite
	il composable useAdminImage() - se l'admin ha impostato un'immagine personalizzata,
	viene usata quella, altrimenti si usa l'immagine predefinita.
-->
<script setup>
const { data, status } = useAdminImage();
const route = useRoute();

// Carica fasce prezzo e promo per il prezzo minimo dinamico
const { loadPriceBands, getMinPrice, promoSettings } = usePriceBands();
onMounted(() => { loadPriceBands(); });

const minPriceInfo = computed(() => getMinPrice());
const minPriceFormatted = computed(() => {
	const p = minPriceInfo.value?.effectivePrice;
	if (!p) return '8,90';
	return p.toFixed(2).replace('.', ',');
});
const minBasePriceFormatted = computed(() => {
	const p = minPriceInfo.value?.basePrice;
	if (!p) return null;
	return p.toFixed(2).replace('.', ',');
});
const showMinPriceDiscount = computed(() => {
	return minPriceInfo.value?.hasDiscount && minPriceInfo.value?.showDiscount && promoSettings.value?.show_badges;
});

const props = defineProps({
	title: String,
	description: String,
	button: String,
	image: String,
	path: String,
});
</script>

<template>
	<!-- Homepage -->
	<div class="mt-[54px] desktop-xl:mt-[56px] relative z-2" v-if="route.path === '/'">
		<div class="text-[#222222] tablet:max-w-[770px] tablet:mx-auto desktop:mx-0">
			<h1 class="leading-none">
				<!-- Riga 1: titolo principale -->
				<span class="block text-[2.25rem] tablet:text-[3.25rem] desktop:text-[4.8125rem] desktop-xl:text-[6.25rem] font-bold tracking-[-1.5px] leading-[1.1]">
					Spedisci in Italia
				</span>
				<!-- Riga 2: "a partire da" + badge prezzo inline -->
				<span class="flex items-center flex-wrap gap-x-[14px] gap-y-[8px] mt-[8px] desktop:mt-[12px]">
					<span class="text-[1.5rem] tablet:text-[2rem] desktop:text-[3rem] desktop-xl:text-[3.5rem] font-semibold tracking-[-0.5px] text-[#444]">
						a partire da
					</span>
					<!-- Prezzo base barrato se c'e' sconto attivo -->
					<span v-if="showMinPriceDiscount" class="text-[1.25rem] desktop:text-[2rem] text-[#999] line-through font-medium">
						{{ minBasePriceFormatted }} €
					</span>
					<span
						:style="{ '--admin-image': data?.image_url ? `url(${data.image_url})` : `url(/img/homepage/trasporti-img.png)` }"
						class="admin-pill">
						{{ minPriceFormatted }} €
					</span>
				</span>
			</h1>
			<!-- Badge sconto % -->
			<div v-if="showMinPriceDiscount" class="flex items-center gap-[8px] mt-[4px] mb-[2px]">
				<span class="inline-flex items-center gap-[4px] px-[10px] py-[5px] rounded-[8px] bg-emerald-500 text-white text-[0.8125rem] tablet:text-[0.875rem] desktop:text-[1rem] font-bold">
					-{{ minPriceInfo.discountPercent }}%
				</span>
			</div>
			<!-- Banner promo -->
			<div v-if="promoSettings?.active && promoSettings?.label_text" class="flex items-center gap-[8px] mt-[6px] mb-[4px]">
				<span
					:style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
					class="inline-flex items-center gap-[6px] px-[10px] tablet:px-[12px] py-[5px] rounded-[8px] text-white text-[0.75rem] tablet:text-[0.8125rem] desktop:text-[0.9375rem] font-bold tracking-wide shadow-sm max-w-full">
					<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" class="h-[16px] tablet:h-[18px] w-auto shrink-0" />
					{{ promoSettings.label_text }}
				</span>
			</div>
			<p class="text-[1rem] tablet:text-[1.375rem] desktop:text-[2rem] desktop-xl:text-[2.5rem] tracking-[-0.4px] font-extrabold mt-[16px] desktop:mt-[20px]">IVA e ritiro incluso</p>
		</div>
	</div>

	<!-- Servizi -->
	<div v-if="route.path === '/servizi'" class="relative z-2 flex flex-col items-center justify-center desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)] h-[calc(100%-38px)]">
		<h1 class="text-[#E44203] text-center font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">I nostri servizi</h1>

		<p class="text-[2rem] desktop-xl:text-[5.5rem] leading-[120%] tracking-[-2.2112px] font-medium text-[#222222] text-center desktop:mb-[32px] mb-[24px] mt-[12px] desktop:text-[4rem]">
			Le nostre guide
		</p>

		<a
			href="#servizi"
			class="desktop:w-[146px] w-[123px] desktop:h-[60px] h-[48px] rounded-[35px] bg-[#E44203] leading-[48px] desktop:leading-[60px] font-semibold text-center text-white tracking-[-0.384px] mx-auto text-[0.875rem] desktop:text-[1rem] block">
			<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:rotate-90 after:align-[-1px]">Scendi</span>
			<!-- <NuxtImg src="/img/arrow-down.svg" aria-hidden="true" width="16" height="16" alt="" class="size-[16px] rotate-90" /> -->
		</a>
	</div>

	<!-- Servizi - pagamento alla consegna -->
	<div
		class="relative z-2 flex flex-col items-center justify-between h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)] after:content-[''] desktop-xl:after:w-[1280px] after:w-full after:h-[130px] mid-desktop:after:h-[220px] desktop:after:w-full desktop:after:h-[200px] desktop-xl:after:h-[320px] after:bg-green-500 desktop:after:rounded-t-[48px] after:rounded-t-[24px] tablet:after:h-[200px]"
		v-if="route.path.includes('pagamento-alla-consegna')">
		<div class="mt-[49px] mid-desktop:mt-[20px] desktop:mt-[50px] desktop-xl:mt-[73px] w-full">
			<p class="text-[#E44203] text-left font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">Dettagli servizio</p>

			<h1
				class="text-[1.5rem] desktop:text-[3rem] desktop-xl:text-[5.5rem] leading-[110%] tracking-[-0.576px] desktop:tracking-[-2.2112px] font-medium text-[#222222] text-left mt-[12px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[200px] desktop:max-w-full">
				Pagamento alla consegna
			</h1>

			<a
				href="#pagamento-alla-consegna"
				class="desktop:w-[146px] w-[123px] desktop:h-[60px] h-[48px] rounded-[35px] bg-[#E44203] leading-[48px] desktop:leading-[60px] font-semibold text-center text-white tracking-[-0.384px] text-[0.875rem] desktop:text-[1rem] block mt-[15px] desktop-xl:mt-[30px]">
				<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:rotate-90 after:align-[-1px]">Scendi</span>
			</a>
		</div>
	</div>

	<!-- Contatti -->
	<div
		class="relative z-2 flex flex-col items-center justify-between h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)] after:content-[''] desktop-xl:after:w-[1280px] after:w-full after:h-[175px] mid-desktop:after:h-[220px] desktop:after:w-full desktop:after:h-[300px] desktop-xl:after:h-[290px] after:bg-green-500 desktop:after:rounded-t-[33px] after:rounded-t-[20px]"
		v-if="route.path === '/contatti'">
		<div class="mt-[49px] mid-desktop:mt-[20px] desktop:mt-[86px]">
			<h1 class="text-[#E44203] text-center font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">Contattaci</h1>

			<p
				class="text-[2rem] desktop-xl:text-[5.5rem] leading-[110%] tracking-[-2.2112px] font-medium text-[#222222] text-center mt-[12px] desktop:text-[4rem] max-w-[276px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] desktop:max-w-[726px]">
				Siamo qui per aiutarti con le tue spedizioni.
			</p>
		</div>

		<!-- <div class="desktop-xl:w-[1280px] w-full h-[175px] mid-desktop:h-[220px] desktop:w-full desktop:h-[300px] desktop-xl:h-[290px] bg-green-500 rounded-t-[33px]"></div> -->
	</div>

	<!-- Chi siamo -->
	<div
		class="relative z-2 flex flex-col items-center justify-between h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)] after:content-[''] desktop-xl:after:w-[1280px] after:w-full after:h-[165px] mid-desktop:after:h-[220px] desktop:after:w-full desktop:after:h-[300px] desktop-xl:after:h-[370px] after:bg-green-500 desktop:after:rounded-t-[33px] after:rounded-t-[20px] tablet:after:h-[200px]"
		v-if="route.path === '/chi-siamo'">
		<div class="mt-[49px] mid-desktop:mt-[20px] desktop:mt-[73px]">
			<h1 class="text-[#E44203] text-center font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">Chi siamo</h1>

			<p
				class="text-[1.5rem] desktop:text-[3rem] desktop-xl:text-[5.5rem] leading-[110%] tracking-[-0.576px] desktop:tracking-[-2.2112px] font-medium text-[#222222] text-center mt-[12px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[336px] desktop:max-w-[620px]">
				Spedire un pacco online non è mai stato così facile
			</p>

			<a
				href="#chi-siamo"
				class="desktop:w-[146px] w-[123px] desktop:h-[60px] h-[48px] rounded-[35px] bg-[#E44203] leading-[48px] desktop:leading-[60px] font-semibold text-center text-white tracking-[-0.384px] mx-auto text-[0.875rem] desktop:text-[1rem] block mt-[24px]">
				<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:rotate-90 after:align-[-1px]">Scendi</span>
			</a>
		</div>

		<!-- <div class="desktop-xl:w-[1280px] w-full h-[175px] mid-desktop:h-[220px] desktop:w-full desktop:h-[300px] desktop-xl:h-[360px] bg-green-500 rounded-t-[33px]"></div> -->
	</div>

	<!-- Guide -->
	<div
		class="relative z-2 flex flex-col items-center justify-between h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)]"
		v-if="route.path.startsWith('/guide')">
		<div class="mt-[49px] mid-desktop:mt-[20px] desktop:mt-[73px]">
			<h1 class="text-[#E44203] text-center font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">Guide</h1>

			<p
				class="text-[1.5rem] desktop:text-[3rem] desktop-xl:text-[5.5rem] leading-[110%] tracking-[-0.576px] desktop:tracking-[-2.2112px] font-medium text-[#222222] text-center mt-[12px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[336px] desktop:max-w-[620px]">
				Le nostre guide per spedire al meglio
			</p>

			<a
				href="#guide"
				class="desktop:w-[146px] w-[123px] desktop:h-[60px] h-[48px] rounded-[35px] bg-[#E44203] leading-[48px] desktop:leading-[60px] font-semibold text-center text-white tracking-[-0.384px] mx-auto text-[0.875rem] desktop:text-[1rem] block mt-[24px]">
				<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:inline-block after:size-[16px] after:ml-[11px] after:rotate-90 after:align-[-1px]">Scendi</span>
			</a>
		</div>
	</div>

	<!-- FAQ -->
	<div class="relative z-2 flex flex-col items-center justify-between h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)]" v-if="route.path === '/faq'">
		<div class="mt-[49px] mid-desktop:mt-[20px] desktop:mt-[73px]">
			<h1 class="text-[#E44203] text-center font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">FAQ</h1>

			<p
				class="text-[1.5rem] desktop:text-[3rem] desktop-xl:text-[5.5rem] leading-[110%] tracking-[-0.576px] desktop:tracking-[-2.2112px] font-medium text-[#222222] text-center mt-[12px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[336px] desktop:max-w-[620px]">
				Trova le tue risposte
			</p>
		</div>

		<!-- <div class="desktop-xl:w-[1280px] w-full h-[175px] mid-desktop:h-[220px] desktop:w-full desktop:h-[300px] desktop-xl:h-[360px] bg-green-500 rounded-t-[33px]"></div> -->
	</div>

	<!-- Account -->
	<div class="relative z-2 flex flex-col items-center justify-end h-[calc(100%-38px)] desktop:h-[calc(100%-65px)] tablet:h-[calc(100%-50px)]" v-if="route.path === '/account'">
		<h1
			class="text-[2rem] desktop:text-[3rem] desktop-xl:text-[4rem] leading-[110%] tracking-[-1.536px] desktop:tracking-[-2.2112px] font-medium text-[#222222] text-center mb-[36px] desktop:mb-[67px] desktop-xl:mb-[69px]">
			Il tuo account
		</h1>
	</div>
</template>

<style scoped>
/* Mobile base — pill inline nella riga flex */
.admin-pill {
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	font-weight: 800;
	color: #fff;
	background: #e44203;
	flex-shrink: 0;

	width: 130px;
	height: 52px;
	font-size: 1.75rem;
	letter-spacing: -1px;
	border-radius: 60px;
}

.admin-pill::after {
	content: "";
	position: absolute;
	background-image: var(--admin-image);
	background-repeat: no-repeat;
	background-position: right center;
	background-size: cover;

	width: min(300px, calc(100vw - 80px));
	height: 190px;
	border-radius: 16px 16px 0 0;
	left: 110px;
	top: -10px;
	z-index: 20;
}

/* Tablet */
@media (min-width: 45rem) {
	.admin-pill {
		width: 160px;
		height: 64px;
		font-size: 2.25rem;
		border-radius: 80px;
	}

	.admin-pill::after {
		width: 480px;
		height: 280px;
		border-radius: 20px 20px 0 0;
		left: 140px;
		top: -30px;
	}
}

/* Desktop */
@media (min-width: 64rem) {
	.admin-pill {
		width: 354px;
		height: 121px;
		font-size: 5rem;
	}

	.admin-pill::after {
		width: 790px;
		height: 490px;
		left: 300px;
		top: -90px;
		border-radius: 48px 48px 0 0;
	}
}

/* Desktop XL */
@media (min-width: 90rem) {
	.admin-pill {
		width: 458px;
		height: 155px;
		font-size: 6.875rem;
		border-radius: 110px;
	}

	.admin-pill::after {
		width: 796px;
		height: 426px;
		left: 400px;
		top: -50px;
		border-radius: 50px 50px 0 0;
	}
}
</style>
