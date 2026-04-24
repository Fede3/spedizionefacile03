<!-- PAGINA: Reclami (reclami.vue) -->
<script setup lang="ts">
import '~/assets/css/legal.css';

useSeoMeta({
	title: 'Reclami | SpediamoFacile',
	ogTitle: 'Reclami | SpediamoFacile',
	description: 'Apri un reclamo sulla tua spedizione, allega foto e segui lo stato fino alla risoluzione.',
});

const { user, loggedIn } = useSanctumAuth();
const sanctum = useSanctumClient() as any;
const route = useRoute();

type ClaimAttachment = {
	id: number;
	original_name: string;
	mime_type: string;
	size_bytes: number;
	is_image: boolean;
	download_url: string;
};

type Claim = {
	id: number;
	order_id: number;
	claim_type: string;
	claim_type_label: string;
	status: string;
	status_label: string;
	description: string;
	resolution_notes: string | null;
	resolved_at: string | null;
	created_at: string;
	attachments: ClaimAttachment[];
};

const claimTypes = [
	{ value: 'damage', label: 'Pacco danneggiato' },
	{ value: 'loss', label: 'Pacco smarrito' },
	{ value: 'delay', label: 'Ritardo consegna' },
	{ value: 'wrong_delivery', label: 'Consegna errata' },
	{ value: 'other', label: 'Altro' },
];

const MAX_FILES = 5;
const MAX_SIZE = 5 * 1024 * 1024;

const orderIdInput = ref<string>(String(route.query.order_id || ''));
const claimType = ref<string>('damage');
const description = ref<string>('');
const files = ref<File[]>([]);
const submitting = ref(false);
const submitError = ref<string | null>(null);
const submitSuccess = ref<string | null>(null);

const claims = ref<Claim[]>([]);
const listLoading = ref(false);
const listError = ref<string | null>(null);
const expandedId = ref<number | null>(null);

// Cloudflare Turnstile — evita bot/DoS sul form di apertura reclami.
const turnstile = useTurnstile();

const canSubmit = computed(() => {
	if (!loggedIn.value) return false;
	if (submitting.value) return false;
	if (!orderIdInput.value || Number.isNaN(Number(orderIdInput.value))) return false;
	if (!claimType.value) return false;
	if (!description.value || description.value.trim().length < 10) return false;
	if (!turnstile.isReady.value) return false;
	return true;
});

const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const onFilesChange = (ev: Event): void => {
	const input = ev.target as HTMLInputElement;
	const picked = Array.from(input.files || []);
	submitError.value = null;

	const combined = [...files.value, ...picked];
	if (combined.length > MAX_FILES) {
		submitError.value = `Puoi allegare al massimo ${MAX_FILES} file.`;
		return;
	}
	for (const f of picked) {
		if (f.size > MAX_SIZE) {
			submitError.value = `Il file "${f.name}" supera i 5 MB.`;
			return;
		}
		const mime = f.type || '';
		const ok = mime.startsWith('image/') || mime === 'application/pdf';
		if (!ok) {
			submitError.value = `Tipo file "${f.name}" non supportato. Ammessi: immagini e PDF.`;
			return;
		}
	}
	files.value = combined;
	input.value = '';
};

const removeFile = (index: number): void => {
	files.value = files.value.filter((_, i) => i !== index);
};

const loadClaims = async (): Promise<void> => {
	if (!loggedIn.value) return;
	listLoading.value = true;
	listError.value = null;
	try {
		const res = await sanctum('/api/claims', { method: 'GET' });
		claims.value = (res?.data || []) as Claim[];
	} catch (err: any) {
		listError.value = err?.data?.message || err?.message || 'Errore nel caricamento dei reclami.';
	} finally {
		listLoading.value = false;
	}
};

const submitClaim = async (): Promise<void> => {
	if (!canSubmit.value) return;
	submitting.value = true;
	submitError.value = null;
	submitSuccess.value = null;

	try {
		const fd = new FormData();
		fd.append('order_id', String(Number(orderIdInput.value)));
		fd.append('claim_type', claimType.value);
		fd.append('description', description.value.trim());
		if (turnstile.token.value) {
			fd.append('cf_turnstile_token', turnstile.token.value);
		}
		for (const file of files.value) {
			fd.append('attachments[]', file);
		}

		const res = await sanctum('/api/claims', {
			method: 'POST',
			body: fd,
		});

		submitSuccess.value = res?.message || 'Reclamo inviato. Riceverai aggiornamenti via email.';
		orderIdInput.value = '';
		claimType.value = 'damage';
		description.value = '';
		files.value = [];
		turnstile.reset();
		await loadClaims();
		if (res?.data?.id) {
			expandedId.value = Number(res.data.id);
		}
	} catch (err: any) {
		const data = err?.data || err?.response?._data;
		if (data?.errors) {
			submitError.value = Object.values(data.errors).flat().join(' ');
		} else {
			submitError.value = data?.message || err?.message || 'Invio non riuscito. Riprova.';
		}
	} finally {
		submitting.value = false;
	}
};

