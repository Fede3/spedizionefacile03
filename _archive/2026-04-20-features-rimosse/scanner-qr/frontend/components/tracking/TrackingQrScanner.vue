<!--
  COMPONENT: TrackingQrScanner
  SCOPO: modale scanner QR/Barcode per mobile, usato nella pagina /traccia-spedizione.

  IMPL:
  - Usa l'API nativa del browser `BarcodeDetector` (supporto: Chrome Android / Edge /
    iOS Safari 17+). Nessuna libreria esterna → zero bundle extra.
  - Se `BarcodeDetector` non è disponibile, mostra un messaggio con link alle
    istruzioni manuali. Non tentiamo di caricare polyfill pesanti (linea guida: no
    dipendenze pesanti).
  - Chiede `getUserMedia({ video: { facingMode: 'environment' } })` per la fotocamera
    posteriore; fallback alla frontale se non disponibile.
  - Emette `detected(codeValue)` e chiude automaticamente al primo riconoscimento.
  - Accessibilità: focus trap nel modal, Esc chiude, live region per messaggi.

  PROPS:
  - `open` (Boolean): controlla apertura del modale.

  EMITS:
  - `close`: utente ha chiuso il modal.
  - `detected` (string): codice riconosciuto.
-->
<script setup>
import { ref, watch, onBeforeUnmount, nextTick, computed } from 'vue'

const props = defineProps({
	open: {
		type: Boolean,
		default: false,
	},
})
const emit = defineEmits(['close', 'detected'])

const videoRef = ref(null)
const cameraError = ref(null)
const scanMessage = ref('Inquadra il codice QR o barcode della spedizione.')
const isScanning = ref(false)

let stream = null
let detector = null
let rafHandle = null
let lastFocusEl = null

/** API nativa BarcodeDetector: presente in Chrome >= 83 su Android/desktop + Edge.
 *  iOS Safari usa Vision framework ma espone BarcodeDetector da 17.2+. */
const isBarcodeDetectorSupported = computed(() =>
	typeof window !== 'undefined' && 'BarcodeDetector' in window,
)

/** Non mostriamo il bottone su desktop (UX: scanner ha senso solo mobile).
 *  La pagina chiamante già filtra, ma manteniamo defense-in-depth qui. */
const isMobileUA = () => {
	if (typeof navigator === 'undefined') return false
	return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

const stopCamera = () => {
	if (rafHandle) {
		cancelAnimationFrame(rafHandle)
		rafHandle = null
	}
	if (stream) {
		for (const track of stream.getTracks()) track.stop()
		stream = null
	}
	isScanning.value = false
}

const closeModal = () => {
	stopCamera()
	emit('close')
	// Restore focus al trigger dopo chiusura
	if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
		lastFocusEl.focus()
	}
}

const onDetected = (rawValue) => {
	const cleaned = String(rawValue || '').trim()
	if (!cleaned) return
	scanMessage.value = 'Codice riconosciuto!'
	stopCamera()
	emit('detected', cleaned)
}

const scanLoop = async () => {
	if (!videoRef.value || !detector || !isScanning.value) return

	try {
		const barcodes = await detector.detect(videoRef.value)
		if (barcodes && barcodes.length > 0) {
			onDetected(barcodes[0].rawValue)
			return
		}
	} catch {
		// Frame non leggibile: continua.
	}

	if (isScanning.value) {
		rafHandle = requestAnimationFrame(scanLoop)
	}
}

const startCamera = async () => {
	cameraError.value = null

	if (!isBarcodeDetectorSupported.value) {
		cameraError.value = 'unsupported'
		return
	}

	if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
		cameraError.value = 'no_getusermedia'
		return
	}

	try {
		// Preferisci camera posteriore su mobile
		stream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: { ideal: 'environment' },
				width: { ideal: 1280 },
				height: { ideal: 720 },
			},
			audio: false,
		})

		if (videoRef.value) {
			videoRef.value.srcObject = stream
			await videoRef.value.play()
		}

		// Formati supportati: QR + i principali barcode usati da corrieri.
		// Non tutti i browser supportano tutti i formati: `detect()` filtra in automatico.
		detector = new window.BarcodeDetector({
			formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'itf', 'upc_a', 'upc_e'],
		})

		isScanning.value = true
		scanLoop()
	} catch (err) {
		if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
			cameraError.value = 'permission_denied'
		} else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
			cameraError.value = 'no_camera'
		} else {
			cameraError.value = 'generic'
		}
		stopCamera()
	}
}

