<script setup>
// Pagina Contatti — redesign editoriale (hero + strip canali + form centrato + FAQ grid + quick next)
useSeoMeta({
	title: 'Contatti',
	description: 'Hai bisogno di aiuto? Contatta il team di SpediamoFacile per assistenza sulle tue spedizioni, preventivi personalizzati o informazioni sui nostri servizi.',
})

const runtimeConfig = useRuntimeConfig()
const siteUrl = String(runtimeConfig.public?.siteUrl || 'https://spediamofacile.it').replace(/\/+$/, '')

useHead({
	script: [{
		type: 'application/ld+json',
		innerHTML: JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'ContactPage',
			name: 'Contatti SpediamoFacile',
			url: `${siteUrl}/contatti`,
			mainEntity: {
				'@type': 'Organization',
				name: 'SpediamoFacile',
				url: siteUrl,
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
	<div class="min-h-screen pb-16 bg-[var(--gradient-page-surface,linear-gradient(180deg,#fff_0%,#f6fafb_100%))]">
		<!-- HERO editoriale: titolo + claim + pill canali rapidi -->
		<PublicPageHeader
			eyebrow="Assistenza e supporto"
			title="Parla con noi"
			description="Rispondiamo in giornata a email, telefono o messaggio. Nessun bot, solo persone che conoscono il mondo BRT."
			:crumbs="[{ label: 'Home', to: '/' }, { label: 'Contatti' }]">
			<div class="mt-2 flex flex-wrap gap-x-6 gap-y-3">
				<a href="mailto:info@spediamofacile.it" class="contatti-pill">
					<span class="contatti-pill__label">Email</span>
					<span class="contatti-pill__arrow" aria-hidden="true">→</span>
					<span class="contatti-pill__value">info@spediamofacile.it</span>
				</a>
				<a href="tel:+390282954130" class="contatti-pill">
					<span class="contatti-pill__label">Telefono</span>
					<span class="contatti-pill__arrow" aria-hidden="true">→</span>
					<span class="contatti-pill__value">+39 02 8295 4130</span>
				</a>
				<span class="contatti-pill is-static">
					<span class="contatti-pill__label">Sede</span>
					<span class="contatti-pill__arrow" aria-hidden="true">→</span>
					<span class="contatti-pill__value">Milano (MI)</span>
				</span>
			</div>
		</PublicPageHeader>

		<!-- STRIP canali: 4 card icona con valore -->
		<section class="mt-8" aria-label="Canali di contatto">
			<div class="my-container">
				<div class="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
					<component
						:is="channel.href ? 'a' : 'div'"
						v-for="channel in channels"
						:key="channel.label"
						:href="channel.href || undefined"
						:target="channel.href && channel.href.startsWith('http') ? '_blank' : undefined"
						:rel="channel.href && channel.href.startsWith('http') ? 'noopener noreferrer' : undefined"
						class="contatti-card grid gap-2 p-5 bg-white rounded-2xl no-underline text-inherit border border-[rgba(9,88,102,0.12)] shadow-[0_2px_8px_rgba(9,88,102,0.04)]">
						<span class="inline-flex items-center justify-center w-11 h-11 rounded-[14px] text-[var(--color-brand-primary)] bg-[linear-gradient(135deg,rgba(9,88,102,0.16),rgba(9,88,102,0.04))]" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
								<path :d="channel.icon" />
							</svg>
						</span>
						<span class="text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-[var(--color-brand-text-secondary)]">{{ channel.label }}</span>
						<span class="text-[0.9375rem] font-semibold text-[var(--color-brand-primary)] break-words">{{ channel.value }}</span>
					</component>
				</div>
			</div>
		</section>

		<!-- FORM centrato -->
		<section class="mt-8" aria-labelledby="contact-form-title">
			<div class="my-container">
				<div v-if="submitSuccess" class="contatti-panel grid gap-3 justify-items-center text-center">
					<div class="inline-flex items-center justify-center w-14 h-14 rounded-full text-[var(--color-brand-primary)] bg-[linear-gradient(135deg,rgba(9,88,102,0.18),rgba(9,88,102,0.04))]" aria-hidden="true">
						<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z" />
						</svg>
					</div>
					<h2 class="contatti-h2">Messaggio inviato</h2>
					<p class="m-0 max-w-[44ch] text-[0.95rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">Ti risponderemo in giornata. Nel frattempo puoi tracciare una spedizione o calcolare un preventivo.</p>
					<SfButton @click="submitSuccess = false">
						Invia un altro messaggio
					</SfButton>
				</div>

				<div v-else class="contatti-panel">
					<header class="grid gap-2 mb-6 text-center justify-items-center">
						<span class="block w-12 h-[3px] rounded-full bg-[var(--color-brand-accent)]" aria-hidden="true"/>
						<h2 id="contact-form-title" class="contatti-h2">Scrivici</h2>
						<p class="m-0 max-w-[48ch] text-[0.95rem] leading-[1.55] text-[var(--color-brand-text-secondary)]">Descrivi la richiesta con peso, tratta e urgenza: piu contesto, risposta piu precisa.</p>
					</header>

					<form class="grid gap-4" novalidate @submit.prevent="handleSubmit">
						<div class="grid gap-4 md:grid-cols-2">
							<div class="grid gap-1.5">
								<label for="cf-name" class="contatti-label">Nome</label>
								<input id="cf-name" v-model="contactForm.name" type="text" required autocomplete="given-name" class="contatti-input min-h-12 px-4" placeholder="Es. Mario" >
							</div>
							<div class="grid gap-1.5">
								<label for="cf-surname" class="contatti-label">Cognome</label>
								<input id="cf-surname" v-model="contactForm.surname" type="text" required autocomplete="family-name" class="contatti-input min-h-12 px-4" placeholder="Es. Rossi" >
							</div>
						</div>

						<div class="grid gap-4 md:grid-cols-2">
							<div class="grid gap-1.5">
								<label for="cf-email" class="contatti-label">Email</label>
								<input id="cf-email" v-model="contactForm.email" type="email" required autocomplete="email" class="contatti-input min-h-12 px-4" placeholder="nome@email.it" >
							</div>
							<div class="grid gap-1.5">
								<label for="cf-phone" class="contatti-label">Telefono <span class="font-medium text-[var(--color-brand-text-secondary)]">(opzionale)</span></label>
								<input id="cf-phone" v-model="contactForm.telephone_number" type="tel" autocomplete="tel" class="contatti-input min-h-12 px-4" placeholder="+39 ..." >
							</div>
						</div>

						<div class="grid gap-1.5">
							<label for="cf-message" class="contatti-label">Messaggio <span class="font-medium text-[var(--color-brand-text-secondary)]">(per reclami: indica "Reclamo" e numero spedizione BRT)</span></label>
							<textarea id="cf-message" v-model="contactForm.message" required rows="6" maxlength="1500" class="contatti-input min-h-[160px] py-3.5 px-4 leading-[1.55] resize-y" placeholder="Racconta la richiesta con dettagli utili (tratta, peso, urgenza). Per un reclamo: inizia con &quot;Reclamo&quot; e allega numero spedizione."/>
						</div>

						<div class="flex justify-center mt-1" aria-label="Verifica anti-bot">
							<NuxtTurnstile v-model="turnstile.token.value" @expired="turnstile.onExpire" @error="turnstile.onError" />
						</div>

						<p v-if="submitError" class="m-0 px-3.5 py-3 rounded-xl text-sm font-semibold text-[var(--color-brand-error)] bg-[var(--color-error-bg,#fee8e0)] border border-[var(--color-error-border,#fbc4ac)]" role="alert">{{ submitError }}</p>

						<SfButton type="submit" size="lg" class="w-full justify-center mt-1 md:w-auto md:min-w-[220px] md:ml-auto" :loading="isSubmitting" :disabled="!turnstile.isReady.value">
							<span v-if="!isSubmitting">Invia richiesta</span>
							<span v-else>Invio in corso...</span>
						</SfButton>
					</form>
				</div>
			</div>
		</section>

		<!-- FAQ grid editoriale -->
		<section class="mt-8" aria-labelledby="contact-faq-title">
			<div class="my-container">
				<header class="grid gap-2.5 mb-6 justify-items-center text-center">
					<span class="block w-12 h-[3px] rounded-full bg-[var(--color-brand-accent)]" aria-hidden="true"/>
					<h2 id="contact-faq-title" class="m-0 font-montserrat text-[1.75rem] leading-[1.1] tracking-[-0.025em] font-extrabold text-[var(--color-brand-primary)]">Domande frequenti</h2>
					<p class="m-0 max-w-[56ch] text-[0.95rem] text-[var(--color-brand-text-secondary)]">Prima di scriverci, dai un'occhiata: molte risposte sono qui.</p>
				</header>
				<ContactFAQ />
			</div>
		</section>

		<!-- Quick next: 3 strip orizzontali per azione rapida -->
		<section class="mt-8" aria-label="Prossime azioni utili">
			<div class="my-container">
				<div class="grid gap-3">
					<NuxtLink
						v-for="action in quickActions"
						:key="action.href"
						:to="action.href"
						class="contatti-quick-strip grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 bg-white rounded-2xl no-underline text-inherit border border-[rgba(9,88,102,0.12)]">
						<span class="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[var(--color-brand-primary)] bg-[linear-gradient(135deg,rgba(9,88,102,0.16),rgba(9,88,102,0.04))]" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
								<path :d="action.icon" />
							</svg>
						</span>
						<span class="grid gap-0.5 text-center">
							<span class="text-[0.9375rem] font-bold text-[var(--color-brand-primary)]">{{ action.title }}</span>
							<span class="text-[0.82rem] text-[var(--color-brand-text-secondary)]">{{ action.text }}</span>
						</span>
						<span class="contatti-quick-strip__arrow inline-flex items-center justify-center text-[var(--color-brand-accent)]" aria-hidden="true">
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

<style scoped>
/* Pill rapide hero: pattern teal con hover translate + accent border */
.contatti-pill {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	padding: 10px 18px;
	border-radius: 999px;
	background: #fff;
	border: 1px solid rgba(9, 88, 102, 0.18);
	color: var(--color-brand-primary);
	text-decoration: none;
	font-size: 0.9rem;
	transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease;
}
.contatti-pill:hover:not(.is-static) {
	transform: translateY(-1px);
	border-color: var(--color-brand-accent);
	box-shadow: 0 6px 16px rgba(9, 88, 102, 0.08);
}
.is-static { cursor: default; }
.contatti-pill__label {
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	font-size: 0.72rem;
	color: var(--color-brand-text-secondary);
}
.contatti-pill__arrow { color: var(--color-brand-accent); font-weight: 700; }
.contatti-pill__value { font-weight: 600; color: var(--color-brand-primary); }

/* Card e strip: hover translate + box-shadow accent */
.contatti-card,
.contatti-quick-strip {
	transition: transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
}
a.contatti-card:hover {
	transform: translateY(-2px);
	border-color: rgba(9, 88, 102, 0.3);
	box-shadow: 0 8px 24px rgba(9, 88, 102, 0.08);
}
.contatti-quick-strip:hover {
	transform: translateY(-1px);
	border-color: var(--color-brand-accent);
	box-shadow: 0 8px 20px rgba(9, 88, 102, 0.08);
}
.contatti-quick-strip__arrow { transition: transform 240ms ease; }
.contatti-quick-strip:hover .contatti-quick-strip__arrow { transform: translateX(3px); }

/* Pannello form / success: shadow doppio */
.contatti-panel {
	width: 100%;
	background: #fff;
	border: 1px solid rgba(9, 88, 102, 0.12);
	border-radius: 20px;
	padding: 20px 16px;
	box-shadow: 0 4px 16px rgba(9, 88, 102, 0.05), 0 12px 32px rgba(9, 88, 102, 0.04);
}
@media (min-width: 768px) {
	.contatti-panel { padding: 36px 40px; }
}

/* Heading e label form: usano Montserrat e token brand */
.contatti-h2 {
	margin: 0;
	font-family: var(--font-montserrat);
	font-size: 1.625rem;
	line-height: 1.1;
	letter-spacing: -0.025em;
	font-weight: 800;
	color: var(--color-brand-primary);
}
.contatti-label { font-size: 0.82rem; font-weight: 700; color: var(--color-brand-text); }

/* Input con focus ring teal */
.contatti-input {
	width: 100%;
	border-radius: 12px;
	border: 1.5px solid var(--color-border, #dfe4ea);
	background: #fff;
	color: var(--color-brand-text);
	font-size: 0.95rem;
	font-family: inherit;
	transition: border-color 200ms ease, box-shadow 200ms ease;
}
.contatti-input::placeholder { color: var(--color-text-faint, #9aa5b1); }
.contatti-input:focus {
	outline: none;
	border-color: var(--color-brand-primary);
	box-shadow: 0 0 0 3px rgba(9, 88, 102, 0.12);
}
@media (max-width: 23.4375rem) {
	.contatti-input { font-size: 16px; } /* evita zoom iOS */
}
</style>
