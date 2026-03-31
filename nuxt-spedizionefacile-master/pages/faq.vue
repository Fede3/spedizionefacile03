<!--
  PAGINA: FAQ - Domande Frequenti (faq.vue)
  Versione mobile-first con intro panel, accordion custom e CTA finale piu' guidata.
-->
<script setup>
useSeoMeta({
	title: 'FAQ - Domande Frequenti | SpediamoFacile',
	ogTitle: 'FAQ | SpediamoFacile',
	description: 'Trova risposte alle domande più frequenti su SpediamoFacile: prezzi, servizi, tracking, assicurazione, contrassegno e molto altro.',
	ogDescription: 'Domande frequenti su SpediamoFacile: tutto quello che devi sapere sulle spedizioni.',
});

const items = ref([
	{
		label: 'Come viene calcolato il prezzo di una spedizione su SpediamoFacile?',
		content:
			'Il costo di ogni spedizione dipende da peso e dimensioni del collo, destinazione, tipologia di servizio scelto ed eventuali servizi aggiuntivi. Il sistema calcola automaticamente il prezzo in tempo reale prima della conferma, cosi puoi vedere subito tutte le opzioni disponibili e scegliere quella piu conveniente, senza sorprese finali.',
	},
	{
		label: 'Ci sono costi aggiuntivi o commissioni nascoste?',
		content:
			'No. Non ci sono costi di attivazione, canoni fissi o commissioni nascoste. Paghi solo le spedizioni e i servizi aggiuntivi che selezioni in fase di ordine. Eventuali costi extra del corriere vengono rendicontati in modo trasparente nel tuo profilo.',
	},
	{
		label: 'Posso avere condizioni economiche personalizzate per la mia azienda?',
		content:
			'Si. Se la tua azienda spedisce volumi regolari o elevati possiamo valutare tariffe dedicate e modalita di fatturazione su misura. Dopo la registrazione puoi contattarci indicando i volumi medi e le esigenze operative.',
	},
	{
		label: 'Posso provare il servizio prima di impegnarmi?',
		content:
			'La registrazione a SpediamoFacile e gratuita e senza vincoli. Puoi creare il tuo account, simulare preventivi, salvare indirizzi e testare il flusso di creazione spedizione. Paghi solo quando confermi un ordine reale.',
	},
	{
		label: 'Ci sono vincoli contrattuali o posso smettere di usare il servizio quando voglio?',
		content:
			'Non ci sono vincoli contrattuali ne obblighi di volumi minimi. Il servizio e flessibile: puoi usarlo quando vuoi e interromperlo senza penali. Non ci sono canoni mensili ne costi fissi.',
	},
	{
		label: 'Come posso controllare lo stato delle mie spedizioni?',
		content:
			'Ogni spedizione viene associata a un codice di monitoraggio. Dal pannello di SpediamoFacile puoi vedere in tempo reale lo stato di tutti gli invii, consultare lo storico e ricevere avvisi in caso di anomalie.',
	},
	{
		label: 'Cosa succede se un pacco viene danneggiato o non arriva a destinazione?',
		content:
			'In caso di smarrimento, danneggiamento o consegna problematica, puoi aprire una segnalazione dalla tua area riservata. Ti guidiamo nella raccolta dei documenti necessari e inoltriamo la richiesta al corriere secondo le procedure previste.',
	},
	{
		label: 'Come funziona il portafoglio ricaricabile di SpediamoFacile?',
		content:
			'Il portafoglio digitale e un credito prepagato che puoi usare per pagare rapidamente tutte le spedizioni. Puoi ricaricarlo con i metodi disponibili, vedere saldo e movimenti e velocizzare il processo di acquisto.',
	},
]);

const faqTopics = ['Prezzi', 'Tracking', 'Contrassegno', 'Assicurazione', 'Account', 'Supporto'];
const openFaqIndex = ref(0);

const toggleFaq = (index) => {
	openFaqIndex.value = openFaqIndex.value === index ? -1 : index;
};

useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: items.value.map((item) => ({
					'@type': 'Question',
					name: item.label,
					acceptedAnswer: {
						'@type': 'Answer',
						text: item.content,
					},
				})),
			}),
		},
	],
});
</script>

<template>
	<section class="faq-page-shell">
		<div class="my-container">
			<div class="faq-intro-panel">
				<div class="faq-intro-panel__copy">
					<p class="faq-intro-panel__eyebrow">FAQ</p>
					<h1 class="faq-intro-panel__title">Risposte rapide ai dubbi che bloccano piu spesso il flusso.</h1>
					<p class="faq-intro-panel__text">Prezzi, tracking, servizi aggiuntivi, account e supporto: qui trovi le risposte essenziali senza dover inseguire pagine o passaggi inutili.</p>
				</div>

				<div class="faq-intro-panel__topics">
					<span v-for="topic in faqTopics" :key="topic" class="faq-intro-panel__topic">{{ topic }}</span>
				</div>
			</div>

			<div class="faq-list-shell">
				<article
					v-for="(item, index) in items"
					:key="item.label"
					class="faq-card"
					:class="{ 'is-open': openFaqIndex === index }"
				>
					<button type="button" class="faq-card__trigger" @click="toggleFaq(index)">
						<span class="faq-card__number">{{ String(index + 1).padStart(2, '0') }}</span>
						<span class="faq-card__question">{{ item.label }}</span>
						<span class="faq-card__icon-shell">
							<svg class="faq-card__icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
						</span>
					</button>
					<div class="faq-card__panel">
						<div class="faq-card__panel-inner">
							<p class="faq-card__answer">{{ item.content }}</p>
						</div>
					</div>
				</article>
			</div>

			<div class="faq-cta-panel">
				<div class="faq-cta-panel__copy">
					<h2 class="faq-cta-panel__title">Non hai trovato la risposta?</h2>
					<p class="faq-cta-panel__text">Se il dubbio riguarda una spedizione concreta o un caso operativo, conviene scriverci con il contesto giusto oppure partire dal preventivo.</p>
				</div>
				<div class="faq-cta-panel__actions">
					<NuxtLink to="/contatti" class="faq-cta-panel__button faq-cta-panel__button--primary">Contattaci</NuxtLink>
					<NuxtLink to="/preventivo" class="faq-cta-panel__button faq-cta-panel__button--secondary">Vai al preventivo</NuxtLink>
				</div>
			</div>
		</div>
	</section>
