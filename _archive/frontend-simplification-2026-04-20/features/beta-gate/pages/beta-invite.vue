<script setup lang="ts">
import { ref } from 'vue';

useSeoMeta({
	title: 'Beta privata | SpedizioneFacile',
	robots: 'noindex, nofollow',
	description: 'Accesso riservato beta privata SpedizioneFacile — solo su invito.',
});

definePageMeta({ layout: 'default' });

const email = ref('');
const submitting = ref(false);
const sent = ref(false);
const error = ref('');

const testAreas = [
	{
		id: 'preventivo',
		title: 'Preventivo rapido',
		desc: 'Calcola spedizione in meno di 3 minuti: pacco, indirizzi, servizio, prezzo trasparente.',
		icon: 'P',
	},
	{
		id: 'tracking',
		title: 'Tracking real-time',
		desc: 'Segui la spedizione minuto per minuto con stato, ETA, notifiche push (se attive).',
		icon: 'T',
	},
	{
		id: 'account-pro',
		title: 'Account pro',
		desc: 'Dashboard wallet, referral, ritiri multi-collo ricorrenti e tariffe dedicate.',
		icon: 'A',
	},
];

async function submit() {
	error.value = '';
	if (!email.value.includes('@')) {
		error.value = 'Inserisci un indirizzo email valido.';
		return;
	}
	submitting.value = true;
	try {
		// STUB: endpoint beta registration da implementare lato backend
		// eslint-disable-next-line no-console
		console.log('[beta-invite stub] registrazione beta', { email: email.value, ts: new Date().toISOString() });
		await new Promise((r) => setTimeout(r, 400));
		sent.value = true;
	}
	catch (_err) {
		error.value = 'Registrazione fallita, riprova più tardi.';
	}
	finally {
		submitting.value = false;
	}
}
</script>

<template>
	<section class="beta-invite">
		<div class="beta-invite__wrap">
			<header class="beta-invite__hero">
				<span class="beta-invite__eyebrow">Beta privata — solo su invito</span>
				<h1>Sei stato invitato alla beta privata di SpedizioneFacile</h1>
				<p>
					Aiutaci a rifinire l'esperienza prima del lancio. 7 giorni di accesso anticipato, feedback diretto al team, zero costi.
				</p>
			</header>

			<section class="beta-invite__cards" aria-label="Cosa puoi testare">
				<h2 class="beta-invite__cards-title">
					Cosa puoi testare
				</h2>
				<ul class="beta-invite__cards-grid">
					<li v-for="area in testAreas" :key="area.id" class="beta-card">
						<span class="beta-card__icon" aria-hidden="true">{{ area.icon }}</span>
						<h3>{{ area.title }}</h3>
						<p>{{ area.desc }}</p>
					</li>
				</ul>
			</section>

			<section class="beta-invite__form-section" aria-labelledby="beta-form-title">
				<h2 id="beta-form-title">
					Conferma la tua partecipazione
				</h2>
				<p>Inserisci l'email a cui hai ricevuto l'invito. Ti manderemo il link di accesso entro 24h.</p>
				<form v-if="!sent" class="beta-invite__form" @submit.prevent="submit">
					<label class="beta-field">
						<span>Email</span>
						<input
							v-model="email"
							type="email"
							required
							autocomplete="email"
							placeholder="tu@example.com"
						>
					</label>
					<button type="submit" class="beta-btn" :disabled="submitting">
						{{ submitting ? 'Invio...' : 'Richiedi accesso beta' }}
					</button>
					<p v-if="error" class="beta-error" role="alert">
						{{ error }}
					</p>
				</form>
				<div v-else class="beta-success" role="status" aria-live="polite">
					Richiesta ricevuta. Ti scriveremo a breve.
				</div>
			</section>

			<footer class="beta-invite__footer">
				<p>
					Trattiamo i dati secondo la nostra
					<NuxtLink to="/privacy">
						Privacy Policy
					</NuxtLink>. Accesso riservato e non indicizzato.
				</p>
			</footer>
		</div>
	</section>
</template>

