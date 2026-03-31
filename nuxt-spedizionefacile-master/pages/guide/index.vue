<!--
  PAGINA: Guide (guide/index.vue)
  Pagina che elenca tutte le guide disponibili per gli utenti di SpediamoFacile.
  Carica le guide dall'API pubblica /api/public/guides, con fallback hardcoded.
  Mostra una griglia di card con icona SVG, titolo, descrizione e link alla guida completa.
  Include dati strutturati JSON-LD per il SEO (CollectionPage).
-->
<script setup>
useSeoMeta({
	title: 'Guide alle Spedizioni | SpediamoFacile',
	ogTitle: 'Guide alle Spedizioni | SpediamoFacile',
	description: 'Consulta le nostre guide pratiche su come preparare pacchi, scegliere il corriere giusto, risparmiare sulle spedizioni e molto altro.',
	ogDescription: 'Guide pratiche per spedire in modo semplice e conveniente con SpediamoFacile.',
});

useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'CollectionPage',
				name: 'Guide alle Spedizioni - SpediamoFacile',
				url: 'https://spediamofacile.it/guide',
				description: 'Raccolta di guide pratiche per spedire pacchi in Italia e all\'estero.',
				mainEntity: {
					'@type': 'Organization',
					name: 'SpediamoFacile',
					url: 'https://spediamofacile.it',
				},
			}),
		},
	],
});

// Fallback hardcoded (usato se l'API non e' disponibile)
const fallbackGuides = [
	{ slug: 'come-preparare-un-pacco', title: 'Come preparare un pacco per la spedizione', meta_description: 'Scopri come preparare correttamente un pacco per garantire che arrivi a destinazione in perfette condizioni.' },
	{ slug: 'imballare-oggetti-fragili', title: 'Come imballare oggetti fragili', meta_description: 'Tecniche e materiali per proteggere al meglio oggetti delicati e fragili durante il trasporto.' },
	{ slug: 'dimensioni-pesi-massimi', title: 'Guida alle dimensioni e pesi massimi', meta_description: 'Tutto quello che devi sapere sui limiti di peso e dimensioni accettati dai principali corrieri.' },
	{ slug: 'tracciare-spedizione', title: 'Come tracciare la tua spedizione', meta_description: 'Impara a seguire il tuo pacco in tempo reale dalla partenza fino alla consegna.' },
	{ slug: 'pacco-danneggiato', title: 'Cosa fare se il pacco è danneggiato', meta_description: 'La procedura da seguire in caso di pacco danneggiato: documentazione, reclamo e rimborso.' },
	{ slug: 'spedire-elettronica', title: 'Spedire elettronica in sicurezza', meta_description: 'Come imballare e spedire dispositivi elettronici senza rischi di danni.' },
	{ slug: 'contrassegno', title: 'Guida al contrassegno', meta_description: 'Come funziona il pagamento alla consegna: vantaggi, limiti e procedura completa.' },
	{ slug: 'scegliere-corriere', title: 'Come scegliere il corriere giusto', meta_description: 'Criteri e consigli per selezionare il corriere più adatto alle tue esigenze di spedizione.' },
	{ slug: 'nazionali-vs-internazionali', title: 'Spedizioni nazionali vs internazionali', meta_description: 'Le differenze principali tra spedizioni in Italia e all\'estero: tempi, costi e documentazione.' },
	{ slug: 'risparmiare-spedizioni', title: 'Come risparmiare sulle spedizioni', meta_description: 'Strategie pratiche per ridurre i costi di spedizione senza rinunciare alla qualità del servizio.' },
	{ slug: 'documenti-necessari', title: 'Documenti necessari per la spedizione', meta_description: 'Quali documenti servono per spedire in Italia e all\'estero: guida completa alla documentazione.' },
	{ slug: 'cosa-non-spedire', title: 'Cosa non si può spedire', meta_description: 'L\'elenco degli oggetti vietati o soggetti a restrizioni nelle spedizioni nazionali e internazionali.' },
	{ slug: 'ritiro-domicilio', title: 'Come funziona il ritiro a domicilio', meta_description: 'Tutto sul servizio di ritiro a domicilio: come prenotarlo, preparare il pacco e cosa aspettarsi.' },
	{ slug: 'assicurazione-spedizione', title: 'Assicurazione sulla spedizione', meta_description: 'Quando conviene assicurare un pacco, quanto costa e come funziona la copertura.' },
	{ slug: 'faq-ecommerce', title: 'FAQ sulle spedizioni e-commerce', meta_description: 'Risposte alle domande più frequenti per chi gestisce un negozio online e deve spedire regolarmente.' },
];