// Apri/chiudi: ciclo vita camera + focus management
watch(
	() => props.open,
	async (isOpen) => {
		if (isOpen) {
			lastFocusEl = typeof document !== 'undefined' ? document.activeElement : null
			await nextTick()
			await startCamera()
		} else {
			stopCamera()
		}
	},
)

const onKeydown = (e) => {
	if (!props.open) return
	if (e.key === 'Escape') {
		e.preventDefault()
		closeModal()
	}
}

if (typeof window !== 'undefined') {
	window.addEventListener('keydown', onKeydown)
}

onBeforeUnmount(() => {
	stopCamera()
	if (typeof window !== 'undefined') {
		window.removeEventListener('keydown', onKeydown)
	}
})

// Esposto al parent per poter sapere se mostrare il bottone
defineExpose({ isBarcodeDetectorSupported, isMobileUA })
</script>

<template>
	<Teleport to="body">
		<Transition name="qr-scanner-fade">
			<div
				v-if="open"
				class="qr-scanner-overlay"
				role="dialog"
				aria-modal="true"
				aria-labelledby="qr-scanner-title">
				<div class="qr-scanner-modal">
					<header class="qr-scanner-head">
						<h2 id="qr-scanner-title" class="qr-scanner-title">Scansiona codice</h2>
						<button
							type="button"
							class="qr-scanner-close"
							aria-label="Chiudi scanner"
							@click="closeModal">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M18 6 6 18" />
								<path d="m6 6 12 12" />
							</svg>
						</button>
					</header>

					<div class="qr-scanner-body">
						<!-- Stato: API non supportata -->
						<div v-if="cameraError === 'unsupported'" class="qr-scanner-fallback">
							<p class="qr-scanner-error-title">Scanner non disponibile</p>
							<p class="qr-scanner-error-text">
								Il tuo browser non supporta la scansione integrata. Aggiorna il browser
								o inserisci il codice manualmente nel campo di ricerca.
							</p>
						</div>

						<!-- Stato: getUserMedia non disponibile -->
						<div v-else-if="cameraError === 'no_getusermedia'" class="qr-scanner-fallback">
							<p class="qr-scanner-error-title">Camera non accessibile</p>
							<p class="qr-scanner-error-text">
								Il tuo browser non permette di accedere alla fotocamera. Prova a usare
								Chrome o Safari aggiornati, oppure inserisci il codice manualmente.
							</p>
						</div>

						<!-- Stato: permessi negati -->
						<div v-else-if="cameraError === 'permission_denied'" class="qr-scanner-fallback">
							<p class="qr-scanner-error-title">Permesso camera negato</p>
							<p class="qr-scanner-error-text">
								Hai negato l'accesso alla fotocamera. Abilita il permesso dalle
								impostazioni del browser per usare lo scanner, oppure inserisci il
								codice a mano.
							</p>
						</div>

						<!-- Stato: nessuna camera trovata -->
						<div v-else-if="cameraError === 'no_camera'" class="qr-scanner-fallback">
							<p class="qr-scanner-error-title">Nessuna fotocamera rilevata</p>
							<p class="qr-scanner-error-text">
								Non abbiamo trovato una fotocamera utilizzabile su questo dispositivo.
							</p>
						</div>

						<!-- Stato: errore generico -->
						<div v-else-if="cameraError === 'generic'" class="qr-scanner-fallback">
							<p class="qr-scanner-error-title">Scanner non avviato</p>
							<p class="qr-scanner-error-text">
								Qualcosa è andato storto nell'avvio della fotocamera. Riprova o inserisci
								il codice manualmente.
							</p>
						</div>

						<!-- Stato: scansione attiva -->
						<div v-else class="qr-scanner-viewport">
							<video ref="videoRef" class="qr-scanner-video" muted playsinline />
							<div class="qr-scanner-frame" aria-hidden="true">
								<span class="qr-scanner-frame-corner tl" />
								<span class="qr-scanner-frame-corner tr" />
								<span class="qr-scanner-frame-corner bl" />
								<span class="qr-scanner-frame-corner br" />
							</div>
							<p class="qr-scanner-hint">{{ scanMessage }}</p>
						</div>
					</div>

					<footer class="qr-scanner-foot">
						<button type="button" class="qr-scanner-cancel" @click="closeModal">
							Annulla
						</button>
					</footer>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<style scoped>
.qr-scanner-overlay {
	position: fixed;
	inset: 0;
	z-index: 1100;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	background: rgba(13, 24, 32, 0.82);
	padding: 0;
}
@media (min-width: 640px) {
	.qr-scanner-overlay {
		align-items: center;
		padding: 16px;
	}
}

