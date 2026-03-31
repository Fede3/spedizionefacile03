<!--
  PAGINA: Contatti (contatti.vue)
  Form di contatto per richiedere assistenza o informazioni.
  Invia i dati del form all'endpoint /api/contact del backend e mostra feedback di successo o errore.
  Layout ripensato in ottica mobile-first: intro chiaro, card di contesto e form piu' leggibile.
-->
<script setup>
useSeoMeta({
	title: 'Contatti | SpediamoFacile - Assistenza e Supporto',
	ogTitle: 'Contatti | SpediamoFacile',
	description: 'Hai bisogno di aiuto? Contatta il team di SpediamoFacile per assistenza sulle tue spedizioni, preventivi personalizzati o informazioni sui nostri servizi.',
	ogDescription: 'Contatta SpediamoFacile per assistenza e supporto sulle tue spedizioni.',
});

useHead({
	script: [
		{
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
		},
	],
});

const sanctum = useSanctumClient();

const contactForm = ref({
	name: '',
	surname: '',
	email: '',
	telephone_number: '',
	address: '',
	message: '',
});

const contactHighlights = [
	{
		title: 'Assistenza pratica',
		text: 'Ti aiutiamo su preventivi, spedizioni, ritiri, problemi di consegna e servizi accessori.',
		icon: 'mdi:headset',
	},
	{
		title: 'Risposte piu chiare',
		text: 'Scrivici gia con il contesto utile: tratta, tipo collo, ordine o dubbio operativo.',
		icon: 'mdi:message-text-fast-outline',
	},
	{
		title: 'Flusso piu rapido',
		text: 'Se vuoi partire subito, puoi passare dal preventivo e poi tornare a scriverci solo se serve.',
		icon: 'mdi:flash-outline',
	},
];

const quickActions = [
	{ title: 'Calcola un preventivo', text: 'Vuoi un prezzo immediato prima di scriverci?', href: '/preventivo', cta: 'Vai al preventivo', icon: 'mdi:calculator-variant-outline' },
	{ title: 'Scrivici via email', text: 'Per richieste non urgenti o materiali da allegare.', href: 'mailto:info@spediamofacile.it', cta: 'info@spediamofacile.it', icon: 'mdi:email-fast-outline' },
];

const isSubmitting = ref(false);
const submitSuccess = ref(false);
const submitError = ref(null);

const resetForm = () => {
	contactForm.value = {
		name: '',
		surname: '',
		email: '',
		telephone_number: '',
		address: '',
		message: '',
	};
};

const handleSubmit = async () => {
	submitError.value = null;
	isSubmitting.value = true;

	try {
		await sanctum('/sanctum/csrf-cookie');
		await sanctum('/api/contact', {
			method: 'POST',
			body: contactForm.value,
		});
		submitSuccess.value = true;
		resetForm();
	} catch (error) {
		const data = error?.response?._data || error?.data;
		if (data?.errors) {
			const firstError = Object.values(data.errors)[0];
			submitError.value = Array.isArray(firstError) ? firstError[0] : firstError;
		} else {
			submitError.value = data?.message || "Errore durante l'invio. Riprova.";
		}
	} finally {
		isSubmitting.value = false;
	}
};
</script>

