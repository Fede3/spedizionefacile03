<!--
	COMPONENTE: ContenutoHeader (ContenutoHeader.vue)
	SCOPO: Mostra il contenuto dell'intestazione (hero) che cambia in base alla pagina corrente.

	DOVE SI USA: components/Header.vue (unico padre)
	PROPS: title, description, button, image, path (tutti opzionali, usati per pagine generiche)
	EMITS: nessuno

	DATI IN INGRESSO: useAdminImage() (immagine hero personalizzata dall'admin),
	                  usePriceBands() (prezzo minimo per il badge hero),
	                  route.path (per decidere quale sezione mostrare)
	DATI IN USCITA: nessuno (solo visualizzazione)

	VINCOLI: il prezzo minimo nel hero DEVE corrispondere alla prima fascia peso
	PUNTI DI MODIFICA SICURI: testi, stili CSS, struttura HTML delle singole sezioni
	COLLEGAMENTI: composables/usePriceBands.js, composables/UseAdminImage.js

	SEZIONI: Homepage (hero con prezzo), Servizi, Contatti, Chi siamo,
	         Pagamento alla consegna, Guide, FAQ, Account
-->
<script setup>
const { data } = useAdminImage();
const route = useRoute();

// Ottimizzazione: precarica l'immagine hero di default per evitare ritardo nel rendering above-the-fold.
// Se l'admin ha impostato un'immagine personalizzata, quella verra' caricata dinamicamente.
useHead({
	link: [
		{
			rel: 'preload',
			as: 'image',
			href: '/img/homepage/trasporti-img.png',
			fetchpriority: 'high',
		},
	],
});

// Carica fasce prezzo solo sulla homepage (dove il prezzo minimo viene mostrato nel hero).
// Su altre pagine che usano i prezzi (Preventivo.vue), loadPriceBands viene chiamato li'.
const { loadPriceBands, getMinPrice, promoSettings } = usePriceBands();
onMounted(() => {
	if (route.path === '/' || route.path === '/preventivo') {
		loadPriceBands();
	}
});

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
	<!-- ============================================================
	     HOMEPAGE HERO
	     ============================================================ -->
	<div class="hero" v-if="route.path === '/'">
		<!-- Decorazione teal dietro la card -->
		<div class="hero__teal-accent anim-accent"></div>

		<div class="hero__layout">
			<!-- Colonna sinistra: testo + card prezzo -->
			<div class="hero__content">
				<h1 class="hero__heading anim-title">
					Spedisci<br class="desktop:hidden" /> in Italia
				</h1>

				<!-- Card prezzo bianca in risalto -->
				<div class="hero__card anim-pill">
					<div class="hero__card-accent"></div>
					<div class="hero__card-body">
						<span class="hero__card-label">a partire da</span>
						<div class="hero__card-price-row">
							<span v-if="showMinPriceDiscount" class="hero__price-old">{{ minBasePriceFormatted }}€</span>
							<span class="hero__card-price">{{ minPriceFormatted }}<span class="hero__card-eur">€</span></span>
						</div>
						<span class="hero__card-includes">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="shrink-0"><circle cx="12" cy="12" r="12" fill="rgba(255,255,255,0.3)"/><path d="M7 12.5l3 3 7-7" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							IVA e ritiro incluso
						</span>
					</div>
				</div>

				<!-- Promo badges -->
				<div v-if="showMinPriceDiscount" class="mt-[10px] anim-tagline">
					<span class="inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-[8px] bg-emerald-500 text-white text-[0.8125rem] font-bold">
						-{{ minPriceInfo.discountPercent }}%
					</span>
				</div>
				<div v-if="promoSettings?.active && promoSettings?.label_text" class="mt-[8px] anim-tagline">
					<span
						:style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
						class="inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-[8px] text-white text-[0.75rem] font-bold tracking-wide shadow-sm">
						<!-- Ottimizzazione: immagine promo above-the-fold, decoding async -->
						<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" decoding="async" width="40" height="16" class="h-[16px] w-auto shrink-0" />
						{{ promoSettings.label_text }}
					</span>
				</div>
				<p v-if="promoSettings?.active && promoSettings?.description" class="text-[0.8125rem] text-[#555] font-medium mt-[6px] anim-tagline">
					{{ promoSettings.description }}
				</p>
			</div>

			<!-- Colonna destra: immagine -->
			<div class="hero__image anim-image">
				<div
					class="hero__image-bg"
					:style="{ backgroundImage: data?.image_url ? `url(${data.image_url})` : `url(/img/homepage/trasporti-img.png)` }">
				</div>
			</div>
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
/* ============================================================
   HERO — "Floating Card" design
   Mobile-first, card prezzo prominente, accento teal
   ============================================================ */
.hero {
	position: relative;
	z-index: 2;
	padding-top: 20px;
	overflow: hidden;
	padding-bottom: 80px;
	margin-bottom: -80px;
}

.hero__layout {
	position: relative;
}

.hero__content {
	position: relative;
	z-index: 5;
}

/* --- Accento teal decorativo --- */
.hero__teal-accent {
	position: absolute;
	right: -20px;
	top: 35px;
	width: 200px;
	height: 220px;
	background: linear-gradient(135deg, #095866 0%, #0b6d7d 100%);
	border-radius: 24px 0 0 24px;
	z-index: 1;
	transform: rotate(6deg);
	opacity: 0.15;
}

/* --- Titolo --- */
.hero__heading {
	font-size: 2.25rem;
	font-weight: 800;
	color: #1a1a1a;
	line-height: 1.05;
	letter-spacing: -1.2px;
	margin: 0;
}

/* --- Card prezzo --- */
.hero__card {
	display: flex;
	margin-top: 12px;
	background: linear-gradient(135deg, #E44203 0%, #095866 100%);
	border-radius: 16px;
	overflow: hidden;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	max-width: 200px;
}

.hero__card-accent {
	display: none;
}

.hero__card-body {
	padding: 14px 18px;
	display: flex;
	flex-direction: column;
}

.hero__card-label {
	font-size: 0.8125rem;
	font-weight: 500;
	color: rgba(255, 255, 255, 0.75);
	text-transform: uppercase;
	letter-spacing: 0.8px;
}

.hero__card-price-row {
	display: flex;
	align-items: baseline;
	gap: 8px;
	margin-top: 2px;
}

.hero__price-old {
	font-size: 0.9375rem;
	color: rgba(255, 255, 255, 0.5);
	text-decoration: line-through;
	font-weight: 500;
}

.hero__card-price {
	font-size: 3rem;
	font-weight: 800;
	color: #fff;
	line-height: 1;
	letter-spacing: -2px;
}

.hero__card-eur {
	font-size: 1.5rem;
	font-weight: 700;
	vertical-align: super;
	margin-left: 1px;
	letter-spacing: 0;
	color: #fff;
}

.hero__card-includes {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	font-size: 0.75rem;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.9);
	margin-top: 6px;
}

/* --- Immagine --- */
.hero__image {
	position: absolute;
	right: -85px;
	top: 45px;
	z-index: 2;
	width: 80vw;
	max-width: calc(100vw - 10px);
	height: 600px;
	opacity: 0.18;
}

.hero__image-bg {
	width: 100%;
	height: 100%;
	background-size: contain;
	background-position: center top;
	background-repeat: no-repeat;
	border-radius: 20px 0 0 0;
}

/* ============================================================
   ANIMAZIONI
   ============================================================ */
@media (prefers-reduced-motion: no-preference) {
	@keyframes fadeSlideUp {
		from { opacity: 0; transform: translateY(18px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes slideIn {
		from { opacity: 0; transform: translateX(20px) scale(0.96); }
		to { opacity: 1; transform: translateX(0) scale(1); }
	}

	@keyframes accentIn {
		from { opacity: 0; transform: rotate(6deg) scale(0.7); }
		to { opacity: 0.15; transform: rotate(6deg) scale(1); }
	}

	.anim-title {
		animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.anim-pill {
		animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
	}

	.anim-image {
		animation: slideIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
	}

	.anim-accent {
		animation: accentIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
	}

	.anim-tagline {
		animation: fadeIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both;
	}
}

/* ============================================================
   TABLET (720px+)
   ============================================================ */
@media (min-width: 45rem) {
	.hero {
		padding-top: 30px;
	}

	.hero__teal-accent {
		width: 200px;
		height: 200px;
		right: 20px;
		top: 20px;
		border-radius: 32px;
		opacity: 0.12;
	}

	.hero__heading {
		font-size: 3.25rem;
		letter-spacing: -1.5px;
	}

	.hero__card {
		max-width: 320px;
		margin-top: 22px;
		border-radius: 20px;
	}

	.hero__card-accent {
		width: 6px;
	}

	.hero__card-body {
		padding: 18px 24px;
	}

	.hero__card-label {
		font-size: 0.875rem;
	}

	.hero__card-price {
		font-size: 4rem;
		letter-spacing: -2.5px;
	}

	.hero__card-eur {
		font-size: 1.75rem;
	}

	.hero__card-includes {
		font-size: 0.8125rem;
		gap: 6px;
	}

	.hero__image {
		width: 480px;
		height: 440px;
		right: -40px;
		bottom: -60px;
		top: auto;
		opacity: 0.2;
	}

	.hero__image-bg {
		border-radius: 28px;
	}
}

/* ============================================================
   DESKTOP (1024px+)
   ============================================================ */
@media (min-width: 64rem) {
	.hero {
		padding-top: 0px;
		margin-top: -60px;
	}

	.hero__layout {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0px;
	}

	.hero__content {
		flex: 0 0 50%;
		margin-top: -15px;
	}

	.hero__teal-accent {
		width: 340px;
		height: 320px;
		right: 5%;
		top: 115px;
		border-radius: 40px;
		transform: rotate(8deg);
		opacity: 0.08;
		width: 480px;
		height: 450px;
	}

	.hero__heading {
		font-size: 4.5rem;
		letter-spacing: -2.5px;
	}

	.hero__card {
		max-width: 380px;
		margin-top: 28px;
		border-radius: 22px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.04);
	}

	.hero__card-accent {
		width: 7px;
	}

	.hero__card-body {
		padding: 22px 28px;
	}

	.hero__card-label {
		font-size: 1rem;
		letter-spacing: 1px;
	}

	.hero__card-price {
		font-size: 5rem;
		letter-spacing: -3px;
	}

	.hero__card-eur {
		font-size: 2.25rem;
	}

	.hero__card-includes {
		font-size: 0.9375rem;
		gap: 8px;
		margin-top: 8px;
	}

	/* Immagine — colonna propria, si avvicina al testo da sinistra */
	.hero__image {
		position: relative;
		right: auto;
		top: 140px;
		bottom: auto;
		flex: 0 0 58%;
		width: auto;
		height: 600px;
		opacity: 1;
		margin-left: -480px;
	}

	.hero__image-bg {
		border-radius: 28px;
		box-shadow: 0 12px 40px rgba(9, 88, 102, 0.15);
	}

	@keyframes accentIn {
		from { opacity: 0; transform: rotate(8deg) scale(0.7); }
		to { opacity: 0.08; transform: rotate(8deg) scale(1); }
	}
}

/* ============================================================
   DESKTOP XL (1440px+)
   ============================================================ */
@media (min-width: 90rem) {
	.hero {
		padding-top: 0px;
		margin-top: -70px;
	}

	.hero__teal-accent {
		width: 580px;
		height: 540px;
		right: 8%;
		top: 125px;
		border-radius: 48px;
	}

	.hero__heading {
		font-size: 5.5rem;
		letter-spacing: -3px;
	}

	.hero__card {
		max-width: 420px;
		margin-top: 32px;
		border-radius: 24px;
	}

	.hero__card-body {
		padding: 26px 32px;
	}

	.hero__card-label {
		font-size: 1.0625rem;
	}

	.hero__card-price {
		font-size: 6rem;
		letter-spacing: -3.5px;
	}

	.hero__card-eur {
		font-size: 2.75rem;
	}

	.hero__card-includes {
		font-size: 1rem;
		margin-top: 10px;
	}

	.hero__image {
		height: 700px;
		margin-left: -540px;
		top: 150px;
	}

	.hero__image-bg {
		border-radius: 36px;
	}
}
</style>
