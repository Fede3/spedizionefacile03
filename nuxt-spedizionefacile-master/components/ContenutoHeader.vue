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
const route = useRoute();
const DEFAULT_HOMEPAGE_HERO = '/img/homepage/hero-truck-landscape.jpg';
const PREVIEW_DRAFT_STORAGE_KEY = 'hero-preview-live-draft';
const createViewportDefaults = () => ({
	mode: 'fill',
	zoom: 1,
	x: 0,
	y: 0,
});
const heroConfig = ref({
	image_url: DEFAULT_HOMEPAGE_HERO,
	desktop: createViewportDefaults(),
	mobile: createViewportDefaults(),
	updated_at: null,
});
const isPreviewHeroRoute = computed(() => route.path === '/preview/home-hero');
const isHomepageHeroRoute = computed(() => route.path === '/' || isPreviewHeroRoute.value);
const isDesktopViewport = ref(true);
let homepageHeroPoll = null;
let previewDraftPoll = null;
let previewDraftLastTs = null;

const clamp = (value, min, max) => {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return min;
	return Math.min(max, Math.max(min, numeric));
};

const normalizeViewport = (viewport, fallback = createViewportDefaults()) => {
	const allowedModes = ['fill', 'fit', 'crop'];
	const mode = allowedModes.includes(viewport?.mode) ? viewport.mode : fallback.mode;
	const minZoom = 0.5;
	return {
		mode,
		zoom: clamp(viewport?.zoom ?? fallback.zoom ?? 1, minZoom, 4),
		x: clamp(viewport?.x ?? fallback.x ?? 0, -1200, 1200),
		y: clamp(viewport?.y ?? fallback.y ?? 0, -1200, 1200),
	};
};

const normalizeHeroConfig = (payload) => {
	const source = payload?.config && typeof payload.config === 'object' ? payload.config : payload;
	const imageUrl = typeof source?.image_url === 'string' && source.image_url.trim().length > 0
		? source.image_url
		: DEFAULT_HOMEPAGE_HERO;

	return {
		image_url: imageUrl,
		desktop: normalizeViewport(source?.desktop, createViewportDefaults()),
		mobile: normalizeViewport(source?.mobile, createViewportDefaults()),
		updated_at: source?.updated_at || null,
	};
};

// Preload hero solo nelle route che usano realmente l'immagine,
// per evitare warning su pagine come autenticazione.
useHead(() => (
	isHomepageHeroRoute.value
		? {
				link: [
					{
						rel: 'preload',
						as: 'image',
						href: '/img/homepage/hero-truck-landscape.jpg',
						fetchpriority: 'high',
					},
				],
			}
		: {}
));

// Carica fasce prezzo sempre per garantire disponibilità su tutte le pagine
const { loadPriceBands, getMinPrice, promoSettings } = usePriceBands();

const applyHomepageImage = async () => {
	try {
		const res = await $fetch('/api/public/homepage-image', { method: 'GET' });
		heroConfig.value = normalizeHeroConfig(res);
	} catch {
		heroConfig.value = normalizeHeroConfig({
			image_url: DEFAULT_HOMEPAGE_HERO,
			desktop: createViewportDefaults(),
			mobile: createViewportDefaults(),
		});
	}
};

const refreshHomepageImage = () => {
	if (!isHomepageHeroRoute.value) return;
	void applyHomepageImage();
};

const onHomepageImageStorage = (event) => {
	if (event.key === 'homepage-image-updated-at') {
		refreshHomepageImage();
	}
};

const onHomepageImageEvent = () => {
	refreshHomepageImage();
};

const onVisibilityChange = () => {
	if (document.visibilityState === 'visible') {
		refreshHomepageImage();
	}
};

const getForcedPreviewViewport = () => {
	if (!isPreviewHeroRoute.value) return null;
	const requested = typeof route.query.viewport === 'string' ? route.query.viewport.toLowerCase() : '';
	if (requested === 'desktop') return true;
	if (requested === 'mobile') return false;
	return null;
};

const updateViewportFlag = () => {
	if (typeof window === 'undefined') return;
	const forcedViewport = getForcedPreviewViewport();
	if (forcedViewport !== null) {
		isDesktopViewport.value = forcedViewport;
		return;
	}
	isDesktopViewport.value = window.innerWidth >= 1024;
};