<template>
	<section class="contact-page-shell">
		<div class="my-container">
			<div class="contact-intro-panel">
				<div class="contact-intro-panel__copy">
					<p class="contact-intro-panel__eyebrow">Contatti</p>
					<h1 class="contact-intro-panel__title">Raccontaci cosa ti serve e ti rispondiamo con il percorso piu utile.</h1>
					<p class="contact-intro-panel__text">
						Assistenza, chiarimenti su servizi, dubbi su ritiro e consegna o supporto commerciale:
						manteniamo il contatto semplice, chiaro e leggibile anche da mobile.
					</p>
				</div>

				<div class="contact-intro-panel__pills">
					<span class="contact-intro-panel__pill">Assistenza rapida</span>
					<span class="contact-intro-panel__pill">Preventivi e spedizioni</span>
					<span class="contact-intro-panel__pill">Supporto dedicato</span>
				</div>
			</div>

			<div v-if="submitSuccess" class="contact-success-card">
				<div class="contact-success-card__icon-shell">
					<Icon name="mdi:check-circle-outline" class="contact-success-card__icon" />
				</div>
				<div class="contact-success-card__body">
					<h2 class="contact-success-card__title">Messaggio inviato correttamente</h2>
					<p class="contact-success-card__text">Grazie. Abbiamo ricevuto la richiesta e ti risponderemo il prima possibile con un riscontro chiaro e operativo.</p>
				</div>
				<button type="button" class="contact-success-card__cta" @click="submitSuccess = false">Invia un altro messaggio</button>
			</div>

			<div v-else class="contact-layout-shell">
				<div class="contact-form-card">
					<div class="contact-form-card__header">
						<h2 class="contact-form-card__title">Scrivici in modo diretto</h2>
						<p class="contact-form-card__text">Compila solo i dati utili: ti rispondiamo meglio e piu rapidamente.</p>
					</div>

					<form class="contact-form" @submit.prevent="handleSubmit">
						<div class="contact-form__grid contact-form__grid--two">
							<label class="contact-field">
								<span class="contact-field__label">Nome *</span>
								<input v-model="contactForm.name" type="text" placeholder="Nome" class="contact-field__input" required />
							</label>
							<label class="contact-field">
								<span class="contact-field__label">Cognome *</span>
								<input v-model="contactForm.surname" type="text" placeholder="Cognome" class="contact-field__input" required />
							</label>
						</div>

						<div class="contact-form__grid contact-form__grid--two contact-form__grid--stack-mobile">
							<label class="contact-field">
								<span class="contact-field__label">E-mail *</span>
								<input v-model="contactForm.email" type="email" placeholder="nome@azienda.it" class="contact-field__input" required />
							</label>
							<label class="contact-field">
								<span class="contact-field__label">Numero di telefono</span>
								<input v-model="contactForm.telephone_number" type="tel" placeholder="Telefono" class="contact-field__input" />
							</label>
						</div>

						<label class="contact-field">
							<span class="contact-field__label">Indirizzo *</span>
							<input v-model="contactForm.address" type="text" placeholder="Indirizzo o sede operativa" class="contact-field__input" required />
						</label>

						<label class="contact-field">
							<span class="contact-field__label">Come possiamo aiutarti? *</span>
							<div class="contact-field__textarea-wrap">
								<textarea v-model="contactForm.message" maxlength="2000" placeholder="Descrivi il problema o la richiesta in modo sintetico" class="contact-field__textarea" required></textarea>
								<span class="contact-field__counter">{{ contactForm.message.length }}/2000</span>
							</div>
						</label>

						<p v-if="submitError" class="contact-form__error">{{ submitError }}</p>

						<div class="contact-form__footer">
							<p class="contact-form__note">Ti rispondiamo il prima possibile. Per dubbi sul prezzo, spesso conviene partire dal preventivo e poi contattarci con il risultato gia visibile.</p>
							<button type="submit" class="contact-form__cta" :disabled="isSubmitting" :class="{ 'is-loading': isSubmitting }">
								{{ isSubmitting ? 'Invio in corso...' : 'Invia richiesta' }}
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
							</button>
						</div>
					</form>
				</div>

				<aside class="contact-side-stack">
					<article v-for="item in contactHighlights" :key="item.title" class="contact-side-card">
						<div class="contact-side-card__icon-shell">
							<Icon :name="item.icon" class="contact-side-card__icon" />
						</div>
						<div class="contact-side-card__body">
							<h2 class="contact-side-card__title">{{ item.title }}</h2>
							<p class="contact-side-card__text">{{ item.text }}</p>
						</div>
					</article>

					<article class="contact-actions-card">
						<h2 class="contact-actions-card__title">Scorciatoie utili</h2>
						<div class="contact-actions-card__list">
							<a
								v-for="action in quickActions"
								:key="action.title"
								:href="action.href"
								class="contact-actions-card__item"
							>
								<div class="contact-actions-card__icon-shell">
									<Icon :name="action.icon" class="contact-actions-card__icon" />
								</div>
								<div class="contact-actions-card__copy">
									<h3 class="contact-actions-card__item-title">{{ action.title }}</h3>
									<p class="contact-actions-card__item-text">{{ action.text }}</p>
									<span class="contact-actions-card__item-link">{{ action.cta }}</span>
								</div>
							</a>
						</div>
					</article>
				</aside>
			</div>
		</div>
	</section>
</template>

<style scoped>
.contact-page-shell {
	padding: 22px 0 72px;
}

