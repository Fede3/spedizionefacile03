<!--
  PAGINA: Pagamento alla Consegna (servizi/pagamento-alla-consegna.vue)
  Pagina informativa dedicata al contrassegno.
  Struttura aggiornata alla grammatica pubblica nuova: hero chiaro, sezioni modulari,
  checklist operative e FAQ leggibili anche da mobile.
-->
<script setup>
useSeoMeta({
	title: 'Pagamento alla Consegna (Contrassegno) | SpediamoFacile',
	ogTitle: 'Pagamento alla Consegna | SpediamoFacile',
	description:
		'Spedisci con pagamento alla consegna: il corriere incassa per tuo conto al momento della consegna. Scopri come funziona il contrassegno con SpediamoFacile.',
	ogDescription: 'Spedisci con contrassegno: il corriere incassa per tuo conto alla consegna. Scopri come funziona.',
});

const summaryPills = ['Incasso gestito dal corriere', 'Sovrapprezzo visibile nel preventivo', 'Riversamento tracciabile'];

const overviewCards = [
	{
		title: "Cos'e'",
		description:
			"Il pagamento alla consegna e' un servizio accessorio in cui il corriere incassa dal destinatario l'importo indicato dal mittente e poi lo riversa con la modalita' prevista dal vettore.",
	},
	{
		title: 'Quando conviene',
		bullets: [
			'Quando vuoi vendere senza chiedere un pagamento anticipato.',
			'Quando gestisci ordini fuori da un classico checkout ecommerce.',
			'Quando vuoi tenere consegna e incasso dentro lo stesso flusso operativo.',
		],
	},
];

const flowSteps = [
	{
		step: '01',
		title: 'Imposta il contrassegno nel checkout',
		description:
			"Durante la spedizione inserisci l'importo da incassare, una descrizione sintetica per i documenti e la modalita' di riversamento disponibile.",
	},
	{
		step: '02',
		title: 'Il corriere ritira e consegna',
		description:
			"Alla consegna il destinatario paga l'importo indicato. Se non paga o rifiuta, il collo non viene consegnato e segue la procedura prevista dal vettore.",
	},
	{
		step: '03',
		title: "L'incasso viene riversato",
		description:
			"Il riversamento avviene secondo la modalita' selezionata. Nel tuo flusso operativo puoi distinguere tra incasso in corso, incasso eseguito e riversato.",
	},
	{
		step: '04',
		title: 'Tracci e riconcili il tutto',
		description:
			'Quietanze, distinta di riversamento e stato ordine restano leggibili dal prodotto, riducendo i passaggi fuori piattaforma.',
	},
];

const guardrails = [
	'Importo chiaramente indicato su documenti ed etichetta dove richiesto dal vettore.',
	'Verifica sempre eventuali limiti e soglie del corriere prima di confermare la spedizione.',
	'Dati completi del destinatario e numero di telefono riducono i tentativi di consegna a vuoto.',
	'Se vendi merce di valore, valuta copertura assicurativa e foto di pre-imballo.',
	"Se il destinatario non paga, la spedizione puo' andare in giacenza o rientrare al mittente con costi collegati.",
];

const checkoutChecklist = [
	'Importo contrassegno',
	'Descrizione breve per ricevuta o documenti',
	'Scelta del riversamento disponibile',
	'Conferma esplicita del servizio accessorio',
	'Messaggio chiaro al destinatario nella pre-consegna, se previsto',
];

const scenarioCards = [
	{
		title: "Il destinatario non paga o non e' presente",
		description:
			"La consegna non si chiude. Il collo puo' andare in giacenza oppure tornare al mittente secondo le condizioni del corriere.",
	},
	{
		title: "L'accredito non e' immediato",
		description:
			"I tempi di riversamento dipendono dal vettore e dalla modalita' selezionata. Il flusso va letto come processo separato dalla sola consegna.",
	},
	{
		title: 'Vuoi fatturare al destinatario',
		description:
			'La fattura resta del mittente: il corriere incassa per tuo conto. Serve quindi mantenere importo, quietanza e riconciliazione coerenti.',
	},
];

