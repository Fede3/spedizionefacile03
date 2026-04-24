<!--
	CookiePreferencesModal.vue — Modale preferenze cookie granulari (GDPR).

	Aperto dal CookieBanner via prop `modelValue`.
	A11y: role="dialog", aria-modal, focus trap, ESC chiude, focus restore.
	Design: card centrale, radius 14, palette teal/arancione. Mai blu.
	Zero dipendenze: usa <Transition> Vue e gestione focus nativa.
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
	modelValue: boolean
	initialAnalytics?: boolean
	initialMarketing?: boolean
}>()

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void
	(e: 'save', value: { analytics: boolean; marketing: boolean }): void
	(e: 'accept-all'): void
}>()

defineOptions({ name: 'ConsentCookiePreferencesModal' })

const analytics = ref<boolean>(Boolean(props.initialAnalytics))
const marketing = ref<boolean>(Boolean(props.initialMarketing))

const dialogRef = ref<HTMLDivElement | null>(null)
const previousActiveElement = ref<HTMLElement | null>(null)

const titleId = 'cookie-preferences-title'
const descId = 'cookie-preferences-desc'

const close = () => emit('update:modelValue', false)

const onSave = () => {
	emit('save', { analytics: analytics.value, marketing: marketing.value })
	close()
}

const onAcceptAll = () => {
	analytics.value = true
	marketing.value = true
	emit('accept-all')
	close()
}

// --- Focus trap minimale ---------------------------------------------------
const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(',')

const getFocusable = (): HTMLElement[] => {
	if (!dialogRef.value) return []
	return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
		.filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)
}

const onKeydown = (event: KeyboardEvent) => {
	if (!props.modelValue) return
	if (event.key === 'Escape') {
		event.preventDefault()
		close()
		return
	}
	if (event.key === 'Tab') {
		const focusable = getFocusable()
		if (focusable.length === 0) return
		const first = focusable[0]
		const last = focusable[focusable.length - 1]
		const active = document.activeElement as HTMLElement | null
		if (event.shiftKey && active === first) {
			event.preventDefault()
			last.focus()
		} else if (!event.shiftKey && active === last) {
			event.preventDefault()
			first.focus()
		}
	}
}

const lockScroll = (locked: boolean) => {
	if (typeof document === 'undefined') return
	document.documentElement.style.overflow = locked ? 'hidden' : ''
}

watch(
	() => props.modelValue,
	async (open) => {
		if (open) {
			analytics.value = Boolean(props.initialAnalytics)
			marketing.value = Boolean(props.initialMarketing)
			previousActiveElement.value = (document.activeElement as HTMLElement | null) ?? null
			lockScroll(true)
			document.addEventListener('keydown', onKeydown, true)
			await nextTick()
			const focusable = getFocusable()
			focusable[0]?.focus()
		} else {
			lockScroll(false)
			document.removeEventListener('keydown', onKeydown, true)
			previousActiveElement.value?.focus?.()
		}
	},
)

onBeforeUnmount(() => {
	lockScroll(false)
	document.removeEventListener('keydown', onKeydown, true)
})

const onBackdropClick = (event: MouseEvent) => {
	if (event.target === event.currentTarget) close()
}

const visible = computed(() => props.modelValue)
</script>

<template>
	<Teleport to="body">
		<Transition name="cookie-modal">
			<div
				v-if="visible"
				class="cookie-modal__backdrop"
				@click="onBackdropClick"
			>
				<div
					ref="dialogRef"
					class="cookie-modal__dialog"
					role="dialog"
					aria-modal="true"
					:aria-labelledby="titleId"
					:aria-describedby="descId"
				>
					<header class="cookie-modal__header">
						<p class="cookie-modal__eyebrow">Cookie e privacy</p>
						<h2 :id="titleId" class="cookie-modal__title">Preferenze cookie</h2>
						<p :id="descId" class="cookie-modal__desc">
							Scegli quali categorie attivare. Puoi modificare queste preferenze in qualsiasi momento dalla
							<NuxtLink to="/cookie-policy" class="cookie-modal__link">cookie policy</NuxtLink>.
						</p>
					</header>

					<ul class="cookie-modal__list" role="list">
						<li class="cookie-modal__item">
							<div class="cookie-modal__item-text">
								<span class="cookie-modal__item-title">Essenziali</span>
								<span class="cookie-modal__item-desc">
									Necessari al funzionamento del sito (autenticazione, carrello, sicurezza). Sempre attivi.
								</span>
							</div>
							<label class="cookie-modal__toggle cookie-modal__toggle--locked">
								<input type="checkbox" checked disabled aria-label="Cookie essenziali sempre attivi" />
								<span class="cookie-modal__toggle-track" aria-hidden="true">
									<span class="cookie-modal__toggle-thumb"></span>
								</span>
							</label>
						</li>
						<li class="cookie-modal__item">
							<div class="cookie-modal__item-text">
								<span class="cookie-modal__item-title">Analitici</span>
								<span class="cookie-modal__item-desc">
									Ci aiutano a capire come usi il sito in forma aggregata e anonima per migliorare l'esperienza.
								</span>
							</div>
							<label class="cookie-modal__toggle">
								<input v-model="analytics" type="checkbox" aria-label="Attiva cookie analitici" />
								<span class="cookie-modal__toggle-track" aria-hidden="true">
									<span class="cookie-modal__toggle-thumb"></span>
								</span>
							</label>
						</li>
						<li class="cookie-modal__item">
							<div class="cookie-modal__item-text">
								<span class="cookie-modal__item-title">Marketing</span>
								<span class="cookie-modal__item-desc">
									Permettono di mostrarti contenuti e offerte rilevanti su altri siti partner.
								</span>
							</div>
							<label class="cookie-modal__toggle">
								<input v-model="marketing" type="checkbox" aria-label="Attiva cookie marketing" />
								<span class="cookie-modal__toggle-track" aria-hidden="true">
									<span class="cookie-modal__toggle-thumb"></span>
								</span>
							</label>
						</li>
					</ul>

					<footer class="cookie-modal__actions">
						<button type="button" class="btn btn-secondary cookie-modal__btn" @click="onSave">
							Salva preferenze
						</button>
						<button type="button" class="btn btn-cta cookie-modal__btn" @click="onAcceptAll">
							Accetta tutti
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.cookie-modal__backdrop {
	position: fixed;
	inset: 0;
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1rem;
	background: rgba(15, 23, 42, 0.45);
	backdrop-filter: blur(6px);
	-webkit-backdrop-filter: blur(6px);
}