.contact-intro-panel {
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

.contact-intro-panel__eyebrow {
	margin: 0;
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: #095866;
}

.contact-intro-panel__title {
	margin: 8px 0 0;
	font-size: 1.55rem;
	line-height: 1.08;
	letter-spacing: -0.04em;
	font-weight: 700;
	color: #1f2937;
}

.contact-intro-panel__text {
	margin: 12px 0 0;
	font-size: 0.95rem;
	line-height: 1.62;
	color: #546171;
	max-width: 64ch;
}

.contact-intro-panel__pills {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.contact-intro-panel__pill {
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

.contact-success-card,
.contact-form-card,
.contact-side-card,
.contact-actions-card {
	background: #fff;
	border: 1px solid rgba(9, 88, 102, 0.1);
	border-radius: 24px;
	box-shadow: 0 16px 34px rgba(17, 24, 39, 0.05);
}

.contact-success-card {
	display: grid;
	gap: 16px;
	padding: 22px 20px;
	margin-top: 22px;
}

.contact-success-card__icon-shell,
.contact-side-card__icon-shell,
.contact-actions-card__icon-shell {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	border-radius: 14px;
	background: linear-gradient(135deg, rgba(9, 88, 102, 0.14), rgba(9, 88, 102, 0.04));
}

.contact-success-card__icon,
.contact-side-card__icon,
.contact-actions-card__icon {
	font-size: 24px;
	color: #095866;
}

.contact-success-card__title,
.contact-form-card__title,
.contact-side-card__title,
.contact-actions-card__title,
.contact-actions-card__item-title {
	margin: 0;
	font-size: 1.15rem;
	line-height: 1.18;
	font-weight: 700;
	letter-spacing: -0.03em;
	color: #1f2937;
}

.contact-success-card__text,
.contact-form-card__text,
.contact-side-card__text,
.contact-actions-card__item-text,
.contact-form__note {
	margin: 0;
	font-size: 0.92rem;
	line-height: 1.62;
	color: #546171;
}

.contact-success-card__cta,
.contact-form__cta {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	min-height: 48px;
	padding: 0 18px;
	border-radius: 999px;
	background: #E44203;
	color: #fff;
	font-size: 0.88rem;
	font-weight: 700;
	box-shadow: 0 12px 24px rgba(228, 66, 3, 0.18);
	transition: transform .24s ease, box-shadow .24s ease, opacity .24s ease, background-color .24s ease;
}

.contact-form__cta:hover,
.contact-success-card__cta:hover {
	transform: translateY(-1px);
}

.contact-form__cta.is-loading {
	opacity: 0.7;
	cursor: not-allowed;
}

.contact-layout-shell {
	display: grid;
	gap: 18px;
	margin-top: 22px;
}

.contact-form-card {
	display: grid;
	gap: 18px;
	padding: 22px 20px;
}

.contact-form {
	display: grid;
	gap: 16px;
}

.contact-form__grid {
	display: grid;
	gap: 14px;
}

.contact-field {
	display: grid;
	gap: 8px;
}

.contact-field__label {
	font-size: 0.82rem;
	font-weight: 700;
	color: #304254;
}

.contact-field__input,
.contact-field__textarea {
	width: 100%;
	border-radius: 16px;
	border: 1px solid rgba(9, 88, 102, 0.12);
	background: #fbfcfd;
	color: #1f2937;
	transition: border-color .22s ease, box-shadow .22s ease, background-color .22s ease;
}

.contact-field__input {
	min-height: 52px;
	padding: 0 16px;
	font-size: 0.94rem;
}

.contact-field__textarea-wrap {
	position: relative;
}

.contact-field__textarea {
	min-height: 180px;
	padding: 16px 16px 36px;
	font-size: 0.94rem;
	line-height: 1.6;
	resize: vertical;
}

.contact-field__input:focus,
.contact-field__textarea:focus {
	outline: none;
	border-color: rgba(9, 88, 102, 0.4);
	box-shadow: 0 0 0 4px rgba(9, 88, 102, 0.08);
	background: #fff;
}

.contact-field__counter {
	position: absolute;
	right: 14px;
	bottom: 12px;
	font-size: 0.75rem;
	font-weight: 600;
	color: #8a95a3;
}

.contact-form__error {
	margin: 0;
	padding: 12px 14px;
	border-radius: 16px;
	background: #fff5f5;
	border: 1px solid #fecaca;
	color: #dc2626;
	font-size: 0.86rem;
	font-weight: 600;
}

.contact-form__footer {
	display: grid;
	gap: 14px;
}

.contact-side-stack {
	display: grid;
	gap: 16px;
}

.contact-side-card,
.contact-actions-card {
	display: grid;
	gap: 14px;
	padding: 20px;
}

.contact-actions-card__list {
	display: grid;
	gap: 12px;
}

.contact-actions-card__item {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 12px;
	padding: 14px;
	border-radius: 18px;
	background: #f8fbfc;
	border: 1px solid rgba(9, 88, 102, 0.08);
	transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
}

.contact-actions-card__item:hover {
	transform: translateY(-1px);
	border-color: rgba(9, 88, 102, 0.18);
	box-shadow: 0 12px 26px rgba(17, 24, 39, 0.05);
}

.contact-actions-card__copy {
	display: grid;
	gap: 4px;
}

.contact-actions-card__item-link {
	font-size: 0.82rem;
	font-weight: 700;
	color: #E44203;
}

@media (min-width: 48rem) {
	.contact-page-shell {
		padding: 28px 0 88px;
	}

	.contact-intro-panel,
	.contact-form-card,
	.contact-success-card {
		padding: 28px 28px;
	}

	.contact-form__grid--two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (min-width: 64rem) {
	.contact-layout-shell {
		grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.78fr);
		align-items: start;
	}
}

@media (min-width: 80rem) {
	.contact-page-shell {
		padding: 32px 0 112px;
	}

	.contact-intro-panel {
		grid-template-columns: minmax(0, 1.15fr) auto;
		align-items: end;
		padding: 32px;
	}

	.contact-intro-panel__title {
		font-size: 2.35rem;
	}

	.contact-form-card,
	.contact-success-card {
		padding: 32px;
	}
}
</style>
