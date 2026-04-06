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

function scrollToPreventivo() {
	document.getElementById('preventivo')?.scrollIntoView({ behavior: 'smooth' });
}
</script>

<template>
	<!-- ============================================================
	     HOMEPAGE HERO — Prototype-aligned layout
	     Two-column: text left + image right (desktop)
	     Stacked: text top + image bottom (mobile)
	     ============================================================ -->
	<section
		v-if="isHomepageHeroRoute"
		class="hero-homepage relative z-[2] bg-white">

		<div class="flex flex-col lg:flex-row items-center gap-[24px] lg:gap-[48px]">

			<!-- ── Colonna sinistra: testo ── -->
			<div class="relative z-[5] flex flex-col flex-1 min-w-0 lg:max-w-[480px]">

				<!-- Gradient accent strip — brand signature -->
				<div
					class="h-[6px] w-[72px] rounded-full mb-[20px]"
					style="background: linear-gradient(90deg, var(--color-brand-accent), var(--color-brand-primary))" />

				<!-- Titolo Montserrat -->
				<h1 class="hero-title">
					<span>Spedisci in </span>
					<span class="hero-title-highlight">tutta Italia</span>
				</h1>

				<!-- Sottotitolo -->
				<p class="hero-subtitle">
					Ritiro a domicilio, consegna veloce, prezzo fisso.
				</p>

				<!-- Promo badges (se attivi) -->
				<div v-if="showMinPriceDiscount" class="mt-[12px] flex items-center gap-[8px] flex-wrap">
					<span class="inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-full bg-[#E44203] text-white text-[0.8125rem] font-bold">
						-{{ minPriceInfo.discountPercent }}%
					</span>
					<span v-if="minBasePriceFormatted" class="text-[0.875rem] font-medium text-[var(--color-brand-text-muted)] line-through">
						{{ minBasePriceFormatted }}&euro;
					</span>
				</div>
				<div v-if="promoSettings?.active && promoSettings?.label_text" class="mt-[8px]">
					<span
						:style="{ backgroundColor: promoSettings.label_color || 'var(--color-brand-accent)' }"
						class="inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full text-white text-[0.75rem] font-bold tracking-wide shadow-sm">
						<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" decoding="async" width="40" height="16" class="h-[16px] w-auto shrink-0" />
						{{ promoSettings.label_text }}
					</span>
				</div>
				<p v-if="promoSettings?.active && promoSettings?.description" class="text-[0.8125rem] text-[var(--color-brand-text-secondary)] font-medium mt-[6px]">
					{{ promoSettings.description }}
				</p>

				<!-- Price + CTA unified box (prototype design) -->
				<div class="hero-price-cta-box">
					<!-- Price info -->
					<div class="flex flex-col gap-[2px] min-w-0">
						<div class="flex items-baseline gap-[8px]">
							<span class="text-white/50 text-[14px] font-semibold">Da</span>
							<span class="text-white text-[28px] sm:text-[32px] tracking-[-1px] leading-[1] font-[800]">
								{{ minPriceFormatted }}<span class="text-[16px] text-white/50">&euro;</span>
							</span>
						</div>
						<span class="text-white/45 text-[12px] sm:text-[13px] font-medium">IVA e ritiro incluso</span>
					</div>

					<!-- CTA -->
					<a
						href="#preventivo"
						class="hero-cta"
						@click.prevent="scrollToPreventivo">
						Calcola preventivo
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
							<path d="M12 5v14M19 12l-7 7-7-7"/>
						</svg>
					</a>
				</div>
			</div>

			<!-- ── Colonna destra: immagine con gradient border ── -->
			<div class="hero-image-wrapper">
				<div class="hero-image-gradient-border">
					<div class="hero-image-frame">
						<img
							:src="heroImageUrl"
							alt="Spedizioni veloci in tutta Italia"
							class="hero-image"
							:style="heroImageStyle"
							loading="eager"
							fetchpriority="high"
							decoding="async" />
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Servizi -->
	<div v-if="route.path === '/servizi'" class="relative z-2 flex flex-col items-center justify-center desktop:h-[calc(100%-48px)] tablet:h-[calc(100%-42px)] h-[calc(100%-30px)]">
		<h1 class="content-header-kicker text-center">I nostri servizi</h1>
		<p class="text-[1.75rem] desktop-xl:text-[4.5rem] leading-[110%] tracking-[-1.76px] font-medium text-[var(--color-brand-text)] text-center desktop:mb-[22px] mb-[18px] mt-[10px] desktop:text-[3.5rem]">
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
			<h1 class="font-montserrat text-[1.5rem] desktop:text-[3rem] desktop-xl:text-[5.5rem] leading-[110%] tracking-[-0.576px] desktop:tracking-[-2.2112px] font-[800] text-[var(--color-brand-text)] text-left mt-[12px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[200px] desktop:max-w-full">
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
			<h1 class="font-montserrat text-[var(--color-brand-text)] font-[800] leading-[105%] tracking-[-0.8px] text-[1.75rem] tablet:text-[2.25rem] desktop:text-[2.75rem]">
				Contatti
			</h1>
			<p class="mt-[10px] max-w-[560px] text-[0.9375rem] tablet:text-[1rem] desktop:text-[1.0625rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">
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
			<p class="text-[1.375rem] desktop:text-[2.75rem] desktop-xl:text-[4.75rem] leading-[108%] tracking-[-0.552px] desktop:tracking-[-1.98px] font-medium text-[var(--color-brand-text)] text-center mt-[10px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[320px] desktop:max-w-[620px]">
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
			<p class="text-[1.375rem] desktop:text-[2.75rem] desktop-xl:text-[4.75rem] leading-[108%] tracking-[-0.552px] desktop:tracking-[-1.98px] font-medium text-[var(--color-brand-text)] text-center mt-[10px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[320px] desktop:max-w-[620px]">
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
			<h1 class="font-montserrat text-[var(--color-brand-accent)] text-center font-medium tracking-[1.8px] desktop-xl:text-[1.25rem] text-[0.875rem] tracking desktop:text-[1.125rem]">FAQ</h1>
			<p class="text-[1.375rem] desktop:text-[2.75rem] desktop-xl:text-[4.75rem] leading-[108%] tracking-[-0.552px] desktop:tracking-[-1.98px] font-medium text-[var(--color-brand-text)] text-center mt-[10px] tablet:max-w-[360px] desktop-xl:max-w-[1056px] max-w-[320px] desktop:max-w-[620px]">
				Risposte rapide alle domande comuni
			</p>
		</div>
	</div>

