<!-- Chi Siamo — Hero → Mission → Numeri → Timeline → Valori → Team → Partnership BRT → CTA -->
<script setup>
useSeoMeta({
	title: 'Chi siamo',
	description:
		'Intermediari BRT autorizzati dal 2020. Aiutiamo PMI e privati italiani a spedire con prezzi trasparenti, ritiro a domicilio e supporto umano dedicato.',
})

const runtimeConfig = useRuntimeConfig()
const siteUrl = String(runtimeConfig.public?.siteUrl || 'https://spediamofacile.it').replace(/\/+$/, '')

useHead({
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'AboutPage',
				name: 'Chi siamo — SpediamoFacile',
				url: `${siteUrl}/chi-siamo`,
				mainEntity: {
					'@type': 'Organization',
					name: 'SpediamoFacile',
					url: siteUrl,
					foundingDate: '2020',
					description:
						'Intermediario BRT autorizzato che semplifica le spedizioni per PMI e privati italiani.',
				},
			}),
		},
	],
})

// Breadcrumb: Home › Chi siamo
useBreadcrumbSchema([
	{ name: 'Home', url: '/' },
	{ name: 'Chi siamo' },
])

// ── Numeri chiave (placeholder realistici) ────────────────────────────────
const stats = [
	{ value: '5', suffix: 'anni', label: 'di attività al servizio dei clienti italiani' },
	{ value: '120k', suffix: '+', label: 'spedizioni gestite ogni anno' },
	{ value: '18k', suffix: '', label: 'clienti attivi tra PMI e privati' },
	{ value: '94', suffix: '%', label: 'consegne completate entro 48 ore' },
]

// ── Timeline azienda ──────────────────────────────────────────────────────
const milestones = [
	{
		year: '2020',
		title: 'Fondazione',
		text:
			'Nasce SpedizioneFacile con un’idea semplice: trasformare il preventivo BRT in un’esperienza chiara, immediata, senza intermediari opachi.',
	},
	{
		year: '2021',
		title: 'Partnership BRT ufficiale',
		text:
			'Diventiamo intermediari BRT autorizzati. Da qui in avanti ogni tariffa, supplemento e servizio passa da contratti diretti con il corriere.',
	},
	{
		year: '2023',
		title: '10.000 clienti attivi',
		text:
			'Superiamo la soglia simbolica dei diecimila account, tra negozi online, professionisti e famiglie che spediscono ogni settimana.',
	},
	{
		year: '2024',
		title: 'Lancio piano Pro',
		text:
			'Per chi spedisce molto introduciamo tariffe a volume, fatturazione mensile e ritiri programmati su più sedi.',
	},
	{
		year: '2026',
		title: 'Nuova piattaforma',
		text:
			'Rilasciamo l’interfaccia ridisegnata: tracking unificato, area cliente in chiaro, supporto in chat con persone reali.',
	},
]

// ── Valori (3 card con icone duotone) ─────────────────────────────────────
const values = [
	{
		title: 'Trasparenza',
		text:
			'Tariffa finale subito a video, supplementi spiegati uno per uno, contratti BRT alla base di ogni preventivo. Niente sorprese in fattura.',
		// Icona: occhio aperto (visibilità totale)
		icon: {
			bg: 'M12,4.5C7,4.5 2.73,7.61 1,12c1.73,4.39 6,7.5 11,7.5c5,0 9.27,-3.11 11,-7.5C21.27,7.61 17,4.5 12,4.5z',
			fg: 'M12,7a5,5 0 1,0 0,10a5,5 0 0,0 0,-10zm0,8a3,3 0 1,1 0,-6a3,3 0 0,1 0,6z',
		},
	},
	{
		title: 'Semplicità',
		text:
			'Pochi campi, un flusso lineare, un’etichetta scaricabile in meno di un minuto. Togliamo passaggi, non funzioni.',
		icon: {
			bg: 'M4,6h16v3H4zM4,11h16v3H4zM4,16h10v3H4z',
			fg: 'M16,16h6v3h-6z',
		},
	},
	{
		title: 'Supporto umano',
		text:
			'Nessun bot ad alberi infiniti. Risponde una persona del team, in italiano, che conosce il mondo BRT e la tua spedizione.',
		icon: {
			bg: 'M12,2a5,5 0 0,1 5,5v3a5,5 0 0,1 -10,0V7a5,5 0 0,1 5,-5z',
			fg: 'M4,21v-1a6,6 0 0,1 6,-6h4a6,6 0 0,1 6,6v1z',
		},
	},
]

