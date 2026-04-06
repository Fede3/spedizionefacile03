<!--
  FILE: pages/account/amministrazione/servizi/nuovo.vue
  SCOPO: Pannello admin — creazione nuovo servizio con sezioni dinamiche e FAQ.
  API: POST /api/admin/services — crea servizio.
  ROUTE: /account/amministrazione/servizi/nuovo (middleware sanctum:auth + admin).

  COLLEGAMENTI:
    - pages/account/amministrazione/servizi/index.vue → torna alla lista servizi.
-->
<script setup>
definePageMeta({
	middleware: ["app-auth", "admin"],
});

const sanctum = useSanctumClient();
const router = useRouter();
const { actionMessage, showSuccess, showError } = useAdmin();

const saving = ref(false);
const form = ref({
	title: '',
	slug: '',
	meta_description: '',
	intro: '',
	sections: [{ heading: '', text: '' }],
	faqs: [{ title: '', text: '' }],
	is_published: false,
	type: 'service',
});

const hasFilledText = (value) => Boolean(String(value || '').trim());

const sectionCount = computed(() => form.value.sections.length);
const faqCount = computed(() => form.value.faqs.length);
const publishStateLabel = computed(() => (form.value.is_published ? 'Pubblicato' : 'Bozza'));
const publishStateHint = computed(() =>
	form.value.is_published
		? 'Il servizio sara visibile appena completi il salvataggio.'
		: 'Puoi salvarlo ora e rifinire contenuti e FAQ con calma.',
);
const checklistItems = computed(() => [
	{
		label: 'Titolo e URL pronti',
		done: hasFilledText(form.value.title) && hasFilledText(form.value.slug),
	},
	{
		label: 'Introduzione compilata',
		done: hasFilledText(form.value.intro),
	},
	{
		label: 'Almeno una sezione completa',
		done: form.value.sections.some((section) => hasFilledText(section.heading) && hasFilledText(section.text)),
	},
	{
		label: 'Almeno una FAQ completa',
		done: form.value.faqs.some((faq) => hasFilledText(faq.title) && hasFilledText(faq.text)),
	},
]);
const completedChecklistCount = computed(() => checklistItems.value.filter((item) => item.done).length);

const generateSlug = () => {
	form.value.slug = form.value.title
		.toLowerCase()
		.replace(/[àáâãäå]/g, 'a')
		.replace(/[èéêë]/g, 'e')
		.replace(/[ìíîï]/g, 'i')
		.replace(/[òóôõö]/g, 'o')
		.replace(/[ùúûü]/g, 'u')
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
};

const addSection = () => { form.value.sections.push({ heading: '', text: '' }); };
const removeSection = (idx) => { if (form.value.sections.length > 1) form.value.sections.splice(idx, 1); };
const addFaq = () => { form.value.faqs.push({ title: '', text: '' }); };
const removeFaq = (idx) => { if (form.value.faqs.length > 1) form.value.faqs.splice(idx, 1); };