<style scoped>
.beta-invite {
	background: linear-gradient(180deg, var(--surface-page, #F8F9FB) 0%, var(--surface-page-end, #EEF0F3) 100%);
	min-height: 100dvh;
	padding: 32px 16px 64px;
}
.beta-invite__wrap { max-width: 960px; margin: 0 auto; }

.beta-invite__hero { text-align: center; padding: 32px 0 24px; }
.beta-invite__eyebrow {
	display: inline-block; padding: 6px 12px; border-radius: 999px;
	background: var(--color-brand-accent, #F97316); color: #fff;
	font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
}
.beta-invite__hero h1 {
	font-size: clamp(26px, 4vw, 40px);
	color: var(--color-brand-primary, #0D9488);
	margin: 16px auto 12px; max-width: 720px; line-height: 1.2;
}
.beta-invite__hero p { color: var(--color-brand-text-secondary, #475569); max-width: 640px; margin: 0 auto; font-size: 16px; line-height: 1.5; }

.beta-invite__cards { margin: 40px 0; }
.beta-invite__cards-title { font-size: 22px; color: #0F172A; margin-bottom: 20px; text-align: center; }
.beta-invite__cards-grid {
	list-style: none; padding: 0; margin: 0;
	display: grid; gap: 16px;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.beta-card {
	background: #fff; border-radius: 16px; padding: 20px;
	border: 1px solid var(--color-border-soft, #E2E8F0); box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
	transition: transform 0.18s, box-shadow 0.18s;
}
.beta-card:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08); }
.beta-card__icon {
	display: inline-flex; align-items: center; justify-content: center;
	width: 40px; height: 40px; border-radius: 12px;
	background: var(--color-brand-primary, #0D9488); color: #fff;
	font-weight: 700; font-size: 18px; margin-bottom: 12px;
}
.beta-card h3 { font-size: 18px; color: #0F172A; margin: 0 0 8px; }
.beta-card p { color: var(--color-brand-text-secondary, #475569); font-size: 14px; line-height: 1.5; margin: 0; }

.beta-invite__form-section {
	background: #fff; border-radius: 20px; padding: 28px;
	border: 1px solid var(--color-border-soft, #E2E8F0); margin: 32px 0;
}
.beta-invite__form-section h2 { margin: 0 0 8px; color: var(--color-brand-primary, #0D9488); font-size: 22px; }
.beta-invite__form-section > p { color: var(--color-brand-text-secondary, #475569); margin: 0 0 16px; font-size: 14px; }

.beta-invite__form { display: flex; flex-direction: column; gap: 12px; max-width: 440px; }
.beta-field { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
.beta-field span { color: var(--color-brand-text, #334155); font-weight: 500; }
.beta-field input {
	padding: 12px 14px; border: 1px solid var(--color-border, #CBD5E1); border-radius: 10px;
	font-size: 15px; font-family: inherit; min-height: 44px;
}
.beta-field input:focus {
	outline: 2px solid var(--color-brand-primary, #0D9488);
	border-color: var(--color-brand-primary, #0D9488); outline-offset: 1px;
}

.beta-btn {
	background: var(--color-brand-primary, #0D9488); color: #fff;
	border: none; padding: 12px 20px; border-radius: 10px; font-weight: 700;
	font-size: 15px; cursor: pointer; min-height: 44px;
}
.beta-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.beta-btn:focus-visible { outline: 3px solid var(--color-brand-accent, #F97316); outline-offset: 2px; }

.beta-error { color: var(--color-error-text-strong, #991B1B); background: var(--color-error-bg, #FEF2F2); padding: 10px 12px; border-radius: 8px; font-size: 13px; }
.beta-success {
	background: #ECFDF5; color: #065F46; padding: 14px 16px;
	border-radius: 10px; font-size: 15px; font-weight: 600;
}

.beta-invite__footer { text-align: center; padding: 20px 0 0; color: var(--color-neutral-500, #6B7280); font-size: 13px; }
.beta-invite__footer a { color: var(--color-brand-primary, #0D9488); text-decoration: underline; }
.beta-invite__footer a:focus-visible { outline: 2px solid var(--color-brand-accent, #F97316); outline-offset: 2px; border-radius: 2px; }
</style>