</template>

<style scoped>
.faq-page-shell {
	padding: 22px 0 72px;
}

.faq-intro-panel,
.faq-card,
.faq-cta-panel {
	background: #fff;
	border-radius: 24px;
	border: 1px solid rgba(9, 88, 102, 0.1);
	box-shadow: 0 16px 34px rgba(17, 24, 39, 0.05);
}

.faq-intro-panel {
	display: grid;
	gap: 18px;
	padding: 22px 20px;
	background:
		radial-gradient(circle at top right, rgba(228, 66, 3, 0.12), transparent 34%),
		linear-gradient(180deg, rgba(9, 88, 102, 0.06) 0%, rgba(9, 88, 102, 0.015) 100%);
}

.faq-intro-panel__eyebrow {
	margin: 0;
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: #095866;
}

.faq-intro-panel__title {
	margin: 8px 0 0;
	font-size: 1.55rem;
	line-height: 1.08;
	letter-spacing: -0.04em;
	font-weight: 700;
	color: #1f2937;
}

.faq-intro-panel__text {
	margin: 12px 0 0;
	font-size: 0.95rem;
	line-height: 1.62;
	color: #546171;
	max-width: 64ch;
}

.faq-intro-panel__topics {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.faq-intro-panel__topic {
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

.faq-list-shell {
	display: grid;
	gap: 12px;
	margin-top: 22px;
}

.faq-card {
	overflow: hidden;
	transition: border-color .22s ease, box-shadow .22s ease, transform .22s ease;
}

.faq-card.is-open {
	border-color: rgba(9, 88, 102, 0.2);
	box-shadow: 0 20px 40px rgba(9, 88, 102, 0.08);
}

.faq-card__trigger {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: start;
	gap: 12px;
	width: 100%;
	padding: 18px 18px 16px;
	text-align: left;
	cursor: pointer;
}

.faq-card__number {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 42px;
	height: 42px;
	border-radius: 14px;
	background: linear-gradient(135deg, rgba(9, 88, 102, 0.12), rgba(9, 88, 102, 0.03));
	color: #095866;
	font-size: 0.8rem;
	font-weight: 800;
}

.faq-card__question {
	font-size: 1rem;
	line-height: 1.45;
	font-weight: 700;
	color: #1f2937;
}

.faq-card__icon-shell {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	border-radius: 14px;
	background: #f8fbfc;
	color: #095866;
	border: 1px solid rgba(9, 88, 102, 0.08);
}

.faq-card__icon {
	transition: transform .22s ease;
}

.faq-card.is-open .faq-card__icon {
	transform: rotate(45deg);
}

.faq-card__panel {
	display: grid;
	grid-template-rows: 0fr;
	transition: grid-template-rows .24s ease;
}

.faq-card__panel-inner {
	overflow: hidden;
}

.faq-card.is-open .faq-card__panel {
	grid-template-rows: 1fr;
}

.faq-card__answer {
	margin: 0;
	padding: 0 18px 18px 72px;
	font-size: 0.92rem;
	line-height: 1.68;
	color: #546171;
}

.faq-cta-panel {
	display: grid;
	gap: 16px;
	padding: 22px 20px;
	margin-top: 22px;
	background: linear-gradient(180deg, rgba(9, 88, 102, 0.06) 0%, rgba(9, 88, 102, 0.015) 100%);
}

.faq-cta-panel__title {
	margin: 0;
	font-size: 1.18rem;
	line-height: 1.15;
	font-weight: 700;
	color: #1f2937;
}

.faq-cta-panel__text {
	margin: 8px 0 0;
	font-size: 0.92rem;
	line-height: 1.62;
	color: #546171;
}

.faq-cta-panel__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}

.faq-cta-panel__button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 46px;
	padding: 0 18px;
	border-radius: 999px;
	font-size: 0.875rem;
	font-weight: 700;
	transition: transform .24s ease, box-shadow .24s ease, background-color .24s ease;
}

.faq-cta-panel__button:hover {
	transform: translateY(-1px);
}

.faq-cta-panel__button--primary {
	background: #E44203;
	color: #fff;
	box-shadow: 0 12px 24px rgba(228, 66, 3, 0.18);
}

.faq-cta-panel__button--secondary {
	background: #fff;
	color: #095866;
	border: 1px solid rgba(9, 88, 102, 0.12);
}

@media (min-width: 48rem) {
	.faq-page-shell {
		padding: 28px 0 88px;
	}

	.faq-intro-panel,
	.faq-cta-panel {
		padding: 28px 28px;
	}

	.faq-card__trigger {
		padding: 20px 20px 18px;
	}

	.faq-card__answer {
		padding: 0 20px 20px 74px;
	}
}

@media (min-width: 80rem) {
	.faq-page-shell {
		padding: 32px 0 112px;
	}

	.faq-intro-panel {
		grid-template-columns: minmax(0, 1.1fr) auto;
		align-items: end;
		padding: 32px;
	}

	.faq-intro-panel__title {
		font-size: 2.35rem;
	}

	.faq-cta-panel {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		padding: 28px 32px;
	}
}
</style>
