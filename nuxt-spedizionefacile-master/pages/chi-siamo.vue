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

<style scoped>
.about-page-shell {
	padding: 22px 0 76px;
}

.about-hero-panel {
	display: grid;
	gap: 18px;
	padding: 22px 20px;
	border-radius: 24px;
	background:
		radial-gradient(circle at top right, rgba(228, 66, 3, 0.12), transparent 34%),
		linear-gradient(180deg, rgba(9, 88, 102, 0.06) 0%, rgba(9, 88, 102, 0.015) 100%);
	border: 1px solid rgba(9, 88, 102, 0.1);
	box-shadow: 0 18px 38px rgba(9, 88, 102, 0.06);
}

.about-hero-panel__eyebrow {
	margin: 0;
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: #095866;
}

.about-hero-panel__title {
	margin: 8px 0 0;
	font-size: 1.7rem;
	line-height: 1.05;
	letter-spacing: -0.045em;
	font-weight: 700;
	color: #1f2937;
}

.about-hero-panel__text {
	margin: 12px 0 0;
	font-size: 0.95rem;
	line-height: 1.65;
	color: #546171;
	max-width: 66ch;
}

.about-hero-panel__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.about-hero-panel__cta {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 46px;
	padding: 0 18px;
	border-radius: 999px;
	font-size: 0.875rem;
	font-weight: 700;
	transition: transform .24s ease, box-shadow .24s ease, background-color .24s ease, color .24s ease;
}

.about-hero-panel__cta--primary {
	background: #E44203;
	color: #fff;
	box-shadow: 0 12px 24px rgba(228, 66, 3, 0.18);
}

.about-hero-panel__cta--secondary {
	background: #fff;
	color: #095866;
	border: 1px solid rgba(9, 88, 102, 0.14);
}

.about-pill-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 16px 0 0;
}

.about-pill {
	display: inline-flex;
	align-items: center;
	min-height: 34px;
	padding: 0 12px;
	border-radius: 999px;
	font-size: 0.79rem;
	font-weight: 700;
	color: #095866;
	background: #eef7f9;
	border: 1px solid rgba(9, 88, 102, 0.08);
}

.about-card-grid {
	display: grid;
	grid-template-columns: 1fr;
	gap: 16px;
	margin-top: 22px;
}

.about-story-card {
	display: flex;
	flex-direction: column;
	gap: 16px;
	height: 100%;
	padding: 20px;
	border-radius: 22px;
	background: #fff;
	border: 1px solid rgba(9, 88, 102, 0.1);
	box-shadow: 0 16px 34px rgba(17, 24, 39, 0.05);
}

.about-story-card__icon-shell {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	border-radius: 14px;
	background: linear-gradient(135deg, rgba(9, 88, 102, 0.14), rgba(9, 88, 102, 0.04));
}

.about-story-card__icon {
	font-size: 24px;
	color: #095866;
}

.about-story-card__body {
	display: grid;
	gap: 10px;
	flex: 1;
}

.about-story-card__title {
	margin: 0;
	font-size: 1.2rem;
	line-height: 1.18;
	letter-spacing: -0.03em;
	font-weight: 700;
	color: #1f2937;
}

.about-story-card__text {
	margin: 0;
	font-size: 0.95rem;
	line-height: 1.7;
	color: #546171;
}

@media (min-width: 48rem) {
	.about-page-shell {
		padding: 28px 0 92px;
	}

	.about-hero-panel {
		padding: 28px 28px;
	}

	.about-card-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
		margin-top: 26px;
	}
}

@media (min-width: 80rem) {
	.about-page-shell {
		padding: 32px 0 116px;
	}

	.about-hero-panel {
		grid-template-columns: minmax(0, 1.15fr) auto;
		align-items: end;
		padding: 32px;
	}

	.about-hero-panel__title {
		font-size: 2.6rem;
	}

	.about-card-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 20px;
	}

	.about-story-card {
		padding: 22px;
	}
}
</style>