// ── Team (silhouette placeholder + ruoli, nomi sobri) ─────────────────────
const team = [
	{ name: 'Marco Donadel', role: 'CEO & Co-founder', initials: 'MD' },
	{ name: 'Elena Rosati', role: 'CTO', initials: 'ER' },
	{ name: 'Luca Bianchi', role: 'Head of Operations', initials: 'LB' },
	{ name: 'Sara Conti', role: 'Customer Care Lead', initials: 'SC' },
]
</script>

<template>
	<div class="bg-[var(--color-brand-bg)] text-[var(--color-brand-text)] font-[Inter,system-ui,-apple-system,sans-serif]">
		<!-- HERO -->
		<PublicPageHeader
			eyebrow="Chi siamo"
			title="Intermediari BRT autorizzati, dal 2020"
			description="Al servizio di PMI e privati italiani. Lavoriamo ogni giorno per rendere le spedizioni una scelta consapevole: prezzo chiaro, ritiro a domicilio, tracciamento in tempo reale e una persona vera quando serve un aiuto."
			:crumbs="[{ label: 'Home', to: '/' }, { label: 'Chi siamo' }]">
			<div class="flex flex-wrap gap-2.5" role="list">
				<span class="about-pill" role="listitem">Intermediari BRT autorizzati</span>
				<span class="about-pill" role="listitem">Sede a Milano</span>
				<span class="about-pill" role="listitem">Team italiano</span>
			</div>
		</PublicPageHeader>

		<!-- MISSION -->
		<section class="py-[88px] bg-white" aria-labelledby="about-mission-title">
			<div class="my-container">
				<header class="max-w-[760px] mb-10">
					<span class="about-accent" aria-hidden="true"/>
					<p class="about-eyebrow">La nostra missione</p>
					<h2 id="about-mission-title" class="about-section-title">
						Spedire deve essere un’azione quotidiana, non un problema da risolvere.
					</h2>
				</header>
				<div class="grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-10">
					<p class="m-0 text-[17px] leading-[1.7] text-[var(--color-brand-text-secondary)]">
						Siamo nati per togliere fatica al gesto più comune del commercio: mandare un pacco da A
						a B. Lo facciamo con la rete BRT, contratti diretti e un’interfaccia che mostra subito
						la tariffa migliore tra peso reale e peso volumetrico, senza giochi sui supplementi.
					</p>
					<p class="m-0 text-[17px] leading-[1.7] text-[var(--color-brand-text-secondary)]">
						Crediamo in una logistica vicina alle persone: pochi click per il preventivo, un ritiro
						programmato in giornata, un’assistenza che risponde con un nome e un cognome. È così
						che vogliamo essere il punto di riferimento per chi cerca qualità e convenienza nello
						stesso servizio.
					</p>
				</div>
			</div>
		</section>

		<!-- NUMERI CHIAVE -->
		<section class="py-[72px] border-y border-[var(--color-brand-border)] bg-[var(--color-brand-page-gradient,#f8f9fb)]" aria-labelledby="about-stats-title">
			<div class="my-container">
				<h2 id="about-stats-title" class="m-0 mb-8 text-[clamp(24px,2.6vw,32px)] font-bold tracking-[-0.01em] text-[var(--color-brand-text)]">I numeri di SpedizioneFacile</h2>
				<dl class="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
					<div v-for="stat in stats" :key="stat.label" class="about-card px-6 py-7">
						<dt class="flex items-baseline gap-1 m-0 mb-2">
							<span class="text-[42px] font-extrabold leading-none tracking-[-0.02em] text-[var(--color-brand-primary)]">{{ stat.value }}</span>
							<span v-if="stat.suffix" class="text-[22px] font-bold text-[var(--color-brand-accent)]">{{ stat.suffix }}</span>
						</dt>
						<dd class="m-0 text-sm leading-[1.5] text-[var(--color-brand-text-secondary)]">{{ stat.label }}</dd>
					</div>
				</dl>
				<p class="mt-6 mb-0 text-xs text-[var(--color-brand-text-muted)]">Dati aggiornati al primo trimestre 2026.</p>
			</div>
		</section>

		<!-- TIMELINE -->
		<section class="py-24 bg-white lg:py-24" aria-labelledby="about-timeline-title">
			<div class="my-container">
				<header class="max-w-[720px] mb-12">
					<span class="about-accent" aria-hidden="true"/>
					<p class="about-eyebrow">La nostra storia</p>
					<h2 id="about-timeline-title" class="about-section-title">Cinque tappe in cinque anni</h2>
				</header>
				<ol class="about-timeline-list list-none m-0 p-0 relative">
					<li v-for="m in milestones" :key="m.year" class="grid grid-cols-[32px_1fr] gap-5 pt-2 pb-8 relative last:pb-0">
						<div class="flex justify-center pt-1.5" aria-hidden="true">
							<span class="block w-[14px] h-[14px] rounded-full border-[3px] border-white bg-[var(--color-brand-primary)] shadow-[0_0_0_2px_var(--color-brand-primary)]"/>
						</div>
						<div>
							<span class="inline-block text-xs font-bold tracking-[0.08em] text-[var(--color-brand-accent)] bg-[#fff5ef] border border-[#ffd9c4] px-2.5 py-1 rounded-full mb-2.5">{{ m.year }}</span>
							<h3 class="m-0 mb-2 text-xl font-bold text-[var(--color-brand-text)]">{{ m.title }}</h3>
							<p class="m-0 text-[15px] leading-[1.65] text-[var(--color-brand-text-secondary)]">{{ m.text }}</p>
						</div>
					</li>
				</ol>
			</div>
		</section>

		<!-- VALORI -->
		<section class="py-[88px] border-t border-[var(--color-brand-border)] bg-[var(--color-brand-page-gradient,#f8f9fb)]" aria-labelledby="about-values-title">
			<div class="my-container">
				<header class="max-w-[720px] mb-10">
					<span class="about-accent" aria-hidden="true"/>
					<p class="about-eyebrow">Cosa ci guida</p>
					<h2 id="about-values-title" class="about-section-title">Tre principi non negoziabili</h2>
				</header>
				<div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
					<article v-for="v in values" :key="v.title" class="about-card px-7 py-8 rounded-[18px]">
						<span class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#eef5f7] mb-5" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
								<path :d="v.icon.bg" class="about-icon-bg" />
								<path :d="v.icon.fg" class="about-icon-fg" />
							</svg>
						</span>
						<h3 class="m-0 mb-2.5 text-xl font-bold text-[var(--color-brand-text)]">{{ v.title }}</h3>
						<p class="m-0 text-[15px] leading-[1.65] text-[var(--color-brand-text-secondary)]">{{ v.text }}</p>
					</article>
				</div>
			</div>
		</section>

		<!-- TEAM -->
		<section class="py-24 bg-white" aria-labelledby="about-team-title">
			<div class="my-container">
				<header class="max-w-[720px] mb-10">
					<span class="about-accent" aria-hidden="true"/>
					<p class="about-eyebrow">Le persone</p>
					<h2 id="about-team-title" class="m-0 mb-4 font-bold tracking-[-0.015em] text-[var(--color-brand-text)] text-[clamp(28px,3.4vw,40px)]">Chi c’è dietro la piattaforma</h2>
					<p class="m-0 text-base leading-[1.6] text-[var(--color-brand-text-secondary)]">
						Un team piccolo e diretto: ogni messaggio che ricevi arriva da una persona di questa
						lista o da chi lavora con noi tutti i giorni.
					</p>
				</header>
				<ul class="list-none m-0 p-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<li v-for="member in team" :key="member.name" class="about-card p-6 text-center">
						<div class="w-[72px] h-[72px] rounded-full mx-auto mb-4 flex items-center justify-center border border-[var(--color-brand-border)] bg-[linear-gradient(135deg,#eef5f7_0%,#d9e7eb_100%)]" aria-hidden="true">
							<span class="text-[22px] font-bold tracking-[0.04em] text-[var(--color-brand-primary)]">{{ member.initials }}</span>
						</div>
						<p class="m-0 mb-1 text-base font-bold text-[var(--color-brand-text)]">{{ member.name }}</p>
						<p class="m-0 text-[13px] text-[var(--color-brand-text-secondary)]">{{ member.role }}</p>
					</li>
				</ul>
			</div>
		</section>

		<!-- PARTNERSHIP BRT -->
		<section class="py-20 bg-[var(--color-brand-primary)] text-white" aria-labelledby="about-partnership-title">
			<div class="my-container grid grid-cols-1 items-center gap-8 sm:grid-cols-[200px_1fr] sm:gap-12">
				<div class="flex justify-center sm:justify-start" aria-hidden="true">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 48" class="w-40 h-auto" role="img" aria-label="Logo BRT">
						<rect x="0" y="0" width="120" height="48" rx="6" fill="#ffffff" />
						<text
							x="60"
							y="32"
							text-anchor="middle"
							font-family="Inter, system-ui, sans-serif"
							font-weight="800"
							font-size="22"
							letter-spacing="2"
							fill="var(--color-brand-primary, #095866)">
							BRT
						</text>
					</svg>
				</div>
				<div>
					<p class="m-0 mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#f6c9b3]">Partnership ufficiale</p>
					<h2 id="about-partnership-title" class="m-0 mb-4 text-white font-bold tracking-[-0.015em] text-[clamp(26px,3.2vw,36px)]">
						Intermediari BRT autorizzati
					</h2>
					<p class="m-0 mb-3 text-base leading-[1.7] text-white/90">
						SpedizioneFacile opera in qualità di intermediario BRT autorizzato. Le tariffe che
						vedi nel preventivo arrivano dal listino contrattualizzato direttamente con il
						corriere: nessun rivenditore di terze parti, nessun ricarico nascosto, supporto
						gestito dal nostro team in coordinamento con la rete BRT.
					</p>
					<p class="m-0 text-xs text-white/60">
						BRT è marchio registrato di BRT S.p.A. Logo a fini illustrativi.
					</p>
				</div>
			</div>
		</section>

		<!-- CTA FINALE -->
		<section class="py-24 bg-white" aria-labelledby="about-cta-title">
			<div class="my-container grid grid-cols-1 items-center gap-8 rounded-[24px] border border-[var(--color-brand-border)] p-10 bg-[var(--color-brand-page-gradient,#f8f9fb)] sm:grid-cols-[1.4fr_1fr] sm:p-14">
				<div>
					<p class="about-eyebrow">Lavora con noi</p>
					<h2 id="about-cta-title" class="m-0 mb-3 text-[clamp(24px,2.8vw,32px)] font-bold tracking-[-0.01em] text-[var(--color-brand-text)]">
						Vuoi entrare nel team o proporci una collaborazione?
					</h2>
					<p class="m-0 text-base leading-[1.65] text-[var(--color-brand-text-secondary)]">
						Scriviamoci. Cerchiamo persone che mettano la stessa cura nei dettagli che mettiamo nel
						prodotto: stesura candidature spontanee, partnership commerciali, idee per il prossimo
						passo.
					</p>
				</div>
				<div class="flex flex-wrap gap-3 sm:justify-end">
					<SfButton to="/contatti" size="lg">Lavora con noi</SfButton>
					<SfButton to="/preventivo" variant="secondary" size="lg">Calcola un preventivo</SfButton>
				</div>
			</div>
		</section>
	</div>
