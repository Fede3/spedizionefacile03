<script setup>
/*
 * /account/privacy — Privacy e dati GDPR (versione arricchita).
 * - Download dati personali (Articolo 20 GDPR)
 * - Gestione consenso cookie
 * - Link a info policies
 * - Eliminazione account (richiesta)
 */
definePageMeta({ middleware: ['app-auth'] });

useSeoMeta({
	title: 'Privacy e dati',
	description: "Esporta o gestisci i tuoi dati personali in conformità al GDPR.",
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const { user } = useSanctumAuth();
const { message: feedback, showSuccess, showError } = useFlashMessage();

const downloading = ref(false);
const showDeleteConfirm = ref(false);
const deletingAccount = ref(false);

const downloadData = async () => {
	if (downloading.value) return;
	downloading.value = true;
	try {
		const blob = await sanctum('/api/me/export-data', { method: 'GET', responseType: 'blob' });
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `spediamofacile-export-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.appendChild(link);
		link.click();
		window.URL.revokeObjectURL(url);
		link.remove();
		showSuccess('Esportazione completata, file scaricato.');
	} catch (e) {
		showError(e, 'Impossibile esportare i dati. Riprova tra poco.');
	} finally {
		downloading.value = false;
	}
};

const openCookieSettings = () => {
	// Trigger riapertura banner cookie consenso
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('cookie-banner:open'));
		showSuccess('Apertura impostazioni cookie. Aggiorna le tue preferenze nel banner che appare in basso.');
	}
};

const requestAccountDeletion = async () => {
	if (deletingAccount.value) return;
	deletingAccount.value = true;
	try {
		await sanctum('/api/user/account', { method: 'DELETE' });
		showSuccess('Richiesta di eliminazione inviata. Riceverai un\'email di conferma.');
		showDeleteConfirm.value = false;
		setTimeout(() => navigateTo('/'), 2500);
	} catch (e) {
		showError(e, 'Impossibile eliminare l\'account. Contatta l\'assistenza.');
	} finally {
		deletingAccount.value = false;
	}
};
</script>

<template>
	<AccountPageSection>
		<AccountPageHeader
			eyebrow="Account · Privacy"
			title="Privacy e dati"
			description="I tuoi dati personali sono tuoi. Qui li scarichi, gestisci consensi e richiedi eliminazione, in conformità al GDPR (Regolamento UE 2016/679)."
			:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Privacy' }]" />

		<SfActionBanner :message="feedback" />

		<!-- Sezione 1 — Esportazione dati -->
		<SfCard padding="md">
			<template #header>
				<div class="flex items-center gap-3">
					<div class="inline-flex h-10 w-10 items-center justify-center rounded-control bg-brand-primary/10 text-brand-primary">
						<UIcon name="mdi:download" class="h-5 w-5" />
					</div>
					<div>
						<h2 class="font-display text-lg font-bold text-brand-text">Scarica i tuoi dati</h2>
						<p class="text-xs text-brand-text-muted">Articolo 20 GDPR · Diritto alla portabilità</p>
					</div>
				</div>
			</template>

			<p class="text-sm text-brand-text-secondary mb-4 leading-relaxed">
				Riceverai un file JSON con tutti i tuoi dati: profilo, ordini, indirizzi salvati, movimenti wallet, preferenze notifiche, consensi cookie e ultime sessioni di accesso.
			</p>
			<SfButton :loading="downloading" @click="downloadData">
				<template #leading><UIcon name="mdi:download" class="h-5 w-5" /></template>
				Scarica i miei dati (JSON)
			</SfButton>
		</SfCard>

		<!-- Sezione 2 — Gestione cookie -->
		<SfCard padding="md">
			<template #header>
				<div class="flex items-center gap-3">
					<div class="inline-flex h-10 w-10 items-center justify-center rounded-control bg-brand-primary/10 text-brand-primary">
						<UIcon name="mdi:cookie" class="h-5 w-5" />
					</div>
					<div>
						<h2 class="font-display text-lg font-bold text-brand-text">Preferenze cookie</h2>
						<p class="text-xs text-brand-text-muted">Personalizza tracciamento e analytics</p>
					</div>
				</div>
			</template>

			<p class="text-sm text-brand-text-secondary mb-4 leading-relaxed">
				Aggiorna in ogni momento la tua scelta sui cookie. Puoi accettare solo quelli necessari, abilitare statistiche anonime o consentire personalizzazione marketing.
			</p>
			<div class="flex flex-col tablet:flex-row gap-3">
				<SfButton variant="secondary" @click="openCookieSettings">
					<template #leading><UIcon name="mdi:cookie-cog" class="h-5 w-5" /></template>
					Gestisci preferenze cookie
				</SfButton>
				<SfButton variant="secondary" to="/cookie-policy">
					<template #leading><UIcon name="mdi:open-in-new" class="h-5 w-5" /></template>
					Leggi cookie policy
				</SfButton>
			</div>
		</SfCard>

		<!-- Sezione 3 — Documenti legali -->
		<SfCard padding="md">
			<template #header>
				<div class="flex items-center gap-3">
					<div class="inline-flex h-10 w-10 items-center justify-center rounded-control bg-brand-primary/10 text-brand-primary">
						<UIcon name="mdi:file-document-multiple" class="h-5 w-5" />
					</div>
					<div>
						<h2 class="font-display text-lg font-bold text-brand-text">Documenti legali</h2>
						<p class="text-xs text-brand-text-muted">Trasparenza su come trattiamo i tuoi dati</p>
					</div>
				</div>
			</template>

			<div class="grid grid-cols-1 tablet:grid-cols-3 gap-3">
				<NuxtLink
					to="/privacy-policy"
					class="group flex items-start gap-3 rounded-card border border-brand-border bg-brand-card p-4 transition hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-sf-sm">
					<UIcon name="mdi:shield-account" class="h-5 w-5 shrink-0 text-brand-primary mt-0.5" />
					<div>
						<p class="font-semibold text-brand-text">Privacy Policy</p>
						<p class="text-xs text-brand-text-muted mt-1">Come usiamo i tuoi dati</p>
					</div>
				</NuxtLink>
				<NuxtLink
					to="/cookie-policy"
					class="group flex items-start gap-3 rounded-card border border-brand-border bg-brand-card p-4 transition hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-sf-sm">
					<UIcon name="mdi:cookie-outline" class="h-5 w-5 shrink-0 text-brand-primary mt-0.5" />
					<div>
						<p class="font-semibold text-brand-text">Cookie Policy</p>
						<p class="text-xs text-brand-text-muted mt-1">Tipologie e durate</p>
					</div>
				</NuxtLink>
				<NuxtLink
					to="/termini-e-condizioni"
					class="group flex items-start gap-3 rounded-card border border-brand-border bg-brand-card p-4 transition hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-sf-sm">
					<UIcon name="mdi:scale-balance" class="h-5 w-5 shrink-0 text-brand-primary mt-0.5" />
					<div>
						<p class="font-semibold text-brand-text">Termini di servizio</p>
						<p class="text-xs text-brand-text-muted mt-1">Diritti e doveri</p>
					</div>
				</NuxtLink>
			</div>
		</SfCard>

		<!-- Sezione 4 — Eliminazione account (zona pericolosa) -->
		<SfCard padding="md">
			<template #header>
				<div class="flex items-center gap-3">
					<div class="inline-flex h-10 w-10 items-center justify-center rounded-control bg-brand-error/10 text-brand-error">
						<UIcon name="mdi:account-remove" class="h-5 w-5" />
					</div>
					<div>
						<h2 class="font-display text-lg font-bold text-brand-text">Elimina account</h2>
						<p class="text-xs text-brand-text-muted">Articolo 17 GDPR · Diritto all'oblio</p>
					</div>
				</div>
			</template>

			<div class="rounded-card border border-brand-error/20 bg-brand-error/5 p-4 mb-4">
				<div class="flex items-start gap-3">
					<UIcon name="mdi:alert" class="h-5 w-5 shrink-0 text-brand-error mt-0.5" />
					<div class="text-sm text-brand-text leading-relaxed">
						<p class="font-semibold">Operazione irreversibile</p>
						<p class="mt-1 text-brand-text-secondary">
							Eliminerai permanentemente il tuo account, lo storico ordini, indirizzi salvati e wallet. Eventuali ordini in transito proseguiranno fino alla consegna ma non sarai più contattabile sull'email collegata.
							Se preferisci, puoi prima <strong>scaricare i tuoi dati</strong> qui sopra.
						</p>
					</div>
				</div>
			</div>

			<div v-if="!showDeleteConfirm" class="flex justify-end">
				<SfButton variant="secondary" @click="showDeleteConfirm = true">
					<template #leading><UIcon name="mdi:account-remove" class="h-5 w-5" /></template>
					Richiedi eliminazione account
				</SfButton>
			</div>

			<div v-else class="rounded-card border border-brand-error bg-brand-error/5 p-4">
				<p class="text-sm font-bold text-brand-error mb-3">Confermi l'eliminazione di {{ user?.email }}?</p>
				<p class="text-sm text-brand-text-secondary mb-4">L'eliminazione è definitiva. Per continuare a usare SpediamoFacile dovrai creare un nuovo account.</p>
				<div class="flex flex-col tablet:flex-row gap-3 justify-end">
					<SfButton variant="secondary" @click="showDeleteConfirm = false">Annulla</SfButton>
					<SfButton variant="danger" :loading="deletingAccount" @click="requestAccountDeletion">
						Sì, elimina il mio account
					</SfButton>
				</div>
			</div>
		</SfCard>
	</AccountPageSection>
</template>