// Icone SVG per le guide (usate come fallback se icon non presente nel DB)
const fallbackIcons = {
	'come-preparare-un-pacco': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14l12-7 12 7v14l-12 7-12-7V14z"/><path d="M8 14l12 7"/><path d="M20 35V21"/><path d="M32 14l-12 7"/><path d="M26 10.5l-12 7"/><path d="M14 10v7l6 3.5"/></svg>`,
	'imballare-oggetti-fragili': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 5l14 7v16l-14 7L6 28V12l14-7z"/><path d="M20 18v-5"/><path d="M20 26l.01 0"/><path d="M15 15l5 3 5-3"/></svg>`,
	'dimensioni-pesi-massimi': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 33h26"/><path d="M7 33V7"/><path d="M7 7l4 4"/><path d="M7 7l-4 4"/><path d="M33 33l-4-4"/><path d="M33 33l4-4"/><path d="M15 13h12v12H15z"/><path d="M19 13v12"/><path d="M23 13v12"/><path d="M15 19h12"/><path d="M15 23h12"/></svg>`,
	'tracciare-spedizione': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="14" r="4"/><path d="M14 18c-5 0-8 3-8 6"/><circle cx="28" cy="28" r="3"/><path d="M14 14l14 14"/><path d="M10 28h2"/><path d="M30 10v2"/><circle cx="30" cy="10" r="2"/></svg>`,
	'pacco-danneggiato': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 33L20 7l15 26H5z"/><path d="M20 15v8"/><circle cx="20" cy="27" r="0.5" fill="#ffffff"/></svg>`,
	'spedire-elettronica': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="8" width="28" height="19" rx="2"/><path d="M6 23h28"/><path d="M16 31h8"/><path d="M20 27v4"/><circle cx="20" cy="25" r="0.5" fill="#ffffff"/></svg>`,
	'contrassegno': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="10" width="28" height="20" rx="2"/><path d="M6 16h28"/><circle cx="20" cy="24" r="4"/><path d="M18.5 24h3"/><path d="M20 22.5v3"/></svg>`,
	'scegliere-corriere': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10h18v16H6z"/><path d="M24 16h6l4 5v5h-10V16z"/><circle cx="12" cy="28" r="3"/><circle cx="28" cy="28" r="3"/><path d="M15 26h10"/></svg>`,
	'nazionali-vs-internazionali': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="20" r="14"/><ellipse cx="20" cy="20" rx="6" ry="14"/><path d="M6 20h28"/><path d="M8 12h24"/><path d="M8 28h24"/></svg>`,
	'risparmiare-spedizioni': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 34c-4 0-7-3-7-7V17a10 10 0 0 1 20 0v1"/><ellipse cx="12" cy="17" rx="10" ry="3"/><path d="M28 20v-2"/><circle cx="28" cy="24" r="6"/><path d="M26.5 24h3"/><path d="M28 22.5v3"/></svg>`,
	'documenti-necessari': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 6h12l8 8v20a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M23 6v8h8"/><path d="M14 18h12"/><path d="M14 23h12"/><path d="M14 28h8"/></svg>`,
	'cosa-non-spedire': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="20" r="14"/><path d="M10 10l20 20"/></svg>`,
	'ritiro-domicilio': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20l14-13 14 13"/><path d="M10 18v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V18"/><path d="M16 34v-10h8v10"/></svg>`,
	'assicurazione-spedizione': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 5L7 11v10c0 9 6 15 13 18 7-3 13-9 13-18V11L20 5z"/><path d="M15 20l4 4 7-8"/></svg>`,
	'faq-ecommerce': `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="15" r="6"/><path d="M15 21v7"/><path d="M11 30h8"/><path d="M25 8h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2l-4 4v-4"/></svg>`,
};

// Carica guide dall'API pubblica con fallback
const sanctum = useSanctumClient();
const guides = ref(fallbackGuides);

onMounted(async () => {
	try {
		const res = await sanctum('/api/public/guides');
		const data = res?.data || res;
		if (Array.isArray(data) && data.length > 0) {
			guides.value = data;
		}
	} catch (e) {
		// API non disponibile, usa fallback hardcoded
	}
});

// Restituisce l'icona SVG per una guida (da DB o fallback)
const getGuideIcon = (guide) => {
	return guide.icon || fallbackIcons[guide.slug] || fallbackIcons['come-preparare-un-pacco'];
};

// Descrizione breve per la card (usa meta_description o intro troncato)
const getDescription = (guide) => {
	return guide.meta_description || guide.description || guide.intro || '';
};
</script>