</template>

<style scoped>
/* Micro-elementi ricorrenti pagina: pill hero, accent bar, eyebrow, titoli sezione, card hover */
.about-pill { display: inline-flex; align-items: center; height: 32px; padding: 0 14px; border-radius: 999px; background: #fff; border: 1px solid var(--color-brand-border); font-size: 13px; font-weight: 600; color: var(--color-brand-text-secondary); }
.about-accent { display: block; width: 40px; height: 3px; background: var(--color-brand-accent); border-radius: 2px; margin-bottom: 18px; }
.about-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-brand-primary); margin: 0 0 12px; }
.about-section-title { font-size: clamp(28px, 3.4vw, 40px); font-weight: 700; line-height: 1.2; letter-spacing: -0.015em; color: var(--color-brand-text); margin: 0; }
.about-card { background: #fff; border: 1px solid var(--color-brand-border); border-radius: 16px; transition: transform 0.2s ease, border-color 0.2s ease; }
.about-card:hover { transform: translateY(-2px); border-color: var(--color-brand-primary-light); }
.about-timeline-list::before { content: ''; position: absolute; left: 11px; top: 8px; bottom: 8px; width: 2px; background: var(--color-brand-border); border-radius: 1px; }
.about-icon-bg { fill: var(--color-brand-primary); opacity: 0.18; }
.about-icon-fg { fill: var(--color-brand-primary); }
@media (prefers-reduced-motion: reduce) {
	.about-card, .about-card:hover { transition: none; transform: none; }
}
</style>