</template>

<style scoped>
/* ============================================================
   HOMEPAGE HERO — Prototype-aligned styles
   ============================================================ */

.hero-homepage {
	padding: 16px 0 4px;
}

/* ── Titolo ── */
.hero-title {
	font-family: var(--font-montserrat);
	font-weight: 800;
	color: var(--color-brand-text);
	font-size: clamp(2.4rem, 4.5vw, 3.4rem);
	line-height: 1.05;
	letter-spacing: -1.5px;
}

/* Gradient highlight behind "tutta Italia" */
.hero-title-highlight {
	position: relative;
	display: inline-block;
}
.hero-title-highlight::after {
	content: '';
	position: absolute;
	left: -4px;
	right: -4px;
	bottom: 2px;
	height: 10px;
	border-radius: 3px;
	z-index: -1;
	opacity: 0.20;
	background: linear-gradient(90deg, var(--color-brand-accent), var(--color-brand-primary));
}

/* ── Sottotitolo ── */
.hero-subtitle {
	margin-top: 12px;
	color: #777;
	font-weight: 450;
	font-size: 15px;
	line-height: 1.55;
	max-width: 380px;
}

/* ── Price + CTA unified box ── */
.hero-price-cta-box {
	margin-top: 22px;
	border-radius: 16px;
	padding: 14px 20px;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 12px;
	background: var(--color-brand-primary);
}

/* ── CTA button (inside unified box) ── */
.hero-cta {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 12px 24px;
	border-radius: 999px;
	background: linear-gradient(135deg, var(--color-brand-accent) 0%, #c73600 100%);
	color: #fff;
	font-weight: 700;
	font-size: 14px;
	text-decoration: none;
	flex-shrink: 0;
	box-shadow: 0 4px 16px rgba(228, 66, 3, 0.3);
	transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.hero-cta:hover {
	transform: translateY(-1px);
	box-shadow: 0 8px 24px rgba(228, 66, 3, 0.4);
}

/* ── Immagine hero con gradient border ── */
.hero-image-wrapper {
	position: relative;
	z-index: 2;
	flex: 1 1 0%;
	width: 100%;
}

.hero-image-gradient-border {
	padding: 3px;
	border-radius: 22px;
	background: linear-gradient(135deg, var(--color-brand-accent) 0%, rgba(228, 66, 3, 0.3) 35%, rgba(9, 88, 102, 0.3) 65%, var(--color-brand-primary) 100%);
}

.hero-image-frame {
	position: relative;
	width: 100%;
	height: 240px;
	overflow: hidden;
	border-radius: 19px;
	background: #fff;
}

.hero-image {
	width: 100%;
	height: 240px;
	object-fit: cover;
	pointer-events: none;
	user-select: none;
}

/* ── SM (640px+) ── */
@media (min-width: 40rem) {
	.hero-homepage {
		padding: 24px 0 4px;
	}

	.hero-subtitle {
		font-size: 16px;
	}

	.hero-price-cta-box {
		flex-direction: row;
		align-items: center;
		gap: 16px;
		padding: 16px 24px;
	}

	.hero-cta {
		padding: 13px 28px;
		font-size: 15px;
	}

	.hero-image {
		height: 280px;
	}

	.hero-image-frame {
		height: 280px;
	}
}

/* ── Desktop (1024px+) ── */
@media (min-width: 64rem) {
	.hero-image-wrapper {
		width: auto;
	}

	.hero-image {
		height: 320px;
	}

	.hero-image-frame {
		height: 320px;
	}
}
</style>
