<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFaqs, type FaqCategory } from '~/composables/useFaqs';

const { faqs, categories, highlightMatch, escapeHtml } = useFaqs();
const faqCategories = computed(() => categories as FaqCategory[]);

// ── Stato UI ─────────────────────────────────────────────────
const searchQuery = ref('');
const activeCategory = ref<FaqCategory | 'Tutte'>('Tutte');
const searchInputRef = ref<HTMLInputElement | null>(null);

// ── Computed ─────────────────────────────────────────────────
const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());

const filteredFaqs = computed(() => {
	const q = normalizedQuery.value;
	return faqs.filter((item) => {
		const matchesCat =
			activeCategory.value === 'Tutte' || item.category === activeCategory.value;
		if (!matchesCat) return false;
		if (!q) return true;
		return (
			item.question.toLowerCase().includes(q) ||
			item.answer.toLowerCase().includes(q)
		);
	});
});

const countByCategory = computed(() => {
	const map: Record<string, number> = { Tutte: faqs.length };
	for (const cat of categories) map[cat] = 0;
	for (const item of faqs) map[item.category] = (map[item.category] || 0) + 1;
	return map;
});

const hasResults = computed(() => filteredFaqs.value.length > 0);
const totalFaqs = faqs.length;

// ── Azioni ───────────────────────────────────────────────────
function selectCategory(cat: FaqCategory | 'Tutte') {
	activeCategory.value = cat;
}

function resetFilters() {
	searchQuery.value = '';
	activeCategory.value = 'Tutte';
	searchInputRef.value?.focus();
}

function focusSearch() {
	searchInputRef.value?.focus();
}

// ── SEO ──────────────────────────────────────────────────────
useSeoMeta({
	title: 'FAQ — Domande frequenti',
	ogTitle: 'FAQ — Domande frequenti SpedizioneFacile',
	description:
		'Tutte le risposte su spedizioni, preventivi, pagamenti, tracking, reclami, account e profilo Pro. Cerca subito la tua domanda o contatta un operatore.',
	ogDescription:
		'Domande frequenti SpedizioneFacile: spedizione, preventivi, pagamenti, tracking, reclami, account e Pro. Cerca o parla con un operatore.',
});

// Breadcrumb: Home › FAQ
useBreadcrumbSchema([
	{ name: 'Home', url: '/' },
	{ name: 'FAQ' },
]);

// JSON-LD FAQPage con TUTTE le FAQ per rich snippet Google.
useHead({
	htmlAttrs: { class: 'scroll-smooth' },
	script: [
		{
			type: 'application/ld+json',
			innerHTML: JSON.stringify({
				'@context': 'https://schema.org',
				'@type': 'FAQPage',
				mainEntity: faqs.map((item) => ({
					'@type': 'Question',
					name: item.question,
					acceptedAnswer: {
						'@type': 'Answer',
						text: item.answer,
					},
				})),
			}),
		},
	],
});
</script>

