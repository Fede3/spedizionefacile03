<script setup>
// Pagina Contatti — redesign editoriale (hero + strip canali + form centrato + FAQ grid + quick next).

useSeoMeta({
	title: 'Contatti - Assistenza e Supporto',
	ogTitle: 'Contatti',
	description: 'Hai bisogno di aiuto? Contatta il team di SpediamoFacile per assistenza sulle tue spedizioni, preventivi personalizzati o informazioni sui nostri servizi.',
	ogDescription: 'Contatta SpediamoFacile per assistenza e supporto sulle tue spedizioni.',
})

useHead({
	script: [{
		type: 'application/ld+json',
		innerHTML: JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'ContactPage',
			name: 'Contatti SpediamoFacile',
			url: 'https://spediamofacile.it/contatti',
			mainEntity: {
				'@type': 'Organization',
				name: 'SpediamoFacile',
				url: 'https://spediamofacile.it',
				contactPoint: {
					'@type': 'ContactPoint',
					contactType: 'customer service',
					availableLanguage: 'Italian',
				},
			},
		}),
	}],
})

// Breadcrumb: Home › Contatti
useBreadcrumbSchema([
	{ name: 'Home', url: '/' },
	{ name: 'Contatti' },
])

const sanctum = useSanctumClient()

const contactForm = ref({
	name: '',
	surname: '',
	email: '',
	telephone_number: '',
	message: '',
})

const isSubmitting = ref(false)
const submitSuccess = ref(false)
const submitError = ref(null)

// Cloudflare Turnstile (CAPTCHA) — gate frontend anti-bot.
const turnstile = useTurnstile()

const resetForm = () => {
	contactForm.value = {
		name: '',
		surname: '',
		email: '',
		telephone_number: '',
		message: '',
	}
	turnstile.reset()
}

const handleSubmit = async () => {
	submitError.value = null
	if (!turnstile.isReady.value) {
		submitError.value = 'Conferma di non essere un bot per inviare il messaggio.'
		return
	}
	isSubmitting.value = true

	try {
		await sanctum('/sanctum/csrf-cookie')
		await sanctum('/api/contact', {
			method: 'POST',
			body: { ...contactForm.value, ...turnstile.payload() },
		})
		submitSuccess.value = true
		resetForm()
	} catch (error) {
		const data = error?.response?._data || error?.data
		if (data?.errors) {
			const firstError = Object.values(data.errors)[0]
			submitError.value = Array.isArray(firstError) ? firstError[0] : firstError
		} else {
			submitError.value = data?.message || "Errore durante l'invio. Riprova."
		}
		turnstile.reset()
	} finally {
		isSubmitting.value = false
	}
}

// Strip canali: 4 tessere icona+label+valore (email, telefono, sede, orari)
const channels = [
	{
		label: 'Email',
		value: 'info@spediamofacile.it',
		href: 'mailto:info@spediamofacile.it',
		icon: 'M20,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6A2,2 0 0,0 20,4M20,8L12,13L4,8V6L12,11L20,6V8Z',
	},
	{
		label: 'Telefono',
		value: '+39 02 8295 4130',
		href: 'tel:+390282954130',
		icon: 'M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z',
	},
	{
		label: 'Sede',
		value: 'Via Torino 2, Milano (MI)',
		href: 'https://maps.google.com/?q=Via+Torino+2,+Milano',
		icon: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z',
	},
	{
		label: 'Orari',
		value: 'Lun-Ven 9:00-18:00',
		href: null,
		icon: 'M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z',
	},
]

// Quick actions: 3 strip orizzontali (preventivo, tracking, guide) come CTA finali
const quickActions = [
	{
		title: 'Calcola un preventivo',
		text: 'Parti dal prezzo in 30 secondi, senza chiamare.',
		href: '/preventivo',
		icon: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2a3 3 0 0 0 6 0h6a3 3 0 0 0 6 0h2v-5l-3-4Zm-2 9.5a1.5 1.5 0 1 1 .001-2.999A1.5 1.5 0 0 1 18 17.5Zm-12 0a1.5 1.5 0 1 1 .001-2.999A1.5 1.5 0 0 1 6 17.5ZM19.5 12H17V9.5h2.5L21 12h-1.5Z',
	},
	{
		title: 'Traccia una spedizione',
		text: 'Stato BRT in tempo reale con il numero.',
		href: '/traccia-spedizione',
		icon: 'M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3Z',
	},
	{
		title: 'Leggi le guide',
		text: 'Imballaggio, documenti, normative: risposte veloci.',
		href: '/guide',
		icon: 'M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h11l5-5V5c0-1.1-.9-2-2-2Zm0 12h-4v4H5V5h14v10Z',
	},
]
</script>

