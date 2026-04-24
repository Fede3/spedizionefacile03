<!--
  FILE: pages/account/pro/api-keys.vue
  SCOPO: Gestione chiavi API Pro per accesso programmatico (X-Pro-Api-Key).

  AUTH: solo Partner Pro.
  ROUTE: /account/pro/api-keys

  API: GET / POST / DELETE /api/pro/api-keys
-->
<script setup>
definePageMeta({ middleware: ['app-auth'] });

useSeoMeta({
	title: 'Chiavi API | Pro | SpediamoFacile',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const { user } = useSanctumAuth();

const isPro = computed(() => user.value?.role === 'Partner Pro');

const keys = ref([]);
const isLoading = ref(true);
const loadError = ref('');

const showCreateModal = ref(false);
const showRevokeModal = ref(false);
const newKeyName = ref('');
const newKeyScopes = ref([]);
const isCreating = ref(false);
const createError = ref('');
const newPlaintext = ref(null);

const keyToRevoke = ref(null);
const isRevoking = ref(false);

const copiedPlaintext = ref(false);

const ALL_SCOPES = [
	{ key: 'shipments:read', label: 'Lettura spedizioni', description: 'Visualizza ordini esistenti' },
	{ key: 'shipments:write', label: 'Creazione spedizioni', description: 'Crea nuove spedizioni' },
	{ key: 'tracking:read', label: 'Lettura tracking', description: 'Accesso ai dati di tracking BRT' },
];

const fetchKeys = async () => {
	isLoading.value = true;
	loadError.value = '';
	try {
		const res = await sanctum('/api/pro/api-keys');
		keys.value = res.data || [];
	} catch (e) {
		loadError.value = e?.response?._data?.message || 'Errore caricamento chiavi.';
	} finally {
		isLoading.value = false;
	}
};

const openCreateModal = () => {
	newKeyName.value = '';
	newKeyScopes.value = ['shipments:read'];
	createError.value = '';
	newPlaintext.value = null;
	showCreateModal.value = true;
};

const closeCreateModal = () => {
	showCreateModal.value = false;
	if (newPlaintext.value) {
		// Se ha appena creato, ricarica lista
		fetchKeys();
	}
	newPlaintext.value = null;
};

const createKey = async () => {
	createError.value = '';
	if (!newKeyName.value.trim()) {
		createError.value = 'Inserisci un nome per la chiave.';
		return;
	}
	if (newKeyScopes.value.length === 0) {
		createError.value = 'Seleziona almeno uno scope.';
		return;
	}

	isCreating.value = true;
	try {
		const res = await sanctum('/api/pro/api-keys', {
			method: 'POST',
			body: {
				name: newKeyName.value.trim(),
				scopes: newKeyScopes.value,
			},
		});
		newPlaintext.value = res.data?.plaintext || null;
	} catch (e) {
		createError.value = e?.response?._data?.message || 'Errore creazione chiave.';
	} finally {
		isCreating.value = false;
	}
};

const copyPlaintext = async () => {
	if (!newPlaintext.value) return;
	try {
		await navigator.clipboard.writeText(newPlaintext.value);
	} catch {
		const el = document.createElement('textarea');
		el.value = newPlaintext.value;
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
	}
	copiedPlaintext.value = true;
	setTimeout(() => {
		copiedPlaintext.value = false;
	}, 2000);
};

const askRevoke = (key) => {
	keyToRevoke.value = key;
	showRevokeModal.value = true;
};

const confirmRevoke = async () => {
	if (!keyToRevoke.value) return;
	isRevoking.value = true;
	try {
		await sanctum(`/api/pro/api-keys/${keyToRevoke.value.id}`, { method: 'DELETE' });
		showRevokeModal.value = false;
		keyToRevoke.value = null;
		await fetchKeys();
	} catch (e) {
		alert(e?.response?._data?.message || 'Errore revoca chiave.');
	} finally {
		isRevoking.value = false;
	}
};

const formatDate = (iso) => {
	if (!iso) return '—';
	const d = new Date(iso);
	return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isRevoked = (key) => Boolean(key.revoked_at);

onMounted(() => {
	if (isPro.value) fetchKeys();
});
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[20px] tablet:py-[24px] desktop:py-[28px]">
		<div class="my-container space-y-[20px]">
			<AccountPageHeader
				eyebrow="Pro"
				title="Chiavi API"
				description="Gestisci le credenziali per integrare SpediamoFacile nel tuo gestionale o software interno."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Pro', to: '/account/pro/dashboard' },
					{ label: 'Chiavi API' },
				]">
				<template #actions>
					<button v-if="isPro" type="button" class="btn-primary btn-compact" @click="openCreateModal">
						+ Nuova chiave
					</button>
				</template>
			</AccountPageHeader>

			<div v-if="!isPro" class="ux-alert ux-alert--warning">
				<div class="flex-1">
					<p class="font-[700] text-[var(--color-brand-text)]">Funzionalità riservata ai Partner Pro</p>
				</div>
				<NuxtLink to="/account/account-pro" class="btn-primary btn-compact">Diventa Partner Pro</NuxtLink>
			</div>

			<template v-else>
				<div class="sf-account-panel rounded-[16px] p-[20px] desktop:p-[24px]">
					<div v-if="isLoading" class="space-y-[10px]">
						<div v-for="n in 3" :key="n" class="h-[60px] rounded-[10px] bg-[#F5F7F8] animate-pulse"></div>
					</div>

					<div v-else-if="loadError" class="ux-alert ux-alert--warning">
						<p class="flex-1">{{ loadError }}</p>
						<button type="button" class="btn-secondary btn-compact" @click="fetchKeys">Riprova</button>
					</div>

					<div v-else-if="keys.length === 0" class="text-center py-[40px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[48px] w-[48px] mx-auto text-[var(--color-brand-text-muted)] mb-[10px]" fill="currentColor">
							<path d="M12.65 10A6 6 0 0 0 7 6a6 6 0 0 0 0 12 6 6 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
						</svg>
						<p class="text-[14px] font-[700] text-[var(--color-brand-text)]">Nessuna chiave API ancora creata</p>
						<p class="text-[13px] text-[var(--color-brand-text-muted)] mt-[4px]">Crea la prima chiave per iniziare a integrare il tuo gestionale.</p>
						<button type="button" class="btn-primary btn-compact mt-[16px]" @click="openCreateModal">+ Nuova chiave</button>
					</div>

					<div v-else class="overflow-x-auto">
						<table class="w-full text-[13px] border-collapse">
							<thead>
								<tr class="bg-[rgba(9,88,102,0.04)]">
									<th class="px-[12px] py-[10px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Nome</th>
									<th class="px-[12px] py-[10px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Identificativo</th>
									<th class="px-[12px] py-[10px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Scope</th>
									<th class="px-[12px] py-[10px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Ultimo uso</th>
									<th class="px-[12px] py-[10px] text-left font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]">Stato</th>
									<th class="px-[12px] py-[10px] text-right font-[700] text-[var(--color-brand-text)] border-b border-[rgba(9,88,102,0.10)]"></th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="key in keys" :key="key.id" class="border-b border-[rgba(9,88,102,0.06)]">
									<td class="px-[12px] py-[10px] font-[700] text-[var(--color-brand-text)]">{{ key.name }}</td>
									<td class="px-[12px] py-[10px] font-mono text-[var(--color-brand-text-muted)]">sf_pro_…{{ key.last_four }}</td>
									<td class="px-[12px] py-[10px]">
										<span v-for="scope in (key.scopes || [])" :key="scope" class="inline-block mr-[4px] mb-[2px] rounded-full bg-[rgba(9,88,102,0.08)] px-[6px] py-[1px] text-[10px] font-[700] text-[var(--color-brand-primary)]">
											{{ scope }}
										</span>
									</td>
									<td class="px-[12px] py-[10px] text-[var(--color-brand-text-muted)]">{{ formatDate(key.last_used_at) }}</td>
									<td class="px-[12px] py-[10px]">
										<span v-if="isRevoked(key)" class="inline-flex items-center gap-[4px] rounded-full bg-[rgba(185,28,28,0.10)] px-[8px] py-[2px] text-[11px] font-[700] text-[#B91C1C]">Revocata</span>
										<span v-else class="inline-flex items-center gap-[4px] rounded-full bg-[rgba(5,150,105,0.10)] px-[8px] py-[2px] text-[11px] font-[700] text-[#047857]">Attiva</span>
									</td>
									<td class="px-[12px] py-[10px] text-right">
										<button
											v-if="!isRevoked(key)"
											type="button"
											class="text-[12px] font-[700] text-[#B91C1C] hover:underline"
											@click="askRevoke(key)">
											Revoca
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<!-- Documentazione rapida -->
				<div class="sf-account-panel rounded-[16px] p-[20px] desktop:p-[24px]">
					<h3 class="text-[15px] font-[800] text-[var(--color-brand-text)] mb-[8px]">Come usare la chiave</h3>
					<p class="text-[13px] text-[var(--color-brand-text-muted)] mb-[12px]">
						Includi l'header <code class="bg-[rgba(9,88,102,0.06)] px-[4px] py-[1px] rounded text-[12px]">X-Pro-Api-Key</code> nelle tue chiamate.
					</p>
					<pre class="bg-[#0F172A] text-[#E5E7EB] text-[12px] p-[14px] rounded-[10px] overflow-x-auto">curl https://api.spediamofacile.it/api/v1/shipments \
  -H "X-Pro-Api-Key: sf_pro_xxxxxxxxxx"</pre>
				</div>
			</template>
		</div>

		<!-- Modale crea chiave -->
		<div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-[20px]" @click.self="closeCreateModal">
			<div class="bg-white rounded-[16px] p-[24px] w-full max-w-[480px] shadow-2xl">
				<template v-if="!newPlaintext">
					<h3 class="text-[18px] font-[800] text-[var(--color-brand-text)] mb-[16px]">Nuova chiave API</h3>

					<div class="mb-[14px]">
						<label class="block text-[13px] font-[700] text-[var(--color-brand-text)] mb-[6px]">Nome (es. "Magento produzione")</label>
						<input
							v-model="newKeyName"
							type="text"
							maxlength="100"
							class="w-full rounded-[10px] border border-[rgba(9,88,102,0.18)] px-[12px] py-[10px] text-[14px] focus:border-[var(--color-brand-primary)] focus:outline-none"
							placeholder="Nome riconoscibile" />
					</div>

					<div class="mb-[14px]">
						<label class="block text-[13px] font-[700] text-[var(--color-brand-text)] mb-[6px]">Permessi (scope)</label>
						<div class="space-y-[8px]">
							<label v-for="scope in ALL_SCOPES" :key="scope.key" class="flex items-start gap-[8px] cursor-pointer rounded-[8px] p-[8px] hover:bg-[rgba(9,88,102,0.04)]">
								<input
									v-model="newKeyScopes"
									type="checkbox"
									:value="scope.key"
									class="mt-[2px] accent-[var(--color-brand-primary)]" />
								<div class="flex-1">
									<p class="text-[13px] font-[700] text-[var(--color-brand-text)]">{{ scope.label }}</p>
									<p class="text-[11px] text-[var(--color-brand-text-muted)]">{{ scope.description }}</p>
								</div>
							</label>
						</div>
					</div>

					<p v-if="createError" class="text-[13px] font-[600] text-[#B91C1C] mb-[12px]">{{ createError }}</p>

					<div class="flex gap-[8px] justify-end">
						<button type="button" class="btn-secondary btn-compact" @click="closeCreateModal">Annulla</button>
						<button type="button" class="btn-primary btn-compact" :disabled="isCreating" @click="createKey">
							{{ isCreating ? 'Creazione...' : 'Crea chiave' }}
						</button>
					</div>
				</template>

				<template v-else>
					<div class="flex items-start gap-[12px] mb-[16px]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[28px] w-[28px] text-[#E44203] shrink-0" fill="currentColor">
							<path d="M12 2 1 21h22L12 2zm0 4.83L19.53 19H4.47L12 6.83zM11 12v4h2v-4h-2zm0 6v2h2v-2h-2z" />
						</svg>
						<div>
							<h3 class="text-[16px] font-[800] text-[var(--color-brand-text)]">Copia la chiave ora</h3>
							<p class="text-[13px] text-[#B91C1C] font-[600] mt-[4px]">Non potrai più vederla. Conservala in un luogo sicuro.</p>
						</div>
					</div>

					<div class="bg-[#0F172A] text-[#E5E7EB] p-[14px] rounded-[10px] mb-[14px] flex items-center justify-between gap-[8px]">
						<code class="text-[12px] truncate">{{ newPlaintext }}</code>
						<button type="button" class="btn-primary btn-compact shrink-0" @click="copyPlaintext">
							{{ copiedPlaintext ? 'Copiato' : 'Copia' }}
						</button>
					</div>

					<div class="flex justify-end">
						<button type="button" class="btn-primary btn-compact" @click="closeCreateModal">Ho salvato la chiave</button>
					</div>
				</template>
			</div>
		</div>

		<!-- Modale conferma revoca -->
		<div v-if="showRevokeModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-[20px]" @click.self="showRevokeModal = false">
			<div class="bg-white rounded-[16px] p-[24px] w-full max-w-[420px] shadow-2xl">
				<h3 class="text-[16px] font-[800] text-[var(--color-brand-text)] mb-[8px]">Revocare la chiave?</h3>
				<p class="text-[13px] text-[var(--color-brand-text-muted)] mb-[16px]">
					La chiave <strong>{{ keyToRevoke?.name }}</strong> smetterà immediatamente di funzionare. L'azione non è reversibile.
				</p>
				<div class="flex gap-[8px] justify-end">
					<button type="button" class="btn-secondary btn-compact" @click="showRevokeModal = false">Annulla</button>
					<button type="button" class="btn-primary btn-compact" :disabled="isRevoking" @click="confirmRevoke">
						{{ isRevoking ? 'Revoco...' : 'Revoca' }}
					</button>
				</div>
			</div>
		</div>
	</section>
</template>