const statusChipStyle = (status: string) => {
	const map: Record<string, { bg: string; color: string }> = {
		open: { bg: '#FFFBEB', color: '#B45309' },
		in_review: { bg: '#eef7f8', color: '#095866' },
		resolved: { bg: '#ECFDF3', color: '#047857' },
		rejected: { bg: '#FEF2F2', color: '#B91C1C' },
	};
	const hit = map[status] || { bg: '#F0F6F7', color: '#095866' };
	return { backgroundColor: hit.bg, color: hit.color };
};

onMounted(() => {
	loadClaims();
});

watch(loggedIn, (v) => {
	if (v) loadClaims();
});
</script>

<template>
	<section class="legal-page">
		<PublicPageHeader
			eyebrow="Reclami"
			title="Apri un reclamo"
			description="Segnala un problema sulla tua spedizione e segui lo stato fino alla risoluzione."
			:crumbs="[{ label: 'Home', to: '/' }, { label: 'Reclami' }]" />

		<div class="legal-page__container">

			<!-- Guest: informazioni + CTA login -->
			<div v-if="!loggedIn" class="legal-section">
				<h2 class="legal-section__title">Come aprire un reclamo</h2>
				<p class="legal-section__text" style="margin-bottom: 16px;">
					Per aprire un reclamo accedi al tuo account. Avrai cosi' uno storico completo dei tuoi reclami e
					riceverai aggiornamenti via email a ogni cambio di stato.
				</p>
				<div style="display:flex;gap:10px;flex-wrap:wrap;">
					<NuxtLink to="/login?redirect=/reclami" class="btn btn-cta">Accedi</NuxtLink>
					<NuxtLink to="/registrazione" class="btn btn-secondary">Crea account</NuxtLink>
				</div>
			</div>

			<!-- Auth: form apertura reclamo -->
			<form
				v-if="loggedIn"
				class="legal-section"
				style="padding:18px;border:1px solid var(--color-brand-border);border-radius:16px;background:#fff;"
				@submit.prevent="submitClaim">
				<h2 class="legal-section__title">Nuovo reclamo</h2>
				<p class="legal-section__text" style="margin-bottom: 16px;">
					Indica il numero dell'ordine, la tipologia di problema e una descrizione. Puoi allegare fino a
					{{ MAX_FILES }} file (immagini o PDF, max 5 MB ciascuno).
				</p>

				<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
					<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--color-brand-text);">
						Numero ordine
						<input
							v-model="orderIdInput"
							type="number"
							inputmode="numeric"
							min="1"
							required
							placeholder="es. 1234"
							style="padding:10px 12px;border:1px solid var(--color-brand-border);border-radius:10px;font-size:14px;background:#fff;" />
					</label>
					<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--color-brand-text);">
						Tipologia
						<select
							v-model="claimType"
							required
							style="padding:10px 12px;border:1px solid var(--color-brand-border);border-radius:10px;font-size:14px;background:#fff;">
							<option v-for="t in claimTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
						</select>
					</label>
				</div>

				<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--color-brand-text);margin-top:12px;">
					Descrizione (min 10 caratteri)
					<textarea
						v-model="description"
						rows="5"
						minlength="10"
						maxlength="5000"
						required
						placeholder="Descrivi cosa e' successo, quando e dove l'hai notato..."
						style="padding:10px 12px;border:1px solid var(--color-brand-border);border-radius:10px;font-size:14px;background:#fff;resize:vertical;"></textarea>
				</label>

				<div style="margin-top:12px;">
					<label style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--color-brand-text);">
						Allegati (opzionali, max {{ MAX_FILES }} file)
						<input
							type="file"
							accept="image/*,application/pdf"
							multiple
							@change="onFilesChange"
							style="font-size:13px;" />
					</label>
					<ul v-if="files.length" style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">
						<li
							v-for="(f, i) in files"
							:key="i"
							style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--color-brand-border);border-radius:8px;background:#FBFCFD;">
							<span style="font-size:13px;color:var(--color-brand-text);">
								{{ f.name }}
								<span style="color:var(--color-brand-text-muted);font-size:11px;margin-left:6px;">({{ formatFileSize(f.size) }})</span>
							</span>
							<button
								type="button"
								@click="removeFile(i)"
								class="btn btn-secondary btn-sm"
								style="color:#B91C1C;border-color:rgba(185,28,28,0.22);">
								Rimuovi
							</button>
						</li>
					</ul>
				</div>

				<div v-if="submitError" style="margin-top:12px;padding:10px 12px;background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;color:#B91C1C;font-size:13px;">
					{{ submitError }}
				</div>
				<div v-if="submitSuccess" style="margin-top:12px;padding:10px 12px;background:#ECFDF3;border:1px solid #BBF7D0;border-radius:10px;color:#047857;font-size:13px;">
					{{ submitSuccess }}
				</div>

				<div style="margin-top:14px;display:flex;justify-content:center;">
					<NuxtTurnstile v-model="turnstile.token.value" @expired="turnstile.onExpire" @error="turnstile.onError" />
				</div>

				<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
					<button type="submit" class="btn btn-cta" :disabled="!canSubmit">
						<span v-if="submitting">Invio in corso...</span>
						<span v-else>Invia reclamo</span>
					</button>
					<NuxtLink to="/account/reclami" class="btn btn-secondary">I miei reclami</NuxtLink>
				</div>
			</form>

			<!-- Auth: lista reclami recenti -->
			<div v-if="loggedIn" class="legal-section" style="margin-top:24px;">
				<h2 class="legal-section__title">I tuoi reclami recenti</h2>
				<div v-if="listLoading" class="legal-section__text">Caricamento in corso...</div>
				<div v-else-if="listError" style="padding:10px 12px;background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;color:#B91C1C;font-size:13px;">
					{{ listError }}
				</div>
				<div v-else-if="!claims.length" class="legal-section__text">Non hai ancora aperto reclami.</div>
				<ul v-else style="display:flex;flex-direction:column;gap:10px;list-style:none;padding:0;margin:0;">
					<li
						v-for="c in claims"
						:key="c.id"
						style="padding:14px;border:1px solid var(--color-brand-border);border-radius:14px;background:#fff;">
						<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;">
							<div>
								<p style="margin:0;font-size:13px;color:var(--color-brand-text-muted);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
									Reclamo #{{ c.id }} &middot; ordine #{{ c.order_id }}
								</p>
								<p style="margin:4px 0 0;font-size:15px;font-weight:700;color:var(--color-brand-text);">
									{{ c.claim_type_label }}
								</p>
								<p style="margin:2px 0 0;font-size:12px;color:var(--color-brand-text-muted);">Aperto il {{ c.created_at }}</p>
							</div>
							<span
								:style="{ ...statusChipStyle(c.status), padding:'4px 12px', borderRadius:'999px', fontSize:'11px', fontWeight:'800', letterSpacing:'0.12em', textTransform:'uppercase' }">
								{{ c.status_label }}
							</span>
						</div>

						<button
							type="button"
							class="btn btn-secondary btn-sm"
							style="margin-top:10px;"
							@click="expandedId = expandedId === c.id ? null : c.id">
							{{ expandedId === c.id ? 'Nascondi dettagli' : 'Mostra dettagli' }}
						</button>

						<div v-if="expandedId === c.id" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--color-brand-border);">
							<p style="margin:0 0 8px;font-size:12px;color:var(--color-brand-text-muted);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Descrizione</p>
							<p style="margin:0;font-size:14px;color:var(--color-brand-text);white-space:pre-line;">{{ c.description }}</p>

							<template v-if="c.attachments.length">
								<p style="margin:14px 0 8px;font-size:12px;color:var(--color-brand-text-muted);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Allegati</p>
								<ul style="display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:0;">
									<li v-for="a in c.attachments" :key="a.id">
										<a :href="a.download_url" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
											{{ a.original_name || 'Allegato' }}
										</a>
									</li>
								</ul>
							</template>

							<template v-if="c.resolution_notes">
								<p style="margin:14px 0 8px;font-size:12px;color:var(--color-brand-text-muted);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Risoluzione</p>
								<p style="margin:0;font-size:14px;color:var(--color-brand-text);white-space:pre-line;">{{ c.resolution_notes }}</p>
							</template>
						</div>
					</li>
				</ul>
			</div>

			<!-- Footer contatti -->
			<div class="legal-footer-card">
				<h2 class="legal-footer-card__title">Hai bisogno di assistenza?</h2>
				<p class="legal-footer-card__text">
					Per qualsiasi domanda scrivi a
					<a href="mailto:assistenza@spediamofacile.it" class="legal-link">assistenza@spediamofacile.it</a>
					o consulta le nostre
					<NuxtLink to="/termini-e-condizioni" class="legal-link">Condizioni di servizio</NuxtLink>.
				</p>
			</div>
		</div>
	</section>
</template>