.cookie-modal__dialog {
	width: 100%;
	max-width: 520px;
	max-height: calc(100vh - 2rem);
	overflow-y: auto;
	background: #ffffff;
	border-radius: 14px;
	border: 1px solid rgba(9, 88, 102, 0.12);
	box-shadow:
		0 24px 64px rgba(15, 23, 42, 0.18),
		0 4px 12px rgba(15, 23, 42, 0.08);
	padding: 1.5rem;
}

.cookie-modal__eyebrow {
	margin: 0 0 0.35rem;
	font-size: 0.7rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--color-brand-secondary, #e44203);
}

.cookie-modal__title {
	font-family: var(--font-montserrat, 'Montserrat', sans-serif);
	font-size: 1.25rem;
	font-weight: 800;
	color: var(--color-brand-text, #1d2738);
	margin: 0 0 0.5rem;
	letter-spacing: -0.01em;
}

.cookie-modal__desc {
	margin: 0 0 1.25rem;
	font-size: 0.9rem;
	line-height: 1.5;
	color: var(--color-brand-text-secondary, #525252);
}

.cookie-modal__link {
	color: var(--color-brand-primary, #095866);
	font-weight: 600;
	text-decoration: underline;
	text-underline-offset: 2px;
}

.cookie-modal__list {
	list-style: none;
	padding: 0;
	margin: 0 0 1.25rem;
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.cookie-modal__item {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.85rem 1rem;
	border: 1px solid rgba(9, 88, 102, 0.12);
	border-radius: 14px;
	background: #fafbfc;
}

.cookie-modal__item-text {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	min-width: 0;
}

.cookie-modal__item-title {
	font-size: 0.95rem;
	font-weight: 700;
	color: var(--color-brand-text, #1d2738);
}

.cookie-modal__item-desc {
	font-size: 0.8125rem;
	line-height: 1.45;
	color: var(--color-brand-text-secondary, #525252);
}

/* Toggle accessibile (no libreria esterna) ---------------------------------- */
.cookie-modal__toggle {
	position: relative;
	flex: 0 0 auto;
	display: inline-flex;
	align-items: center;
	cursor: pointer;
	user-select: none;
}

.cookie-modal__toggle input {
	position: absolute;
	opacity: 0;
	inset: 0;
	width: 100%;
	height: 100%;
	margin: 0;
	cursor: pointer;
}

.cookie-modal__toggle--locked,
.cookie-modal__toggle--locked input {
	cursor: not-allowed;
}

.cookie-modal__toggle-track {
	display: inline-flex;
	width: 44px;
	height: 26px;
	border-radius: 999px;
	background: #d8dde2;
	position: relative;
	transition: background 160ms ease;
}

.cookie-modal__toggle-thumb {
	position: absolute;
	top: 3px;
	left: 3px;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: #ffffff;
	box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
	transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}

.cookie-modal__toggle input:checked + .cookie-modal__toggle-track {
	background: var(--color-brand-primary, #095866);
}

.cookie-modal__toggle input:checked + .cookie-modal__toggle-track .cookie-modal__toggle-thumb {
	transform: translateX(18px);
}

.cookie-modal__toggle--locked .cookie-modal__toggle-track {
	background: var(--color-brand-primary, #095866);
	opacity: 0.55;
}

.cookie-modal__toggle--locked .cookie-modal__toggle-thumb {
	transform: translateX(18px);
}

.cookie-modal__toggle input:focus-visible + .cookie-modal__toggle-track {
	outline: 2px solid var(--color-brand-secondary, #e44203);
	outline-offset: 2px;
}

.cookie-modal__actions {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.cookie-modal__btn {
	width: 100%;
	min-height: 46px;
	font-weight: 700;
}

@media (min-width: 480px) {
	.cookie-modal__actions {
		flex-direction: row;
		justify-content: flex-end;
	}
	.cookie-modal__btn {
		width: auto;
		min-width: 180px;
	}
}

/* Transizione apertura/chiusura --------------------------------------------- */
.cookie-modal-enter-active,
.cookie-modal-leave-active {
	transition: opacity 200ms ease;
}
.cookie-modal-enter-active .cookie-modal__dialog,
.cookie-modal-leave-active .cookie-modal__dialog {
	transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease;
}
.cookie-modal-enter-from,
.cookie-modal-leave-to {
	opacity: 0;
}
.cookie-modal-enter-from .cookie-modal__dialog,
.cookie-modal-leave-to .cookie-modal__dialog {
	transform: translateY(12px) scale(0.98);
	opacity: 0;
}
</style>