<template>
	<div class="bg-[#FAFAF7] text-[#1A1A1A] pb-[clamp(40px,6vw,80px)]">
		<!-- Skip-to-content (accessibilità) -->
		<a href="#faq-list" class="faq-skip-link">Vai alla lista delle domande</a>

		<!-- HERO -->
		<PublicPageHeader
			eyebrow="Centro assistenza"
			title="Domande frequenti"
			:description="`${totalFaqs} risposte chiare su spedizioni, preventivi, pagamenti, tracking, reclami, account e profilo Pro. Cerca una parola chiave o esplora per categoria.`"
			:crumbs="[{ label: 'Home', to: '/' }, { label: 'FAQ' }]">
			<label class="faq-search" :class="{ 'is-filled': searchQuery.length > 0 }">
				<span class="sr-only">Cerca tra le domande frequenti</span>
				<svg class="text-[#095866] shrink-0" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>
				<input ref="searchInputRef" v-model="searchQuery" type="search" class="faq-search__input" placeholder="Cerca: contrassegno, ritiro, fattura, reclamo..." autocomplete="off" aria-label="Cerca tra le domande frequenti">
				<button v-if="searchQuery" type="button" class="faq-search__clear" aria-label="Cancella ricerca" @click="searchQuery = ''">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</label>
		</PublicPageHeader>

		<!-- CHIP CATEGORIE -->
		<section class="py-[clamp(16px,2.5vw,28px)] [&]:pb-[clamp(8px,1.5vw,16px)]" aria-label="Filtra per categoria">
			<div class="my-container">
				<div class="flex flex-wrap gap-2.5" role="tablist">
					<button
						type="button"
						class="faq-chip"
						:class="{ 'is-active': activeCategory === 'Tutte' }"
						role="tab"
						:aria-selected="activeCategory === 'Tutte'"
						@click="selectCategory('Tutte')"
					>
						<span>Tutte</span>
						<span class="faq-chip__count">{{ countByCategory['Tutte'] }}</span>
					</button>
					<button
						v-for="cat in faqCategories"
						:key="cat"
						type="button"
						class="faq-chip"
						:class="{ 'is-active': activeCategory === cat }"
						role="tab"
						:aria-selected="activeCategory === cat"
						@click="selectCategory(cat)"
					>
						<span>{{ cat }}</span>
						<span class="faq-chip__count">{{ countByCategory[cat] }}</span>
					</button>
				</div>
			</div>
		</section>

		<!-- BODY: lista + sidebar sticky -->
		<section class="pt-[clamp(20px,3vw,32px)]">
			<div class="my-container grid grid-cols-1 gap-[clamp(28px,4vw,48px)] lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
				<!-- Colonna principale: lista accordion -->
				<div id="faq-list">
					<header class="flex flex-wrap items-baseline justify-between gap-4 mb-[18px]">
						<h2 class="m-0 text-xl font-bold tracking-[-0.01em] text-[#0E1F24]">
							<template v-if="activeCategory === 'Tutte'">Tutte le domande</template>
							<template v-else>Categoria: {{ activeCategory }}</template>
						</h2>
						<p class="m-0 text-sm text-[#4A5358]" aria-live="polite">
							{{ filteredFaqs.length }} risultat{{ filteredFaqs.length === 1 ? 'o' : 'i' }}
							<template v-if="searchQuery"> per "{{ searchQuery }}"</template>
						</p>
					</header>

					<!-- Empty state -->
					<div v-if="!hasResults" class="bg-white border-[1.5px] border-dashed border-[#D8DAD3] rounded-2xl px-6 py-9 text-center" role="status">
						<div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3.5 text-[#095866] bg-[rgba(9,88,102,0.08)]" aria-hidden="true">
							<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="11" cy="11" r="8" />
								<path d="m21 21-4.3-4.3" />
								<path d="M8 11h6" />
							</svg>
						</div>
						<h3 class="m-0 mb-1.5 text-lg font-bold text-[#0E1F24]">Nessuna domanda trovata</h3>
						<p class="m-0 mb-[18px] text-[#4A5358] text-[0.9375rem]">
							Non abbiamo trovato risposte per la tua ricerca. Prova a cambiare parole
							chiave o resetta i filtri.
						</p>
						<div class="flex flex-wrap justify-center gap-2.5">
							<SfButton variant="secondary" @click="resetFilters">
								Resetta filtri
							</SfButton>
							<SfButton to="/contatti">
								Contatta un operatore
							</SfButton>
						</div>
					</div>

					<!-- Lista accordion <details> nativi -->
					<ul v-else class="list-none m-0 p-0 flex flex-col gap-3" role="list">
						<li
							v-for="(item, index) in filteredFaqs"
							:key="item.id"
							class="m-0"
						>
							<details
								:id="`faq-${item.id}`"
								class="faq-details"
								:open="index === 0 && !!searchQuery"
							>
								<summary class="faq-details__summary">
									<span class="faq-details__cat">{{ item.category }}</span>
									<span
										class="text-[clamp(0.9375rem,1.6vw,1.0625rem)] font-semibold text-[#0E1F24] leading-[1.4]"
										v-html="highlightMatch(item.question, searchQuery)"
									/>
									<span class="faq-details__chev" aria-hidden="true">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="m6 9 6 6 6-6" />
										</svg>
									</span>
								</summary>
								<div class="faq-details__panel">
									<p
										class="m-0 px-5 pb-[18px] text-[#36404A] text-[0.9375rem] leading-[1.65]"
										v-html="highlightMatch(item.answer, searchQuery)"
									/>
									<div class="px-5 pb-[18px] flex gap-3">
										<a
											:href="`#faq-${item.id}`"
											class="faq-permalink"
											aria-label="Copia link a questa domanda"
										>
											# Link diretto
										</a>
									</div>
								</div>
							</details>
						</li>
					</ul>

					<!-- CTA "Non hai trovato risposta?" -->
					<aside class="faq-bottom-cta" aria-label="Hai bisogno di altro aiuto?">
						<div>
							<h3 class="m-0 mb-1.5 text-xl font-bold tracking-[-0.01em]">Non hai trovato risposta?</h3>
							<p class="m-0 text-[0.9375rem] leading-[1.55] text-white/85">
								Scrivici o accedi al supporto: rispondiamo in giornata, in italiano,
								da persone vere.
							</p>
						</div>
						<div class="flex flex-wrap gap-2.5">
							<SfButton to="/contatti">
								Vai ai contatti
							</SfButton>
							<SfButton variant="secondary" to="/account/supporto">
								Apri ticket supporto
							</SfButton>
						</div>
					</aside>
				</div>

				<!-- Sidebar sticky desktop: operatore -->
				<aside aria-label="Parla con un operatore">
					<div class="faq-side__card">
						<div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3.5 text-[#E44203] bg-[rgba(228,66,3,0.12)]" aria-hidden="true">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="22"
								height="22"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path
									d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 0 0-1.02.24l-2.2 2.2a15.05 15.05 0 0 1-6.59-6.58l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1 17 17 0 0 0 17 17 1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1Z"
								/>
							</svg>
						</div>
						<h3 class="m-0 mb-1.5 text-lg font-bold tracking-[-0.01em] text-[#0E1F24]">Parla con un operatore</h3>
						<p class="m-0 mb-[18px] text-[#4A5358] text-[0.9375rem] leading-[1.55]">
							Quando la FAQ non basta, un consulente SpedizioneFacile risponde via
							telefono, email o ticket.
						</p>

						<dl class="flex flex-col gap-3 m-0 mb-[22px] pt-[18px] border-t border-[#EFEDE5]">
							<div class="grid grid-cols-[100px_1fr] gap-2 items-baseline">
								<dt class="text-xs uppercase tracking-[0.06em] font-bold text-[#8A9098]">Numero verde</dt>
								<dd class="m-0 text-[#0E1F24] text-[0.9375rem] leading-[1.5]">
									<a href="tel:800123456" class="faq-link">800 12 34 56</a>
								</dd>
							</div>
							<div class="grid grid-cols-[100px_1fr] gap-2 items-baseline">
								<dt class="text-xs uppercase tracking-[0.06em] font-bold text-[#8A9098]">Email</dt>
								<dd class="m-0 text-[#0E1F24] text-[0.9375rem] leading-[1.5]">
									<a href="mailto:supporto@spediamofacile.it" class="faq-link">
										supporto@spediamofacile.it
									</a>
								</dd>
							</div>
							<div class="grid grid-cols-[100px_1fr] gap-2 items-baseline">
								<dt class="text-xs uppercase tracking-[0.06em] font-bold text-[#8A9098]">Orari</dt>
								<dd class="m-0 text-[#0E1F24] text-[0.9375rem] leading-[1.5]">Lun-Ven 9:00-18:00<br>Sab 9:00-13:00</dd>
							</div>
						</dl>

						<div class="flex flex-col gap-2.5">
							<SfButton to="/contatti" class="w-full justify-center">
								Contattaci ora
							</SfButton>
							<SfButton variant="secondary" class="w-full justify-center" @click="focusSearch">
								Cerca un'altra domanda
							</SfButton>
						</div>
					</div>
				</aside>
			</div>
		</section>
	</div>
</template>

<style scoped>
/* Skip link a11y: visibile solo su focus */
.faq-skip-link {
	position: absolute;
	left: -9999px;
	top: 8px;
	background: #095866;
	color: #fff;
	padding: 10px 16px;
	border-radius: 8px;
	font-weight: 600;
	z-index: 100;
	text-decoration: none;
}
.faq-skip-link:focus { left: 16px; outline: 2px solid #E44203; outline-offset: 2px; }

/* Search input: stato focus + filled gestiti via :focus-within e .is-filled */
.faq-search {
	display: flex;
	align-items: center;
	gap: 12px;
	background: #fff;
	border: 1.5px solid #D8DAD3;
	border-radius: 14px;
	padding: 14px 18px;
	box-shadow: 0 4px 14px rgba(9, 88, 102, 0.06);
	transition: border-color 160ms ease, box-shadow 160ms ease;
}
.faq-search:focus-within { border-color: #095866; box-shadow: 0 6px 18px rgba(9, 88, 102, 0.14); }
.faq-search.is-filled { border-color: #095866; }
.faq-search__input {
	flex: 1 1 auto;
	border: 0;
	outline: 0;
	background: transparent;
	font-size: 1rem;
	color: #0E1F24;
	min-width: 0;
}
.faq-search__input::placeholder { color: #8A9098; }
.faq-search__input::-webkit-search-cancel-button { display: none; }
.faq-search__clear {
	border: 0;
	background: #F1EFE8;
	color: #4A5358;
	width: 30px;
	height: 30px;
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: background 140ms ease, color 140ms ease;
}
.faq-search__clear:hover { background: #E44203; color: #fff; }
.faq-search__clear:focus-visible { outline: 2px solid #E44203; outline-offset: 2px; }

/* Chip categoria: pill con stato attivo + counter */
.faq-chip {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 9px 16px;
	border: 1.5px solid #D8DAD3;
	background: #fff;
	border-radius: 999px;
	font-size: 0.9375rem;
	font-weight: 600;
	color: #0E1F24;
	cursor: pointer;
	transition: background 160ms ease, color 160ms ease, border-color 160ms ease, transform 120ms ease;
}
.faq-chip:hover { border-color: #095866; color: #095866; transform: translateY(-1px); }
.faq-chip.is-active { background: #095866; color: #fff; border-color: #095866; }
.faq-chip.is-active .faq-chip__count { background: rgba(255, 255, 255, 0.18); color: #fff; }
.faq-chip:focus-visible { outline: 2px solid #E44203; outline-offset: 2px; }
.faq-chip__count {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 24px;
	height: 22px;
	padding: 0 7px;
	border-radius: 999px;
	background: #F1EFE8;
	color: #4A5358;
	font-size: 0.75rem;
	font-weight: 700;
	transition: background 160ms ease, color 160ms ease;
}

/* Accordion <details>: animazione grid-template-rows + chevron rotate */
.faq-details {
	background: #fff;
	border: 1.5px solid #E5E2D8;
	border-radius: 14px;
	overflow: hidden;
	transition: border-color 180ms ease, box-shadow 180ms ease;
	scroll-margin-top: 96px;
}
.faq-details:hover { border-color: #095866; }
.faq-details[open] { border-color: #095866; box-shadow: 0 6px 22px rgba(9, 88, 102, 0.08); }
.faq-details__summary {
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	gap: 16px;
	padding: 18px 20px;
	cursor: pointer;
	list-style: none;
	user-select: none;
}
.faq-details__summary::-webkit-details-marker { display: none; }
.faq-details__summary:focus-visible { outline: 2px solid #E44203; outline-offset: -2px; }
.faq-details__cat {
	display: inline-flex;
	align-items: center;
	padding: 4px 10px;
	background: rgba(9, 88, 102, 0.08);
	color: #095866;
	border-radius: 999px;
	font-size: 0.6875rem;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	white-space: nowrap;
}
.faq-details__chev {
	width: 32px;
	height: 32px;
	border-radius: 999px;
	background: #F1EFE8;
	color: #095866;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition: background 180ms ease, color 180ms ease, transform 220ms ease;
	flex-shrink: 0;
}
.faq-details[open] .faq-details__chev { background: #E44203; color: #fff; transform: rotate(180deg); }
.faq-details__panel {
	display: grid;
	grid-template-rows: 0fr;
	transition: grid-template-rows 280ms ease;
}
.faq-details[open] .faq-details__panel { grid-template-rows: 1fr; }
.faq-details__panel > * { overflow: hidden; }

/* Permalink + highlight match (markup di useFaqs usa <mark class="faq-mark">) */
.faq-permalink {
	font-size: 0.8125rem;
	color: #095866;
	font-weight: 600;
	text-decoration: none;
	border-bottom: 1px dotted #095866;
	padding-bottom: 1px;
}
.faq-permalink:hover { color: #E44203; border-color: #E44203; }
:deep(.faq-mark) {
	background: rgba(228, 66, 3, 0.18);
	color: #6E2401;
	padding: 1px 3px;
	border-radius: 3px;
	font-weight: 700;
}

/* CTA finale teal + override .btn dentro la fascia per contrasto */
.faq-bottom-cta {
	margin-top: clamp(28px, 4vw, 44px);
	display: grid;
	grid-template-columns: 1fr;
	gap: 18px;
	padding: clamp(22px, 3vw, 32px);
	background: linear-gradient(135deg, #095866 0%, #0B6B7C 100%);
	color: #fff;
	border-radius: 18px;
	box-shadow: 0 14px 38px rgba(9, 88, 102, 0.18);
}
@media (min-width: 720px) {
	.faq-bottom-cta { grid-template-columns: 1fr auto; align-items: center; }
}
.faq-bottom-cta :deep(.btn-primary) {
	background: var(--color-brand-accent);
	border-color: var(--color-brand-accent);
	color: #fff;
}
.faq-bottom-cta :deep(.btn-primary:hover) {
	background: var(--color-brand-accent-hover);
	border-color: var(--color-brand-accent-hover);
}
.faq-bottom-cta :deep(.btn-secondary) {
	background: transparent;
	border-color: rgba(255, 255, 255, 0.6);
	color: #fff;
}
.faq-bottom-cta :deep(.btn-secondary:hover) {
	background: rgba(255, 255, 255, 0.12);
	border-color: #fff;
}

/* Sidebar card: sticky su desktop */
.faq-side__card {
	background: #fff;
	border: 1.5px solid #E5E2D8;
	border-radius: 18px;
	padding: 24px;
	box-shadow: 0 6px 18px rgba(9, 88, 102, 0.06);
}
@media (min-width: 1024px) {
	.faq-side__card { position: sticky; top: 96px; }
}
.faq-link {
	color: #095866;
	text-decoration: none;
	font-weight: 600;
	border-bottom: 1px dotted #095866;
}
.faq-link:hover { color: #E44203; border-color: #E44203; }
</style>