<template>
	<div class="min-h-screen bg-page-gradient pb-16 [&>section+section]:mt-8">
		<!-- ── HERO editoriale: accent bar + titolo + claim + pill canali rapidi ── -->
		<PublicPageHeader
			eyebrow="Assistenza e supporto"
			title="Parla con noi"
			description="Rispondiamo in giornata a email, telefono o messaggio. Nessun bot, solo persone che conoscono il mondo BRT."
			:crumbs="[{ label: 'Home', to: '/' }, { label: 'Contatti' }]">
			<div class="mt-2 flex flex-wrap gap-x-6 gap-y-3">
				<a
					href="mailto:info@spediamofacile.it"
					class="inline-flex items-center gap-2.5 rounded-pill border border-brand-primary/20 bg-brand-card px-[18px] py-2.5 text-[0.9rem] text-brand-primary no-underline transition hover:-translate-y-px hover:border-brand-accent hover:shadow-[0_6px_16px_rgba(9,88,102,0.08)]">
					<span class="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-brand-text-secondary">Email</span>
					<span class="font-bold text-brand-accent" aria-hidden="true">→</span>
					<span class="font-semibold text-brand-primary">info@spediamofacile.it</span>
				</a>
				<a
					href="tel:+390282954130"
					class="inline-flex items-center gap-2.5 rounded-pill border border-brand-primary/20 bg-brand-card px-[18px] py-2.5 text-[0.9rem] text-brand-primary no-underline transition hover:-translate-y-px hover:border-brand-accent hover:shadow-[0_6px_16px_rgba(9,88,102,0.08)]">
					<span class="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-brand-text-secondary">Telefono</span>
					<span class="font-bold text-brand-accent" aria-hidden="true">→</span>
					<span class="font-semibold text-brand-primary">+39 02 8295 4130</span>
				</a>
				<span class="inline-flex cursor-default items-center gap-2.5 rounded-pill border border-brand-primary/20 bg-brand-card px-[18px] py-2.5 text-[0.9rem] text-brand-primary">
					<span class="text-[0.72rem] font-bold uppercase tracking-[0.08em] text-brand-text-secondary">Sede</span>
					<span class="font-bold text-brand-accent" aria-hidden="true">→</span>
					<span class="font-semibold text-brand-primary">Milano (MI)</span>
				</span>
			</div>
		</PublicPageHeader>

		<!-- ── STRIP canali: 4 card icona con valore ── -->
		<section aria-label="Canali di contatto">
			<div class="my-container">
				<div class="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
					<component
						:is="channel.href ? 'a' : 'div'"
						v-for="channel in channels"
						:key="channel.label"
						:href="channel.href || undefined"
						:target="channel.href && channel.href.startsWith('http') ? '_blank' : undefined"
						:rel="channel.href && channel.href.startsWith('http') ? 'noopener noreferrer' : undefined"
						class="grid gap-2 rounded-card border border-brand-primary/12 bg-brand-card p-5 text-inherit no-underline shadow-[0_2px_8px_rgba(9,88,102,0.04)] transition hover:[&:where(a)]:-translate-y-0.5 hover:[&:where(a)]:border-brand-primary/30 hover:[&:where(a)]:shadow-[0_8px_24px_rgba(9,88,102,0.08)]">
						<span class="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-brand-primary/15 to-brand-primary/5 text-brand-primary" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
								<path :d="channel.icon" />
							</svg>
						</span>
						<span class="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-brand-text-secondary">{{ channel.label }}</span>
						<span class="break-words text-[0.9375rem] font-semibold text-brand-primary">{{ channel.value }}</span>
					</component>
				</div>
			</div>
		</section>

		<!-- ── FORM centrato (max 640px) ── -->
		<section aria-labelledby="contact-form-title">
			<div class="my-container">
				<div v-if="submitSuccess" class="grid w-full justify-items-center gap-3 rounded-[20px] border border-brand-primary/12 bg-brand-card p-8 text-center shadow-[0_4px_16px_rgba(9,88,102,0.05),0_12px_32px_rgba(9,88,102,0.04)] md:px-10 md:py-9">
					<div class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 text-brand-primary" aria-hidden="true">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z" />
						</svg>
					</div>
					<h2 class="m-0 font-display text-[1.625rem] font-extrabold leading-[1.1] tracking-[-0.025em] text-brand-primary">Messaggio inviato</h2>
					<p class="m-0 max-w-[44ch] text-[0.95rem] leading-[1.55] text-brand-text-secondary">Ti risponderemo in giornata. Nel frattempo puoi tracciare una spedizione o calcolare un preventivo.</p>
					<SfButton @click="submitSuccess = false">
						Invia un altro messaggio
					</SfButton>
				</div>

				<div v-else class="w-full rounded-[20px] border border-brand-primary/12 bg-brand-card p-8 shadow-[0_4px_16px_rgba(9,88,102,0.05),0_12px_32px_rgba(9,88,102,0.04)] md:px-10 md:py-9">
					<header class="mb-6 grid justify-items-center gap-2 text-center">
						<span class="block h-[3px] w-12 rounded-pill bg-brand-accent" aria-hidden="true"/>
						<h2 id="contact-form-title" class="m-0 font-display text-[1.625rem] font-extrabold leading-[1.1] tracking-[-0.025em] text-brand-primary">Scrivici</h2>
						<p class="m-0 max-w-[48ch] text-[0.95rem] leading-[1.55] text-brand-text-secondary">Descrivi la richiesta con peso, tratta e urgenza: piu contesto, risposta piu precisa.</p>
					</header>

					<form class="space-y-6" novalidate @submit.prevent="handleSubmit">
						<div class="grid gap-4 md:grid-cols-2">
							<SfFormGroup label="Nome">
								<SfInput
									id="cf-name"
									v-model="contactForm.name"
									type="text"
									required
									autocomplete="given-name"
									placeholder="Es. Mario" />
							</SfFormGroup>
							<SfFormGroup label="Cognome">
								<SfInput
									id="cf-surname"
									v-model="contactForm.surname"
									type="text"
									required
									autocomplete="family-name"
									placeholder="Es. Rossi" />
							</SfFormGroup>
						</div>

						<div class="grid gap-4 md:grid-cols-2">
							<SfFormGroup label="Email">
								<SfInput
									id="cf-email"
									v-model="contactForm.email"
									type="email"
									required
									autocomplete="email"
									placeholder="nome@email.it" />
							</SfFormGroup>
							<SfFormGroup label="Telefono" hint="(opzionale)">
								<SfInput
									id="cf-phone"
									v-model="contactForm.telephone_number"
									type="tel"
									autocomplete="tel"
									placeholder="+39 ..." />
							</SfFormGroup>
						</div>

						<SfFormGroup label="Messaggio" hint='(per reclami: indica "Reclamo" e numero spedizione BRT)'>
							<SfTextarea
								id="cf-message"
								v-model="contactForm.message"
								required
								:rows="6"
								:maxlength="1500"
								placeholder='Racconta la richiesta con dettagli utili (tratta, peso, urgenza). Per un reclamo: inizia con "Reclamo" e allega numero spedizione.' />
						</SfFormGroup>

						<div class="mt-1 flex justify-center" aria-label="Verifica anti-bot">
							<NuxtTurnstile v-model="turnstile.token.value" @expired="turnstile.onExpire" @error="turnstile.onError" />
						</div>

						<p
							v-if="submitError"
							class="m-0 rounded-control border border-brand-error/30 bg-brand-error/10 p-3 text-sm font-semibold text-brand-error"
							role="alert">
							{{ submitError }}
						</p>

						<SfButton
							type="submit"
							size="lg"
							class="mt-1 w-full justify-center md:ml-auto md:w-auto md:min-w-[220px]"
							:loading="isSubmitting"
							:disabled="!turnstile.isReady.value">
							<span v-if="!isSubmitting">Invia richiesta</span>
							<span v-else>Invio in corso...</span>
						</SfButton>
					</form>
				</div>
			</div>
		</section>

		<!-- ── FAQ grid editoriale ── -->
		<section aria-labelledby="contact-faq-title">
			<div class="my-container">
				<header class="mb-6 grid justify-items-center gap-2.5 text-center">
					<span class="block h-[3px] w-12 rounded-pill bg-brand-accent" aria-hidden="true"/>
					<h2 id="contact-faq-title" class="m-0 font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.025em] text-brand-primary">Domande frequenti</h2>
					<p class="m-0 max-w-[56ch] text-[0.95rem] text-brand-text-secondary">Prima di scriverci, dai un'occhiata: molte risposte sono qui.</p>
				</header>
				<ContactFAQ />
			</div>
		</section>

		<!-- ── Quick next: 3 strip orizzontali per azione rapida ── -->
		<section aria-label="Prossime azioni utili">
			<div class="my-container">
				<div class="grid gap-3">
					<NuxtLink
						v-for="action in quickActions"
						:key="action.href"
						:to="action.href"
						class="group grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-card border border-brand-primary/12 bg-brand-card px-5 py-4 text-inherit no-underline transition hover:-translate-y-px hover:border-brand-accent hover:shadow-[0_8px_20px_rgba(9,88,102,0.08)]">
						<span class="inline-flex h-10 w-10 items-center justify-center rounded-control bg-gradient-to-br from-brand-primary/15 to-brand-primary/5 text-brand-primary" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
								<path :d="action.icon" />
							</svg>
						</span>
						<span class="grid gap-0.5 text-center">
							<span class="text-[0.9375rem] font-bold text-brand-primary">{{ action.title }}</span>
							<span class="text-[0.82rem] text-brand-text-secondary">{{ action.text }}</span>
						</span>
						<span class="inline-flex items-center justify-center text-brand-accent transition group-hover:translate-x-[3px]" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M5 12h14" />
								<path d="m12 5 7 7-7 7" />
							</svg>
						</span>
					</NuxtLink>
				</div>
			</div>
		</section>
	</div>
</template>