<template>
	<section id="guide">
		<div class="my-container">
			<div class="guide-intro-panel mt-[24px] desktop:mt-[28px]">
				<div class="guide-intro-panel__copy">
					<p class="guide-intro-panel__eyebrow">Guide</p>
					<h1 class="guide-intro-panel__title">Guide pratiche per spedire meglio, capire il flusso e ridurre gli errori.</h1>
					<p class="guide-intro-panel__text">Scegli l’argomento che ti serve e vai subito al punto: preparazione del pacco, contrassegno, assicurazione, tracking e gestione operativa.</p>
				</div>

				<NuxtLink to="/preventivo" class="guide-intro-panel__cta">
					Vai al preventivo
				</NuxtLink>
			</div>

			<div class="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-[16px] tablet:gap-[20px] desktop:gap-[22px] mt-[24px] tablet:mt-[28px] mb-[64px] desktop:mb-[112px]">
				<NuxtLink
					v-for="guide in guides"
					:key="guide.slug"
					:to="`/guide/${guide.slug}`"
					class="guide-card block rounded-[22px] overflow-hidden border border-[#E9EBEC] shadow-sm hover:shadow-lg hover:border-[#095866] transition-all group">
					<!-- Accent line -->
					<div class="h-[3px] bg-[#E44203]"></div>

					<!-- Icon banner area -->
					<div class="guide-card__banner flex items-center justify-center h-[104px] tablet:h-[116px] desktop:h-[120px]" v-html="getGuideIcon(guide)">
					</div>

					<!-- Card body -->
					<div class="guide-card__body p-[20px] tablet:p-[22px] desktop:p-[24px]">
						<h2 class="text-[1rem] tablet:text-[1.0625rem] desktop:text-[1.125rem] font-medium text-[#222222] leading-[130%] tracking-[-0.4px] mb-[8px] group-hover:text-[#095866] transition-colors">
							{{ guide.title }}
						</h2>
						<p class="text-[0.8125rem] tablet:text-[0.875rem] desktop:text-[0.9375rem] text-[#737373] leading-[160%] tracking-[-0.24px] mb-[16px]">
							{{ getDescription(guide) }}
						</p>
						<span class="guide-card__cta inline-flex items-center gap-[6px] h-[40px] px-[18px] rounded-[35px] bg-[#E44203] text-white font-semibold tracking-[-0.32px] text-[0.8125rem] group-hover:bg-[#c93800] transition-colors">
							Leggi
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10"/><path d="M9 4l4 4-4 4"/></svg>
						</span>
					</div>
				</NuxtLink>
			</div>
		</div>
	</section>
</template>

<style scoped>
.guide-intro-panel {
	display: grid;
	gap: 18px;
	padding: 22px 20px;
	border-radius: 24px;
	background:
		radial-gradient(circle at top right, rgba(228, 66, 3, 0.12), transparent 32%),
		linear-gradient(180deg, rgba(9, 88, 102, 0.06) 0%, rgba(9, 88, 102, 0.015) 100%);
	border: 1px solid rgba(9, 88, 102, 0.1);
	box-shadow: 0 18px 38px rgba(9, 88, 102, 0.06);
}

.guide-intro-panel__eyebrow {
	margin: 0;
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: #095866;
}

.guide-intro-panel__title {
	margin: 8px 0 0;
	font-size: 1.55rem;
	line-height: 1.08;
	letter-spacing: -0.04em;
	font-weight: 700;
	color: #1f2937;
}

.guide-intro-panel__text {
	margin: 12px 0 0;
	font-size: 0.95rem;
	line-height: 1.62;
	color: #546171;
	max-width: 64ch;
}

.guide-intro-panel__cta {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 46px;
	padding: 0 18px;
	border-radius: 999px;
	background: #E44203;
	color: #fff;
	font-size: 0.875rem;
	font-weight: 700;
	box-shadow: 0 12px 24px rgba(228, 66, 3, 0.18);
	transition: transform .24s ease, box-shadow .24s ease;
}

.guide-intro-panel__cta:hover {
	transform: translateY(-1px);
}

.guide-card__banner {
	background: linear-gradient(135deg, #095866 0%, #0b6d7d 100%);
}

.guide-card {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.guide-card__body {
	display: flex;
	flex-direction: column;
	flex: 1;
}

.guide-card__cta {
	margin-top: auto;
}

@media (min-width: 80rem) {
	.guide-intro-panel {
		grid-template-columns: minmax(0, 1.15fr) auto;
		align-items: end;
		padding: 30px 32px;
	}

	.guide-intro-panel__title {
		font-size: 2.35rem;
	}
}
</style>