const faqs = [
	{
		title: "Il pagamento alla consegna e' solo in contanti?",
		text: "Per i servizi nazionali e' normalmente in contanti; alcune reti offrono varianti o servizi correlati. Verifica sempre le condizioni del vettore scelto.",
	},
	{
		title: 'Come scelgo come ricevere i soldi incassati?',
		text: "Al momento dell'ordine selezioni la modalita' di riversamento resa disponibile dal vettore, per esempio accredito su conto corrente.",
	},
	{
		title: 'Posso far pagare solo le spese di spedizione?',
		text: 'Sono possibili servizi correlati in cui il destinatario paga solo il trasporto, ma non coincidono sempre con il contrassegno classico della merce.',
	},
	{
		title: 'Cosa devo scrivere sui documenti?',
		text: "L'importo da incassare deve essere indicato in modo chiaro secondo i requisiti del vettore. Le condizioni ufficiali aggiornate restano la fonte da seguire.",
	},
];

useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: faqs.map((faq) => ({
					'@type': 'Question',
					name: faq.title,
					acceptedAnswer: {
						'@type': 'Answer',
						text: faq.text,
					},
				})),
			}),
		},
	],
});
</script>

<template>
	<section class="service-detail-shell py-[28px] desktop:py-[56px]">
		<div class="my-container space-y-[20px] desktop:space-y-[28px]">
			<section class="service-hero-card rounded-[28px] border border-[#E4EAEE] px-[20px] py-[22px] desktop:px-[32px] desktop:py-[34px]">
				<div
					class="flex flex-col gap-[18px] desktop:grid desktop:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] desktop:items-center desktop:gap-[28px]">
					<div class="space-y-[12px]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--color-brand-primary)]">Servizio accessorio</p>
						<h1 class="text-[2rem] font-bold tracking-[-0.04em] text-[#1F2937] desktop:text-[3.2rem]">Pagamento alla consegna</h1>
						<p class="max-w-[62ch] text-[0.9375rem] leading-[1.65] text-[#5B6670] desktop:text-[1.0625rem]">
							Il corriere incassa per tuo conto al momento della consegna. Questa pagina ti aiuta a capire quando usarlo, quali dati servono
							davvero e quali controlli fare prima di confermare una spedizione.
						</p>
						<div class="flex flex-wrap gap-[8px]">
							<span
								v-for="pill in summaryPills"
								:key="pill"
								class="inline-flex items-center rounded-full bg-[#F0F6F7] px-[12px] py-[6px] text-[0.75rem] font-semibold text-[var(--color-brand-primary)]">
								{{ pill }}
							</span>
						</div>
					</div>

					<div class="rounded-[24px] border border-white/70 bg-white/75 p-[18px] shadow-[0_18px_40px_rgba(9,88,102,0.08)] backdrop-blur">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-brand-accent)]">Da tenere a mente</p>
						<div class="mt-[12px] space-y-[12px]">
							<div class="rounded-[18px] border border-[#E9EEF2] bg-[#F8FBFC] px-[14px] py-[12px]">
								<p class="text-[0.8125rem] font-semibold text-[#1F2937]">Costo extra sempre visibile</p>
								<p class="mt-[4px] text-[0.8125rem] leading-[1.55] text-[#5B6670]">
									Il contrassegno non va trattato come nota generica: deve rientrare nel pricing mostrato prima del pagamento.
								</p>
							</div>
							<div class="rounded-[18px] border border-[#E9EEF2] bg-[#F8FBFC] px-[14px] py-[12px]">
								<p class="text-[0.8125rem] font-semibold text-[#1F2937]">Consegna e incasso non sono la stessa cosa</p>
								<p class="mt-[4px] text-[0.8125rem] leading-[1.55] text-[#5B6670]">
									La spedizione puo\' risultare consegnata prima che il riversamento sia effettivamente riconciliato.
								</p>
							</div>
						</div>
						<div class="mt-[16px] flex flex-wrap gap-[10px]">
							<NuxtLink to="/preventivo" class="btn-cta btn-compact inline-flex items-center justify-center">
								Calcola il preventivo
							</NuxtLink>
							<NuxtLink to="/contatti" class="btn-secondary btn-compact inline-flex items-center justify-center">Parla con noi</NuxtLink>
						</div>
					</div>
				</div>
			</section>

			<section class="grid gap-[16px] desktop:grid-cols-2">
				<article
					v-for="card in overviewCards"
					:key="card.title"
					class="rounded-[24px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_12px_26px_rgba(15,23,42,0.04)] desktop:px-[22px] desktop:py-[22px]">
					<h2 class="text-[1.125rem] font-semibold tracking-[-0.02em] text-[#1F2937]">{{ card.title }}</h2>
					<p v-if="card.description" class="mt-[10px] text-[0.875rem] leading-[1.65] text-[#5B6670] desktop:text-[0.9375rem]">
						{{ card.description }}
					</p>
					<ul v-else class="mt-[12px] space-y-[8px]">
						<li v-for="item in card.bullets" :key="item" class="flex items-start gap-[10px] text-[0.875rem] leading-[1.6] text-[#5B6670]">
							<span class="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--color-brand-accent)]"></span>
							<span>{{ item }}</span>
						</li>
					</ul>
				</article>
			</section>

			<section
				class="rounded-[28px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_14px_30px_rgba(15,23,42,0.05)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">Come funziona</p>
					<h2 class="text-[1.4rem] font-semibold tracking-[-0.03em] text-[#1F2937] desktop:text-[2rem]">
						Dal checkout al riversamento, senza punti ciechi
					</h2>
					<p class="sf-section-description max-w-[64ch]">
						Il valore del contrassegno non e' soltanto operativo: va trattato come parte del flusso economico e documentale della
						spedizione.
					</p>
				</div>

				<div class="mt-[18px] grid gap-[14px] desktop:grid-cols-2">
					<article
						v-for="step in flowSteps"
						:key="step.step"
						class="rounded-[22px] border border-[#EDF2F5] bg-[#F8FBFC] px-[16px] py-[16px]">
						<div class="flex items-center gap-[10px]">
							<span
								class="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-[0.8125rem] font-bold text-white">
								{{ step.step }}
							</span>
							<h3 class="text-[1rem] font-semibold text-[#1F2937]">{{ step.title }}</h3>
						</div>
						<p class="mt-[10px] text-[0.875rem] leading-[1.65] text-[#5B6670]">
							{{ step.description }}
						</p>
					</article>
				</div>
			</section>

			<section class="grid gap-[16px] desktop:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
				<article
					class="rounded-[24px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_12px_26px_rgba(15,23,42,0.04)] desktop:px-[22px] desktop:py-[22px]">
					<p class="sf-section-kicker">Requisiti e limiti</p>
					<h2 class="mt-[8px] text-[1.25rem] font-semibold tracking-[-0.02em] text-[#1F2937]">Controlli da fare prima della conferma</h2>
					<ul class="mt-[14px] space-y-[10px]">
						<li v-for="item in guardrails" :key="item" class="flex items-start gap-[10px] text-[0.875rem] leading-[1.6] text-[#5B6670]">
							<span class="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--color-brand-primary)]"></span>
							<span>{{ item }}</span>
						</li>
					</ul>
				</article>

				<article
					class="rounded-[24px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_12px_26px_rgba(15,23,42,0.04)] desktop:px-[22px] desktop:py-[22px]">
					<p class="sf-section-kicker">Dati da raccogliere</p>
					<h2 class="mt-[8px] text-[1.25rem] font-semibold tracking-[-0.02em] text-[#1F2937]">Checklist checkout</h2>
					<ul class="mt-[14px] space-y-[8px]">
						<li
							v-for="item in checkoutChecklist"
							:key="item"
							class="rounded-[16px] border border-[#EDF2F5] bg-[#F8FBFC] px-[12px] py-[10px] text-[0.875rem] leading-[1.55] text-[#5B6670]">
							{{ item }}
						</li>
					</ul>
				</article>
			</section>

			<section
				class="rounded-[28px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_14px_30px_rgba(15,23,42,0.05)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">Casi tipici</p>
					<h2 class="text-[1.4rem] font-semibold tracking-[-0.03em] text-[#1F2937] desktop:text-[2rem]">
						Cosa succede se qualcosa va fuori binario
					</h2>
				</div>

				<div class="mt-[18px] grid gap-[14px] desktop:grid-cols-3">
					<article
						v-for="scenario in scenarioCards"
						:key="scenario.title"
						class="rounded-[22px] border border-[#EDF2F5] bg-[#F8FBFC] px-[16px] py-[16px]">
						<h3 class="text-[1rem] font-semibold text-[#1F2937]">{{ scenario.title }}</h3>
						<p class="mt-[10px] text-[0.875rem] leading-[1.65] text-[#5B6670]">
							{{ scenario.description }}
						</p>
					</article>
				</div>
			</section>

			<section
				class="rounded-[28px] border border-[#E9EEF2] bg-white px-[18px] py-[18px] shadow-[0_14px_30px_rgba(15,23,42,0.05)] desktop:px-[24px] desktop:py-[24px]">
				<div class="sf-page-intro">
					<p class="sf-section-kicker">FAQ</p>
					<h2 class="text-[1.4rem] font-semibold tracking-[-0.03em] text-[#1F2937] desktop:text-[2rem]">
						Domande frequenti sul contrassegno
					</h2>
				</div>

				<div class="mt-[18px] grid gap-[14px] desktop:grid-cols-2">
					<article v-for="faq in faqs" :key="faq.title" class="rounded-[22px] border border-[#EDF2F5] bg-[#F8FBFC] px-[16px] py-[16px]">
						<h3 class="text-[1rem] font-semibold text-[#1F2937]">{{ faq.title }}</h3>
						<p class="mt-[10px] text-[0.875rem] leading-[1.65] text-[#5B6670]">
							{{ faq.text }}
						</p>
					</article>
				</div>
			</section>

			<section
				class="rounded-[26px] border border-[#DCE8EC] bg-[linear-gradient(135deg,#0f5f6d_0%,#0c4853_100%)] px-[20px] py-[20px] text-white shadow-[0_18px_40px_rgba(9,88,102,0.18)] desktop:px-[28px] desktop:py-[28px]">
				<div class="flex flex-col gap-[16px] desktop:flex-row desktop:items-center desktop:justify-between">
					<div class="max-w-[60ch]">
						<p class="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-white/70">Prossimo passo</p>
						<h2 class="mt-[8px] text-[1.35rem] font-semibold tracking-[-0.03em] desktop:text-[1.8rem]">
							Se vuoi usare il contrassegno, conviene validare subito pricing e dati richiesti.
						</h2>
						<p class="mt-[10px] text-[0.9rem] leading-[1.65] text-white/80">
							Parti dal preventivo per vedere il costo reale del servizio, oppure scrivici se devi gestire un flusso ricorrente o un caso
							operativo fuori standard.
						</p>
					</div>

					<div class="flex flex-wrap gap-[10px]">
						<NuxtLink
							to="/preventivo"
							class="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-[18px] text-[0.875rem] font-semibold text-[#0B5360] transition-transform duration-200 hover:-translate-y-[1px]">
							Calcola il preventivo
						</NuxtLink>
						<NuxtLink
							to="/contatti"
							class="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/30 px-[18px] text-[0.875rem] font-semibold text-white transition-colors duration-200 hover:bg-white/10">
							Contattaci
						</NuxtLink>
					</div>
				</div>
			</section>
		</div>
	</section>
</template>

<style scoped>
.service-hero-card {
	background:
		radial-gradient(circle at top right, rgba(228, 66, 3, 0.16), transparent 30%),
		linear-gradient(180deg, rgba(9, 88, 102, 0.07) 0%, rgba(9, 88, 102, 0.02) 100%);
}
</style>
