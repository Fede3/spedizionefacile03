<!--
  PAGINA: Chi Siamo (chi-siamo.vue)
  Pagina informativa che descrive l'azienda SpediamoFacile:
  cosa facciamo, la nostra visione, come lavoriamo, perche' sceglierci.
  Contiene dati strutturati JSON-LD per il SEO (AboutPage).
-->
<script setup>
// Meta tag SEO
useSeoMeta({
	title: 'Chi Siamo | SpediamoFacile - La Tua Piattaforma di Spedizioni',
	ogTitle: 'Chi Siamo | SpediamoFacile',
	description: 'Scopri SpediamoFacile: la piattaforma italiana che ti aiuta a spedire senza stress con prezzi trasparenti, procedure snelle e assistenza dedicata.',
	ogDescription: 'Scopri SpediamoFacile: spedizioni senza stress con prezzi trasparenti e assistenza dedicata.',
});

useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'AboutPage',
				name: 'Chi Siamo - SpediamoFacile',
				url: 'https://spediamofacile.it/chi-siamo',
				mainEntity: {
					'@type': 'Organization',
					name: 'SpediamoFacile',
					url: 'https://spediamofacile.it',
					description: 'Piattaforma italiana per confrontare e prenotare spedizioni nazionali e internazionali ai migliori prezzi.',
				},
			}),
		},
	],
});

// Sezioni della pagina "Chi Siamo" con titolo, descrizione e immagine (placeholder)
/* SVG paths per ogni sezione "Chi Siamo" */
const sections = [
	{
		title: "Cosa facciamo in concreto",
		iconSvg: '<path d="M5.12,5H18.87L17.93,4H5.93L5.12,5M20.54,5.23C20.83,5.57 21,6 21,6.5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V6.5C3,6 3.17,5.57 3.46,5.23L4.84,3.55C5.12,3.21 5.53,3 6,3H18C18.47,3 18.88,3.21 19.15,3.55L20.54,5.23M6,12H18V10H6V12Z" fill="currentColor"/>',
		description:
			"Ti aiutiamo a spedire senza stress. Dal pacco singolo alle esigenze ricorrenti di privati, professionisti e negozi online, offriamo soluzioni su misura con prezzi trasparenti e procedure snelle. Calcoliamo in tempo reale la tariffa più conveniente tra peso reale e peso-volume, applichiamo solo gli eventuali supplementi necessari e ti mostriamo subito il totale. A richiesta, gestiamo assicurazione, contrassegno e altre opzioni utili, in base alle necessità di recapito.",
		image: "",
	},
	{
		title: "La nostra visione",
		iconSvg: '<path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z" fill="currentColor"/>',
		first_description:
			"Rendere ogni spedizione semplice e affidabile. Vogliamo che chiunque possa organizzare un ritiro, stampare l'etichetta o scegliere l'opzione senza stampante, seguire il tracciamento in tempo reale e ricevere supporto quando serve, tutto dallo stesso posto. Il risultato è un'esperienza lineare: meno passaggi, più controllo, zero complicazioni.",
		second_description:
			"Immaginiamo una logistica vicina alle persone: servizi chiari, costi comprensibili, assistenza rapida. Vogliamo essere il punto di riferimento per chi cerca qualità e convenienza insieme, con un servizio accessibile, inclusivo e senza barriere. Lavoriamo perché spedire diventi un'azione quotidiana, immediata e sicura.",
		image: "",
	},
	{
		title: "Come lavoriamo",
		iconSvg: '<path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" fill="currentColor"/>',
		description:
			"Mettiamo al centro i dati essenziali. Il preventivo nasce da pochi campi chiari, il sistema seleziona la combinazione più conveniente e ti guida passo dopo passo fino al pagamento e all'etichetta. Con il tracciamento puoi sapere sempre dove si trova il pacco e con l'assistenza interna puoi gestire richieste, giacenze, variazioni di indirizzo e rimborsi quando ne ricorrono i presupposti. È la stessa logica di immediatezza che il mercato premia nelle migliori piattaforme di spedizione online, dove chiarezza e rapidità sono determinanti per la fiducia dell'utente",
		image: "",
	},
	{
		title: "Spedizioni rapide e sicure",
		iconSvg: '<path d="M18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5M19.5,9.5L21.46,12H17V9.5M6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5M20,8H17V4H3C1.89,4 1,4.89 1,6V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8Z" fill="currentColor"/>',
		description:
			"Collaboriamo con i migliori corrieri nazionali e internazionali per garantirti consegne puntuali e affidabili. Ogni spedizione e' tracciata in tempo reale: sai sempre dove si trova il tuo pacco. In caso di imprevisti, il nostro team interviene rapidamente per trovare la soluzione migliore.",
		image: "",
	},
	{
		title: "Perchè sceglierci",
		iconSvg: '<path d="M23,12L20.56,9.22L20.9,5.54L17.29,4.72L15.4,1.54L12,3L8.6,1.54L6.71,4.72L3.1,5.53L3.44,9.21L1,12L3.44,14.78L3.1,18.47L6.71,19.29L8.6,22.47L12,21L15.4,22.46L17.29,19.28L20.9,18.46L20.56,14.78L23,12M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" fill="currentColor"/>',
		description:
			"Prezzi chiari in tempo reale grazie al confronto automatico delle tariffe in base a peso e volume Ritiro a domicilio e consegna con corrieri nazionali e internazionali selezionati Servizi aggiuntivi su richiesta come assicurazione e contrassegno Assistenza che ti segue dal preventivo alla consegna con canali digitali e risposta rapida Area personale per gestire ordini, indirizzi, ricevute e storico spedizioni",
		image: "",
	},
];
</script>

<template>
	<section id="chi-siamo" class="about-page-shell">
		<div class="my-container">
			<div class="about-hero-panel">
				<div class="about-hero-panel__copy">
					<p class="about-hero-panel__eyebrow">Chi siamo</p>
					<h1 class="about-hero-panel__title">Spedizioni chiare, veloci e senza stress.</h1>
					<p class="about-hero-panel__text">
						Siamo SpediamoFacile: rendiamo il percorso dal preventivo alla consegna più leggibile, più rapido e più affidabile, mantenendo tecnologia e assistenza umana nello stesso flusso.
					</p>
				</div>

				<div class="about-hero-panel__actions">
					<NuxtLink to="/preventivo" class="about-hero-panel__cta about-hero-panel__cta--primary">Calcola un preventivo</NuxtLink>
					<NuxtLink to="/contatti" class="about-hero-panel__cta about-hero-panel__cta--secondary">Contattaci</NuxtLink>
				</div>
			</div>

			<div class="about-pill-row">
				<span class="about-pill">Prezzi trasparenti</span>
				<span class="about-pill">Ritiro a domicilio</span>
				<span class="about-pill">Supporto dedicato</span>
			</div>

			<div class="about-card-grid">
				<article
					v-for="(section, sectionIndex) in sections"
					:key="sectionIndex"
					class="about-story-card"
				>
					<div class="about-story-card__icon-shell">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="about-story-card__icon" v-html="section.iconSvg"></svg>
					</div>

					<div class="about-story-card__body">
						<h2 class="about-story-card__title">{{ section.title }}</h2>

						<p
							v-if="section.first_description && section.second_description"
							class="about-story-card__text"
						>
							<span>{{ section.first_description }}</span>
							<span class="block mt-[14px]">{{ section.second_description }}</span>
						</p>

						<p v-else class="about-story-card__text">
							{{ section.description }}
						</p>
					</div>
				</article>
			</div>
		</div>
	</section>
</template>

<\!-- CSS in assets/css/chi-siamo.css -->
