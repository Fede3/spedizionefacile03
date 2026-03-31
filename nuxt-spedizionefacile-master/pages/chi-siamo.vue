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
/* Icone MDI per ogni sezione "Chi Siamo" */
const sections = [
	{
		title: "Cosa facciamo in concreto",
		icon: "mdi:package-variant-closed",
		description:
			"Ti aiutiamo a spedire senza stress. Dal pacco singolo alle esigenze ricorrenti di privati, professionisti e negozi online, offriamo soluzioni su misura con prezzi trasparenti e procedure snelle. Calcoliamo in tempo reale la tariffa più conveniente tra peso reale e peso-volume, applichiamo solo gli eventuali supplementi necessari e ti mostriamo subito il totale. A richiesta, gestiamo assicurazione, contrassegno e altre opzioni utili, in base alle necessità di recapito.",
		image: "",
	},
	{
		title: "La nostra visione",
		icon: "mdi:eye-outline",
		first_description:
			"Rendere ogni spedizione semplice e affidabile. Vogliamo che chiunque possa organizzare un ritiro, stampare l'etichetta o scegliere l'opzione senza stampante, seguire il tracciamento in tempo reale e ricevere supporto quando serve, tutto dallo stesso posto. Il risultato è un'esperienza lineare: meno passaggi, più controllo, zero complicazioni.",
		second_description:
			"Immaginiamo una logistica vicina alle persone: servizi chiari, costi comprensibili, assistenza rapida. Vogliamo essere il punto di riferimento per chi cerca qualità e convenienza insieme, con un servizio accessibile, inclusivo e senza barriere. Lavoriamo perché spedire diventi un'azione quotidiana, immediata e sicura.",
		image: "",
	},
	{
		title: "Come lavoriamo",
		icon: "mdi:cog-outline",
		description:
			"Mettiamo al centro i dati essenziali. Il preventivo nasce da pochi campi chiari, il sistema seleziona la combinazione più conveniente e ti guida passo dopo passo fino al pagamento e all'etichetta. Con il tracciamento puoi sapere sempre dove si trova il pacco e con l'assistenza interna puoi gestire richieste, giacenze, variazioni di indirizzo e rimborsi quando ne ricorrono i presupposti. È la stessa logica di immediatezza che il mercato premia nelle migliori piattaforme di spedizione online, dove chiarezza e rapidità sono determinanti per la fiducia dell'utente",
		image: "",
	},
	{
		title: "Spedizioni rapide e sicure",
		icon: "mdi:truck-fast-outline",
		description:
			"Collaboriamo con i migliori corrieri nazionali e internazionali per garantirti consegne puntuali e affidabili. Ogni spedizione e' tracciata in tempo reale: sai sempre dove si trova il tuo pacco. In caso di imprevisti, il nostro team interviene rapidamente per trovare la soluzione migliore.",
		image: "",
	},
	{
		title: "Perchè sceglierci",
		icon: "mdi:check-decagram-outline",
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
						<Icon :name="section.icon" class="about-story-card__icon" />
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