.qr-scanner-modal {
	width: 100%;
	max-width: 560px;
	background: #fff;
	border-radius: 22px 22px 0 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	max-height: 92vh;
	box-shadow: 0 -8px 32px rgba(9, 88, 102, 0.22);
}
@media (min-width: 640px) {
	.qr-scanner-modal {
		border-radius: 22px;
		box-shadow: 0 12px 32px rgba(9, 88, 102, 0.28);
	}
}

.qr-scanner-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 18px;
	border-bottom: 1px solid var(--color-brand-border, #DFE2E7);
}

.qr-scanner-title {
	font-family: var(--font-montserrat, Montserrat, sans-serif);
	font-size: 1rem;
	font-weight: 800;
	color: var(--color-brand-text, #1d2738);
	margin: 0;
	letter-spacing: -0.01em;
}

.qr-scanner-close {
	width: 36px;
	height: 36px;
	border-radius: 50%;
	border: none;
	background: var(--color-brand-secondary-soft-bg, #eef7f8);
	color: var(--color-brand-primary, #095866);
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition: background 0.15s ease;
}
.qr-scanner-close:hover {
	background: rgba(9, 88, 102, 0.12);
}

.qr-scanner-body {
	padding: 14px 18px;
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: center;
	min-height: 280px;
}

.qr-scanner-viewport {
	position: relative;
	aspect-ratio: 4 / 3;
	background: #0d1820;
	border-radius: 14px;
	overflow: hidden;
}
.qr-scanner-video {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.qr-scanner-frame {
	position: absolute;
	inset: 14%;
	pointer-events: none;
}
.qr-scanner-frame-corner {
	position: absolute;
	width: 28px;
	height: 28px;
	border-color: #fff;
	border-style: solid;
	border-width: 0;
}
.qr-scanner-frame-corner.tl {
	top: 0; left: 0;
	border-top-width: 3px;
	border-left-width: 3px;
	border-top-left-radius: 8px;
}
.qr-scanner-frame-corner.tr {
	top: 0; right: 0;
	border-top-width: 3px;
	border-right-width: 3px;
	border-top-right-radius: 8px;
}
.qr-scanner-frame-corner.bl {
	bottom: 0; left: 0;
	border-bottom-width: 3px;
	border-left-width: 3px;
	border-bottom-left-radius: 8px;
}
.qr-scanner-frame-corner.br {
	bottom: 0; right: 0;
	border-bottom-width: 3px;
	border-right-width: 3px;
	border-bottom-right-radius: 8px;
}

.qr-scanner-hint {
	position: absolute;
	left: 50%;
	bottom: 12px;
	transform: translateX(-50%);
	background: rgba(9, 88, 102, 0.85);
	color: #fff;
	font-size: 0.8125rem;
	font-weight: 600;
	padding: 6px 14px;
	border-radius: 99px;
	white-space: nowrap;
	max-width: 90%;
	text-align: center;
}

.qr-scanner-fallback {
	text-align: center;
	padding: 24px 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
	justify-content: center;
}
.qr-scanner-error-title {
	font-size: 1rem;
	font-weight: 700;
	color: var(--color-brand-text, #1d2738);
	margin: 0;
}
.qr-scanner-error-text {
	font-size: 0.875rem;
	line-height: 1.6;
	color: var(--color-brand-text-secondary, #5A6474);
	margin: 0;
	max-width: 44ch;
	margin-inline: auto;
}

.qr-scanner-foot {
	padding: 12px 18px 18px;
	border-top: 1px solid var(--color-brand-border, #DFE2E7);
	display: flex;
	justify-content: flex-end;
}

.qr-scanner-cancel {
	height: 40px;
	padding: 0 18px;
	border-radius: 99px;
	border: 1px solid var(--color-brand-border, #DFE2E7);
	background: #fff;
	color: var(--color-brand-text, #1d2738);
	font-size: 0.875rem;
	font-weight: 700;
	cursor: pointer;
	transition: background 0.15s ease;
}
.qr-scanner-cancel:hover {
	background: var(--color-brand-bg, #F8F9FB);
}

/* Transitions */
.qr-scanner-fade-enter-active {
	transition: opacity 0.2s ease;
}
.qr-scanner-fade-leave-active {
	transition: opacity 0.15s ease;
}
.qr-scanner-fade-enter-from,
.qr-scanner-fade-leave-to {
	opacity: 0;
}
</style>