const onHeroPreviewMessage = (event) => {
	if (!isPreviewHeroRoute.value) return;
	if (event.origin !== window.location.origin) return;
	if (!event.data || event.data.type !== 'hero-preview:update') return;
	heroConfig.value = normalizeHeroConfig(event.data.payload || {});
};

const applyHeroPreviewPayload = (payload) => {
	if (!isPreviewHeroRoute.value) return;
	heroConfig.value = normalizeHeroConfig(payload || {});
};

const applyPreviewDraftFromStorage = () => {
	if (typeof window === 'undefined' || !isPreviewHeroRoute.value) return;
	try {
		const raw = window.localStorage.getItem(PREVIEW_DRAFT_STORAGE_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return;
		if (!parsed.ts || parsed.ts === previewDraftLastTs) return;
		previewDraftLastTs = parsed.ts;
		applyHeroPreviewPayload(parsed.payload || {});
	} catch {
		// Ignore malformed localStorage data.
	}
};

const onPreviewDraftStorageEvent = (event) => {
	if (!isPreviewHeroRoute.value) return;
	if (event.key !== PREVIEW_DRAFT_STORAGE_KEY) return;
	applyPreviewDraftFromStorage();
};

const notifyHeroPreviewReady = () => {
	if (typeof window === 'undefined' || !isPreviewHeroRoute.value) return;
	const viewport = getForcedPreviewViewport() === false ? 'mobile' : 'desktop';
	window.parent?.postMessage(
		{
			type: 'hero-preview:ready',
			viewport,
		},
		window.location.origin
	);
};

onMounted(() => {
	loadPriceBands();
	updateViewportFlag();
	if (!isPreviewHeroRoute.value) {
		refreshHomepageImage();
	}

	window.addEventListener('resize', updateViewportFlag);

	if (route.path === '/') {
		// Near real-time: refresh periodico leggero per recepire update admin anche su tab aperta.
		homepageHeroPoll = setInterval(refreshHomepageImage, 30000);
		window.addEventListener('focus', refreshHomepageImage);
		window.addEventListener('storage', onHomepageImageStorage);
		window.addEventListener('homepage-image-updated', onHomepageImageEvent);
		document.addEventListener('visibilitychange', onVisibilityChange);
	}

	if (isPreviewHeroRoute.value) {
		window.__applyHeroPreviewPayload = applyHeroPreviewPayload;
		window.addEventListener('message', onHeroPreviewMessage);
		window.addEventListener('storage', onPreviewDraftStorageEvent);
		previewDraftPoll = setInterval(applyPreviewDraftFromStorage, 120);
		applyPreviewDraftFromStorage();
		notifyHeroPreviewReady();
	}
});

onBeforeUnmount(() => {
	if (homepageHeroPoll) {
		clearInterval(homepageHeroPoll);
		homepageHeroPoll = null;
	}
	window.removeEventListener('focus', refreshHomepageImage);
	window.removeEventListener('storage', onHomepageImageStorage);
	window.removeEventListener('homepage-image-updated', onHomepageImageEvent);
	document.removeEventListener('visibilitychange', onVisibilityChange);
	window.removeEventListener('resize', updateViewportFlag);
	window.removeEventListener('message', onHeroPreviewMessage);
	window.removeEventListener('storage', onPreviewDraftStorageEvent);
	if (previewDraftPoll) {
		clearInterval(previewDraftPoll);
		previewDraftPoll = null;
	}
	if (typeof window !== 'undefined' && window.__applyHeroPreviewPayload) {
		delete window.__applyHeroPreviewPayload;
	}
});

const heroImageUrl = computed(() => heroConfig.value.image_url || DEFAULT_HOMEPAGE_HERO);
const activeViewportConfig = computed(() => (
	isDesktopViewport.value ? heroConfig.value.desktop : heroConfig.value.mobile
));
const heroImageStyle = computed(() => {
	const transform = activeViewportConfig.value || createViewportDefaults();
	const objectFit = transform.mode === 'fit' ? 'contain' : 'cover';
	const isMobileViewport = !isDesktopViewport.value;
	const offsetLimit = isMobileViewport ? 260 : 1200;
	const maxZoom = isMobileViewport ? 2.4 : 4;
	const offsetX = Math.round(clamp(transform.x, -offsetLimit, offsetLimit));
	const offsetY = Math.round(clamp(transform.y, -offsetLimit, offsetLimit));
	const zoom = clamp(transform.zoom, 0.5, maxZoom);

	return {
		position: 'absolute',
		top: '50%',
		left: '50%',
		width: '100%',
		height: '100%',
		objectFit,
		objectPosition: '50% 50%',
		transform: `translate(-50%, -50%) translate3d(${offsetX}px, ${offsetY}px, 0) scale(${zoom})`,
		transformOrigin: 'center center',
		willChange: 'transform',
		transition: 'transform 90ms linear',
	};
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
	<div class="relative z-[2] overflow-hidden pt-[20px] pb-[48px] tablet:pt-[32px] tablet:pb-[60px] desktop:pt-[64px] desktop:pb-[40px] desktop-xl:pt-[68px] desktop-xl:pb-[48px]" v-if="isHomepageHeroRoute">
		<!-- Decorazione teal dietro la card -->
		<div
			class="pointer-events-none absolute right-[8px] top-[128px] h-[108px] w-[94px] rotate-[6deg] rounded-[12px] bg-gradient-to-br from-[#095866] to-[#0b6d7d] opacity-[0.05] tablet:right-[24px] tablet:top-[104px] tablet:h-[200px] tablet:w-[200px] tablet:opacity-[0.05] desktop:right-[2%] desktop:top-[48px] desktop:h-[140px] desktop:w-[620px] desktop:rotate-[5deg] desktop:opacity-[0.06] desktop-xl:right-[3%] desktop-xl:top-[48px] desktop-xl:h-[150px] desktop-xl:w-[700px]"></div>

		<div class="relative grid grid-cols-[54%_46%] items-start gap-x-[10px] gap-y-[4px] tablet:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] tablet:gap-x-[10px] tablet:gap-y-[6px] desktop:grid-cols-[minmax(0,420px)_minmax(0,1fr)] desktop:items-start desktop:gap-[24px] desktop-xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] desktop-xl:gap-[28px]">
			<!-- Colonna sinistra: testo + card prezzo -->
			<div class="relative z-[5] col-start-1 row-start-1 tablet:col-start-1 tablet:row-start-1 desktop:max-w-[560px] desktop:mt-[12px] desktop-xl:mt-[14px]">
				<h1 class="max-w-[160px] text-[#1a1a1a] text-[2.25rem] leading-[0.95] tracking-[-1px] font-extrabold tablet:max-w-none tablet:text-[3.25rem] desktop:text-[4.75rem] desktop:tracking-[-2.5px] desktop-xl:text-[5.5rem] desktop-xl:tracking-[-3px]">
					<span class="block">Spedisci</span>
					<span class="block">in Italia</span>
				</h1>

				<!-- Card prezzo bianca in risalto -->
				<div
					class="relative z-[7] mt-[8px] flex w-[140px] overflow-hidden rounded-[14px] bg-gradient-to-br from-[#E44203] to-[#095866] shadow-[0_4px_12px_rgba(0,0,0,0.15)] tablet:mt-[16px] tablet:w-[320px] tablet:rounded-[16px] desktop:mt-[36px] desktop:w-[380px] desktop:shadow-[0_8px_24px_rgba(0,0,0,0.15)] desktop-xl:mt-[36px] desktop-xl:w-[400px]">
					<div class="flex flex-col px-[10px] py-[8px] tablet:px-[24px] tablet:py-[20px] desktop:px-[30px] desktop:py-[22px] desktop-xl:px-[36px] desktop-xl:py-[26px]">
						<span class="text-[0.8125rem] font-medium uppercase tracking-[0.8px] text-white/75 tablet:text-[0.875rem] desktop:text-[1rem] desktop:tracking-[1px] desktop-xl:text-[1.0625rem]">a partire da</span>
						<div class="mt-[2px] flex items-baseline gap-[8px]">
							<span v-if="showMinPriceDiscount" class="text-[0.9375rem] font-medium text-white/50 line-through">{{ minBasePriceFormatted }}€</span>
							<span class="text-[2.7rem] font-extrabold leading-[1] tracking-[-1.8px] text-white tablet:text-[4rem] tablet:tracking-[-2.5px] desktop:text-[4.25rem] desktop:tracking-[-2.5px] desktop-xl:text-[5rem] desktop-xl:tracking-[-3px]">{{ minPriceFormatted }}<span class="ml-[1px] align-super text-[1.1rem] font-bold tracking-[0] text-white tablet:text-[1.75rem] desktop:text-[2.25rem] desktop-xl:text-[2.75rem]">€</span></span>
						</div>
						<span class="mt-[4px] inline-flex items-center gap-[4px] text-[0.58rem] font-semibold text-white/90 tablet:text-[0.8125rem] desktop:mt-[8px] desktop:text-[0.9375rem] desktop-xl:mt-[10px] desktop-xl:text-[1rem]">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="shrink-0"><circle cx="12" cy="12" r="12" fill="rgba(255,255,255,0.3)"/><path d="M7 12.5l3 3 7-7" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							IVA e ritiro incluso
						</span>
					</div>
				</div>

				<!-- Promo badges -->
				<div v-if="showMinPriceDiscount" class="mt-[10px]">
					<span class="inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-[8px] bg-emerald-500 text-white text-[0.8125rem] font-bold">
						-{{ minPriceInfo.discountPercent }}%
					</span>
				</div>
				<div v-if="promoSettings?.active && promoSettings?.label_text" class="mt-[8px]">
					<span
						:style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
						class="inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-[8px] text-white text-[0.75rem] font-bold tracking-wide shadow-sm">
						<!-- Ottimizzazione: immagine promo above-the-fold, decoding async -->
						<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" decoding="async" width="40" height="16" class="h-[16px] w-auto shrink-0" />
						{{ promoSettings.label_text }}
					</span>
				</div>
				<p v-if="promoSettings?.active && promoSettings?.description" class="text-[0.8125rem] text-[#555] font-medium mt-[6px]">
					{{ promoSettings.description }}
				</p>
			</div>

			<!-- Colonna destra: immagine -->
			<div class="relative z-[2] col-start-2 row-start-1 row-span-2 mt-[10px] h-[194px] w-full max-w-none rounded-[12px] tablet:col-start-2 tablet:row-start-1 tablet:row-span-1 tablet:mt-[20px] tablet:h-[390px] tablet:max-w-[520px] tablet:mx-auto desktop:mt-0 desktop:h-[320px] desktop:w-full desktop:max-w-[760px] desktop:justify-self-end desktop-xl:h-[340px] desktop-xl:max-w-[820px]">
				<div class="relative h-full w-full overflow-hidden rounded-[16px] border border-[#DDE5EB] bg-[#EAF1F6] shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
					<img
						:src="heroImageUrl"
						alt="Hero SpediamoFacile"
						class="h-full w-full select-none pointer-events-none"
						:style="heroImageStyle"
						loading="eager"
						decoding="async" />
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
			class="desktop:w-[146px] w-[123px] desktop:h-[60px] h-[48px] rounded-[50px] bg-[#E44203] leading-[48px] desktop:leading-[60px] font-semibold text-center text-white tracking-[-0.384px] mx-auto text-[0.875rem] desktop:text-[1rem] block">
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
				class="desktop:w-[146px] w-[123px] desktop:h-[60px] h-[48px] rounded-[50px] bg-[#E44203] leading-[48px] desktop:leading-[60px] font-semibold text-center text-white tracking-[-0.384px] text-[0.875rem] desktop:text-[1rem] block mt-[15px] desktop-xl:mt-[30px]">
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
				class="desktop:w-[146px] w-[123px] desktop:h-[60px] h-[48px] rounded-[50px] bg-[#E44203] leading-[48px] desktop:leading-[60px] font-semibold text-center text-white tracking-[-0.384px] mx-auto text-[0.875rem] desktop:text-[1rem] block mt-[24px]">
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
				class="desktop:w-[146px] w-[123px] desktop:h-[60px] h-[48px] rounded-[50px] bg-[#E44203] leading-[48px] desktop:leading-[60px] font-semibold text-center text-white tracking-[-0.384px] mx-auto text-[0.875rem] desktop:text-[1rem] block mt-[24px]">
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
	padding-top: 28px;
	overflow: hidden;
	padding-bottom: 72px;
	margin-bottom: 0;
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
	right: -12px;
	top: 102px;
	width: 188px;
	height: 204px;
	background: linear-gradient(135deg, #095866 0%, #0b6d7d 100%);
	border-radius: 16px;
	z-index: 1;
	transform: rotate(6deg);
	opacity: 0.05;
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
	padding: 16px 20px;
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
	gap: 8px;
	font-size: 0.75rem;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.9);
	margin-top: 8px;
}

/* --- Immagine --- */
.hero__image {
	position: absolute;
	right: -28px;
	top: 136px;
	z-index: 2;
	width: 78vw;
	max-width: 420px;
	height: 340px;
	opacity: 0;
	display: none;
}

.hero__image-bg {
	width: 100%;
	height: 100%;
	border-radius: 16px;
	overflow: hidden;
	background-size: cover;
	background-position: center 48%;
	background-repeat: no-repeat;
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
		padding-top: 40px;
		padding-bottom: 96px;
	}

	.hero__teal-accent {
		width: 200px;
		height: 200px;
		right: 24px;
		top: 104px;
		border-radius: 16px;
		opacity: 0.05;
	}

	.hero__heading {
		font-size: 3.25rem;
		letter-spacing: -1.5px;
	}

	.hero__card {
		max-width: 320px;
		margin-top: 16px;
		border-radius: 16px;
	}

	.hero__card-accent {
		width: 6px;
	}

	.hero__card-body {
		padding: 20px 24px;
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
		gap: 8px;
	}

	.hero__image {
		display: block;
		width: 520px;
		height: 390px;
		right: 0;
		top: 148px;
		bottom: auto;
		opacity: 0.28;
	}

	.hero__image-bg {
		border-radius: 16px;
	}
}

/* ============================================================
   DESKTOP (1024px+)
   ============================================================ */
@media (min-width: 64rem) {
	.hero {
		padding-top: 72px;
		margin-top: 0;
		padding-bottom: 120px;
	}

	.hero__layout {
		display: grid;
		grid-template-columns: minmax(0, 560px) minmax(0, 760px);
		align-items: start;
		gap: 56px;
	}

	.hero__content {
		flex: none;
		max-width: 560px;
		margin-top: 0;
	}

	.hero__teal-accent {
		width: 500px;
		height: 460px;
		right: 3%;
		top: 170px;
		border-radius: 16px;
		transform: rotate(7deg);
		opacity: 0.06;
	}

	.hero__heading {
		font-size: 4.5rem;
		letter-spacing: -2.5px;
	}

	.hero__card {
		max-width: 380px;
		margin-top: 20px;
		border-radius: 16px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	}

	.hero__card-accent {
		width: 7px;
	}

	.hero__card-body {
		padding: 24px 32px;
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
		display: block;
		position: relative;
		right: auto;
		top: 0;
		bottom: auto;
		flex: none;
		width: 100%;
		max-width: 760px;
		height: 620px;
		opacity: 1;
		margin-left: 0;
		justify-self: end;
	}

	.hero__image-bg {
		border-radius: 16px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
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
		padding-top: 76px;
		margin-top: 0;
		padding-bottom: 132px;
	}

	.hero__layout {
		grid-template-columns: minmax(0, 560px) minmax(0, 820px);
		gap: 62px;
	}

	.hero__teal-accent {
		width: 560px;
		height: 500px;
		right: 5%;
		top: 176px;
		border-radius: 16px;
	}

	.hero__heading {
		font-size: 5.5rem;
		letter-spacing: -3px;
	}

	.hero__card {
		max-width: 400px;
		margin-top: 22px;
		border-radius: 16px;
	}

	.hero__card-body {
		padding: 32px 40px;
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
		display: block;
		max-width: 820px;
		height: 640px;
		margin-left: 0;
		top: 0;
	}

	.hero__image-bg {
		border-radius: 16px;
	}
}
</style>