const saveService = async () => {
	saving.value = true;
	try {
		await sanctum("/api/admin/articles", { method: "POST", body: form.value });
		showSuccess("Servizio creato con successo.");
		setTimeout(() => { router.push('/account/amministrazione/servizi'); }, 800);
	} catch (e) { showError(e, "Errore durante la creazione del servizio."); }
	finally { saving.value = false; }
};
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Admin"
				title="Nuovo servizio"
				description="Crea un nuovo servizio editoriale con sezioni e FAQ, mantenendo la stessa struttura visiva del catalogo pubblico."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Servizi', to: '/account/amministrazione/servizi' },
					{ label: 'Nuovo servizio' },
				]"
				back-to="/account/amministrazione/servizi"
				back-label="Torna ai servizi" />

			<div class="service-editor-overview sf-account-panel mb-[20px] rounded-[20px] p-[18px] desktop:p-[24px]">
				<div class="service-editor-overview__copy">
					<p class="service-editor-overview__eyebrow">Editor servizio</p>
					<h2 class="service-editor-overview__title">Imposta struttura, tono e pubblicazione senza perdere il filo</h2>
					<p class="service-editor-overview__text">
						Tieni il contenuto essenziale: base chiara, sezioni ordinate e FAQ che risolvono i dubbi ricorrenti.
					</p>
				</div>
				<div class="service-editor-overview__stats">
					<article class="service-editor-stat service-editor-stat--teal">
						<span class="service-editor-stat__label">Stato</span>
						<strong class="service-editor-stat__value">{{ publishStateLabel }}</strong>
						<span class="service-editor-stat__meta">{{ publishStateHint }}</span>
					</article>
					<article class="service-editor-stat service-editor-stat--teal">
						<span class="service-editor-stat__label">Sezioni</span>
						<strong class="service-editor-stat__value">{{ sectionCount }}</strong>
						<span class="service-editor-stat__meta">Blocchi principali del servizio</span>
					</article>
					<article class="service-editor-stat service-editor-stat--orange">
						<span class="service-editor-stat__label">FAQ</span>
						<strong class="service-editor-stat__value">{{ faqCount }}</strong>
						<span class="service-editor-stat__meta">Risposte rapide finali</span>
					</article>
				</div>
			</div>

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[20px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success' ? 'bg-[#f0fdf4] text-[#0a8a7a] border border-[#d1fae5]' : 'bg-red-50 text-red-700 border border-red-200',
				]">
				<template v-if="actionMessage.type === 'success'"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg></template>
				<template v-else><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg></template>
				{{ actionMessage.text }}
			</div>

			<div class="service-editor-layout">
				<div class="service-editor-main">
					<section class="sf-account-panel service-editor-panel service-editor-panel--teal rounded-[20px] p-[20px] desktop:p-[28px]">
						<div class="service-editor-panel__header">
							<div>
								<h2 class="service-editor-panel__title">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="service-editor-panel__icon" fill="currentColor"><path d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/></svg>
									Informazioni base
								</h2>
								<p class="service-editor-panel__text">Definisci naming, URL e testo introduttivo una sola volta, poi costruisci il resto attorno a questa base.</p>
							</div>
						</div>
						<div class="service-editor-field-grid">
							<div class="service-editor-field service-editor-field--half">
								<label class="service-editor-label">Titolo</label>
								<input v-model="form.title" @input="generateSlug" type="text" class="service-editor-input" placeholder="Titolo del servizio" />
							</div>
							<div class="service-editor-field service-editor-field--half">
								<label class="service-editor-label">Slug (URL)</label>
								<input v-model="form.slug" type="text" class="service-editor-input service-editor-input--mono" placeholder="titolo-del-servizio" />
								<p class="service-editor-field__hint">Si aggiorna automaticamente dal titolo, ma puoi rifinirlo a mano.</p>
							</div>
							<div class="service-editor-field">
								<label class="service-editor-label">Meta description</label>
								<textarea v-model="form.meta_description" rows="2" class="service-editor-textarea" placeholder="Descrizione per i motori di ricerca"></textarea>
							</div>
							<div class="service-editor-field">
								<label class="service-editor-label">Introduzione</label>
								<textarea v-model="form.intro" rows="4" class="service-editor-textarea" placeholder="Paragrafo introduttivo del servizio"></textarea>
							</div>
						</div>
						<div class="service-editor-toggle-row">
							<div class="service-editor-toggle-copy">
								<span class="service-editor-toggle-copy__label">Visibilita</span>
								<p class="service-editor-toggle-copy__text">{{ publishStateHint }}</p>
							</div>
							<div class="service-editor-toggle-control">
								<button
									type="button"
									aria-label="Attiva o disattiva pubblicazione"
									:aria-pressed="form.is_published ? 'true' : 'false'"
									@click="form.is_published = !form.is_published"
									:class="['service-editor-toggle', form.is_published ? 'service-editor-toggle--active' : '']">
									<span :class="['service-editor-toggle__thumb', form.is_published ? 'service-editor-toggle__thumb--active' : '']"></span>
								</button>
								<span class="service-editor-state-pill" :class="form.is_published ? 'service-editor-state-pill--active' : ''">
									{{ form.is_published ? 'Pubblicato' : 'Bozza' }}
								</span>
							</div>
						</div>
					</section>

					<section class="sf-account-panel service-editor-panel service-editor-panel--teal rounded-[20px] p-[20px] desktop:p-[28px]">
						<div class="service-editor-panel__header service-editor-panel__header--split">
							<div>
								<h2 class="service-editor-panel__title">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="service-editor-panel__icon" fill="currentColor"><path d="M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z"/></svg>
									Sezioni
								</h2>
								<p class="service-editor-panel__text">Organizza il contenuto in blocchi leggibili. Ogni sezione dovrebbe coprire un beneficio, un passaggio o una casistica chiara.</p>
							</div>
							<button type="button" @click="addSection" class="btn-secondary btn-compact inline-flex items-center gap-[6px]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
								Aggiungi sezione
							</button>
						</div>
						<div class="service-editor-stack">
							<div v-for="(section, idx) in form.sections" :key="idx" class="service-editor-stack-card service-editor-stack-card--teal">
								<div class="service-editor-stack-card__head">
									<span class="service-editor-stack-card__index">Sezione {{ idx + 1 }}</span>
									<button
										v-if="form.sections.length > 1"
										type="button"
										@click="removeSection(idx)"
										class="service-editor-remove">
										Rimuovi
									</button>
								</div>
								<div class="service-editor-stack-card__body">
									<input v-model="section.heading" type="text" class="service-editor-input" placeholder="Titolo sezione" />
									<textarea v-model="section.text" rows="5" class="service-editor-textarea" placeholder="Contenuto della sezione"></textarea>
								</div>
							</div>
						</div>
					</section>

					<section class="sf-account-panel service-editor-panel service-editor-panel--orange rounded-[20px] p-[20px] desktop:p-[28px]">
						<div class="service-editor-panel__header service-editor-panel__header--split">
							<div>
								<h2 class="service-editor-panel__title">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="service-editor-panel__icon" fill="currentColor"><path d="M18,15H6L2,19V3A1,1 0 0,1 3,2H18A1,1 0 0,1 19,3V14A1,1 0 0,1 18,15M23,9V23L19,19H8A1,1 0 0,1 7,18V17H21V8H22A1,1 0 0,1 23,9Z"/></svg>
									FAQ
								</h2>
								<p class="service-editor-panel__text">Chiudi la pagina con risposte brevi ai dubbi ricorrenti. Evita testi lunghi: una domanda, una risposta netta.</p>
							</div>
							<button type="button" @click="addFaq" class="btn-secondary btn-compact inline-flex items-center gap-[6px]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
								Aggiungi FAQ
							</button>
						</div>
						<div class="service-editor-stack">
							<div v-for="(faq, idx) in form.faqs" :key="idx" class="service-editor-stack-card service-editor-stack-card--orange">
								<div class="service-editor-stack-card__head">
									<span class="service-editor-stack-card__index">FAQ {{ idx + 1 }}</span>
									<button
										v-if="form.faqs.length > 1"
										type="button"
										@click="removeFaq(idx)"
										class="service-editor-remove">
										Rimuovi
									</button>
								</div>
								<div class="service-editor-stack-card__body">
									<input v-model="faq.title" type="text" class="service-editor-input" placeholder="Domanda" />
									<textarea v-model="faq.text" rows="4" class="service-editor-textarea" placeholder="Risposta"></textarea>
								</div>
							</div>
						</div>
					</section>
				</div>

				<aside class="service-editor-side">
					<div class="sf-account-panel service-editor-summary rounded-[20px] p-[20px] desktop:p-[24px]">
						<div class="service-editor-summary__top">
							<p class="service-editor-summary__eyebrow">Checklist</p>
							<h2 class="service-editor-summary__title">Pronto alla pubblicazione</h2>
							<p class="service-editor-summary__text">
								{{ completedChecklistCount }}/{{ checklistItems.length }} elementi chiave completati.
							</p>
						</div>
						<ul class="service-editor-summary__list">
							<li
								v-for="item in checklistItems"
								:key="item.label"
								class="service-editor-summary__item"
								:class="{ 'service-editor-summary__item--done': item.done }">
								<span class="service-editor-summary__dot" aria-hidden="true"></span>
								<span>{{ item.label }}</span>
							</li>
						</ul>
						<div class="service-editor-summary__note">
							<p class="service-editor-summary__note-title">Promemoria rapido</p>
							<p class="service-editor-summary__note-text">
								Se il contenuto non e' ancora rifinito, salva pure in bozza: mantieni URL e struttura stabili e rientra solo per il testo.
							</p>
						</div>
						<button type="button" @click="saveService" :disabled="saving" class="btn-cta inline-flex w-full items-center justify-center gap-[8px] disabled:opacity-50">
							<svg v-if="saving" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
							<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
							{{ saving ? "Salvataggio..." : "Crea servizio" }}
						</button>
					</div>
				</aside>
			</div>
		</div>
	</section>
</template>

<style scoped>
.service-editor-layout {
	display: grid;
	gap: 20px;
}

.service-editor-main {
	display: grid;
	gap: 20px;
	min-width: 0;
}

.service-editor-overview {
	display: grid;
	gap: 16px;
}

.service-editor-overview__copy {
	display: grid;
	gap: 6px;
	max-width: 44rem;
}

.service-editor-overview__eyebrow,
.service-editor-summary__eyebrow {
	margin: 0;
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: #6a7a89;
}

.service-editor-overview__title,
.service-editor-summary__title {
	margin: 0;
	font-size: clamp(1.28rem, 1.16rem + 0.5vw, 1.7rem);
	line-height: 1.08;
	font-weight: 800;
	letter-spacing: -0.03em;
	color: #1f2a3c;
}

.service-editor-overview__text,
.service-editor-summary__text {
	margin: 0;
	font-size: 0.9rem;
	line-height: 1.55;
	color: #5d6e7f;
}

.service-editor-overview__stats {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.service-editor-stat {
	position: relative;
	display: grid;
	gap: 4px;
	padding: 14px 16px;
	border-radius: 18px;
	border: 1px solid #d9e6ea;
	background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
	box-shadow: 0 8px 18px rgba(20, 37, 48, 0.04);
	overflow: hidden;
}

.service-editor-stat::before {
	content: '';
	position: absolute;
	inset: 0 auto 0 0;
	width: 4px;
	background: linear-gradient(180deg, #dfe8ec 0%, #eef4f6 100%);
}

.service-editor-stat--teal::before {
	background: linear-gradient(180deg, var(--color-brand-primary-light) 0%, #2d8190 100%);
}

.service-editor-stat--orange::before {
	background: linear-gradient(180deg, #e45c20 0%, #f28a3e 100%);
}

.service-editor-stat__label {
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #738392;
}

.service-editor-stat__value {
	font-size: 1.2rem;
	line-height: 1.1;
	font-weight: 800;
	color: #1f2a3c;
}

.service-editor-stat__meta {
	font-size: 0.8rem;
	line-height: 1.45;
	color: #5b6b7c;
}

.service-editor-panel {
	display: grid;
	gap: 18px;
}

.service-editor-panel__header {
	display: grid;
	gap: 8px;
}

.service-editor-panel__header--split {
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: start;
	gap: 16px;
}

.service-editor-panel__title {
	margin: 0;
	display: inline-flex;
	align-items: center;
	gap: 10px;
	font-size: 1.18rem;
	line-height: 1.15;
	font-weight: 800;
	color: #1f2a3c;
}

.service-editor-panel__icon {
	width: 20px;
	height: 20px;
	flex: 0 0 20px;
}

.service-editor-panel__text {
	margin: 0;
	max-width: 46rem;
	font-size: 0.88rem;
	line-height: 1.52;
	color: #5d6e7f;
}

.service-editor-field-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16px;
}

.service-editor-field {
	display: grid;
	gap: 7px;
	grid-column: 1 / -1;
}

.service-editor-field--half {
	grid-column: span 1;
}

.service-editor-label {
	font-size: 0.76rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #607181;
}

.service-editor-input,
.service-editor-textarea {
	width: 100%;
	min-width: 0;
	border: 1px solid #d8e4e8;
	border-radius: 14px;
	background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
	padding: 12px 14px;
	font-size: 0.92rem;
	color: #233547;
	box-shadow: inset 0 1px 2px rgba(20, 37, 48, 0.03);
	transition:
		border-color 180ms ease,
		box-shadow 180ms ease,
		background-color 180ms ease;
}

.service-editor-input:focus,
.service-editor-textarea:focus {
	outline: none;
	border-color: var(--color-brand-primary-light);
	box-shadow: 0 0 0 3px rgba(11, 89, 101, 0.1);
	background: #ffffff;
}

.service-editor-input--mono {
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
}

.service-editor-textarea {
	resize: vertical;
}

.service-editor-field__hint {
	margin: 0;
	font-size: 0.8rem;
	line-height: 1.45;
	color: #667789;
}

.service-editor-toggle-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding-top: 4px;
	border-top: 1px solid #e7eef2;
}

.service-editor-toggle-copy {
	display: grid;
	gap: 4px;
	max-width: 34rem;
}

.service-editor-toggle-copy__label {
	font-size: 0.76rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #607181;
}

.service-editor-toggle-copy__text {
	margin: 0;
	font-size: 0.86rem;
	line-height: 1.5;
	color: #5d6e7f;
}

.service-editor-toggle-control {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	justify-content: flex-end;
}

.service-editor-toggle {
	position: relative;
	width: 52px;
	height: 30px;
	border: 0;
	border-radius: 999px;
	background: #c6d0d6;
	cursor: pointer;
	transition: background-color 180ms ease;
}

.service-editor-toggle--active {
	background: var(--color-brand-primary-light);
}

.service-editor-toggle__thumb {
	position: absolute;
	top: 3px;
	left: 3px;
	width: 24px;
	height: 24px;
	border-radius: 999px;
	background: #ffffff;
	box-shadow: 0 6px 14px rgba(20, 37, 48, 0.16);
	transition: transform 180ms ease;
}

.service-editor-toggle__thumb--active {
	transform: translateX(22px);
}

.service-editor-state-pill {
	display: inline-flex;
	align-items: center;
	min-height: 32px;
	padding: 0 12px;
	border-radius: 999px;
	border: 1px solid #d5e1e5;
	background: #f7fbfc;
	font-size: 0.8rem;
	font-weight: 800;
	color: #516273;
}

.service-editor-state-pill--active {
	border-color: rgba(11, 89, 101, 0.24);
	background: rgba(11, 89, 101, 0.08);
	color: var(--color-brand-primary-light);
}

.service-editor-stack {
	display: grid;
	gap: 14px;
}

.service-editor-stack-card {
	position: relative;
	display: grid;
	gap: 14px;
	padding: 16px;
	border-radius: 18px;
	border: 1px solid #dde8ec;
	background: linear-gradient(180deg, #fbfcfd 0%, #f6fafb 100%);
	overflow: hidden;
}

.service-editor-stack-card::before {
	content: '';
	position: absolute;
	inset: 0 auto 0 0;
	width: 4px;
	background: linear-gradient(180deg, #dfe8ec 0%, #eef4f6 100%);
}

.service-editor-stack-card--teal::before {
	background: linear-gradient(180deg, var(--color-brand-primary-light) 0%, #2d8190 100%);
}

.service-editor-stack-card--orange::before {
	background: linear-gradient(180deg, #e45c20 0%, #f0a255 100%);
}

.service-editor-stack-card__head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.service-editor-stack-card__index {
	font-size: 0.8rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #607181;
}

.service-editor-stack-card__body {
	display: grid;
	gap: 10px;
}

.service-editor-remove {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 30px;
	padding: 0 11px;
	border: 1px solid rgba(228, 92, 32, 0.18);
	border-radius: 999px;
	background: #fff7f2;
	font-size: 0.78rem;
	font-weight: 800;
	color: #b84a17;
	transition:
		border-color 180ms ease,
		background-color 180ms ease,
		color 180ms ease;
}

.service-editor-remove:hover,
.service-editor-remove:focus-visible {
	outline: none;
	border-color: rgba(228, 92, 32, 0.28);
	background: #fff1e8;
	color: #9f3f13;
}

.service-editor-side {
	min-width: 0;
}

.service-editor-summary {
	display: grid;
	gap: 18px;
}

.service-editor-summary__top {
	display: grid;
	gap: 6px;
}

.service-editor-summary__list {
	display: grid;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.service-editor-summary__item {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	font-size: 0.88rem;
	line-height: 1.45;
	color: #5a6b7c;
}

.service-editor-summary__item--done {
	color: #1f2a3c;
	font-weight: 700;
}

.service-editor-summary__dot {
	width: 12px;
	height: 12px;
	flex: 0 0 12px;
	border-radius: 999px;
	border: 2px solid #c9d6db;
	background: #ffffff;
}

.service-editor-summary__item--done .service-editor-summary__dot {
	border-color: var(--color-brand-primary-light);
	background: var(--color-brand-primary-light);
	box-shadow: 0 0 0 4px rgba(11, 89, 101, 0.08);
}

.service-editor-summary__note {
	display: grid;
	gap: 4px;
	padding: 14px;
	border-radius: 16px;
	border: 1px solid #dbe7eb;
	background: linear-gradient(180deg, #fbfcfd 0%, #f5fafb 100%);
}

.service-editor-summary__note-title {
	margin: 0;
	font-size: 0.8rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #607181;
}

.service-editor-summary__note-text {
	margin: 0;
	font-size: 0.84rem;
	line-height: 1.5;
	color: #5d6e7f;
}

@media (min-width: 1024px) {
	.service-editor-layout {
		grid-template-columns: minmax(0, 1fr) 320px;
		align-items: start;
	}

	.service-editor-summary {
		position: sticky;
		top: 126px;
	}
}

@media (max-width: 1023.98px) {
	.service-editor-overview__stats,
	.service-editor-field-grid,
	.service-editor-panel__header--split {
		grid-template-columns: minmax(0, 1fr);
	}

	.service-editor-toggle-row,
	.service-editor-stack-card__head {
		flex-direction: column;
		align-items: stretch;
	}

	.service-editor-toggle-control {
		justify-content: flex-start;
	}
}

@media (max-width: 767.98px) {
	.service-editor-overview,
	.service-editor-panel,
	.service-editor-summary {
		gap: 16px;
	}

	.service-editor-stat,
	.service-editor-stack-card {
		padding: 14px;
	}
}
</style>
