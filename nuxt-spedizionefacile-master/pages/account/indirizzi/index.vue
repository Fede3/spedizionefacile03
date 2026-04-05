<!--
  FILE: pages/account/indirizzi/index.vue
  SCOPO: Rubrica indirizzi — orchestratore CRUD.
  API: GET/POST/PATCH/DELETE /api/user-addresses.
  COMPONENTI: AccountIndirizziList, AccountIndirizziForm, AccountPageHeader.
  ROUTE: /account/indirizzi (middleware sanctum:auth).
-->
<script setup>
definePageMeta({ middleware: ['app-auth'] });

const messageError = ref(null);
const messageSuccess = ref(null);
const messageLoading = ref(null);
const showEditForm = ref(false);
const showCreateForm = ref(false);
const editedAddress = ref(null);
const deleteConfirmId = ref(null);
const deleteLoading = ref(false);

const newAddress = ref({
	name: '',
	address: '',
	city: '',
	postal_code: '',
	province_name: '',
	default: false,
});

const { data: addresses, refresh: refreshAddress } = useSanctumFetch('/api/user-addresses', { method: 'GET', lazy: true });
const sanctum = useSanctumClient();

/* Stato derivato */
const isAddressFormOpen = computed(() => showEditForm.value || showCreateForm.value);
const addressStats = computed(() => {
	const list = addresses.value?.data || [];
	return { total: list.length, defaults: list.filter((a) => a.default).length };
});
const defaultAddressName = computed(() => {
	return (addresses.value?.data || []).find((a) => a.default)?.name || 'Nessuno ancora';
});
const addressHeader = computed(() => {
	if (showEditForm.value)
		return {
			eyebrow: 'Rubrica account',
			title: 'Modifica indirizzo',
			description: 'Aggiorna i riferimenti salvati senza perdere il ritmo della rubrica.',
		};
	if (showCreateForm.value)
		return {
			eyebrow: 'Rubrica account',
			title: 'Nuovo indirizzo',
			description: 'Aggiungi un indirizzo con campi chiari e pronti per le prossime spedizioni.',
		};
	return {
		eyebrow: 'Rubrica account',
		title: 'I tuoi indirizzi',
		description: 'Salva indirizzi e riferimenti per compilare le spedizioni più velocemente.',
	};
});

/* Feedback temporaneo */
const flashSuccess = (msg) => {
	messageSuccess.value = msg;
	setTimeout(() => {
		messageSuccess.value = null;
	}, 4000);
};

/* CRUD handlers */
const edit = (address) => {
	editedAddress.value = { ...address };
	showEditForm.value = true;
	messageError.value = null;
	messageSuccess.value = null;
};
const cancelEdit = () => {
	editedAddress.value = null;
	showEditForm.value = false;
	messageError.value = null;
};
const cancelAdd = () => {
	newAddress.value = { name: '', address: '', city: '', postal_code: '', province_name: '', default: false };
	showCreateForm.value = false;
	messageError.value = null;
};

const createAddress = async () => {
	messageError.value = null;
	messageLoading.value = 'Aggiunta in corso...';
	try {
		await sanctum('/api/user-addresses', { method: 'POST', body: newAddress.value });
		await refreshAddress();
		newAddress.value = { name: '', address: '', city: '', postal_code: '', province_name: '', default: false };
		showCreateForm.value = false;
		messageLoading.value = null;
		flashSuccess('Indirizzo aggiunto con successo!');
	} catch (e) {
		messageError.value = e?.data?.message || "Errore durante l'aggiunta. Riprova.";
		messageLoading.value = null;
	}
};

const editAddress = async () => {
	messageError.value = null;
	messageLoading.value = 'Salvataggio in corso...';
	try {
		await sanctum(`/api/user-addresses/${editedAddress.value.id}`, {
			method: 'PATCH',
			body: {
				name: editedAddress.value.name,
				address: editedAddress.value.address,
				city: editedAddress.value.city,
				province_name: editedAddress.value.province_name,
				postal_code: editedAddress.value.postal_code,
			},
		});
		await refreshAddress();
		showEditForm.value = false;
		messageLoading.value = null;
		flashSuccess('Indirizzo aggiornato con successo!');
	} catch (e) {
		messageError.value = e?.data?.message || 'Errore durante il salvataggio. Riprova.';
		messageLoading.value = null;
	}
};

const editDefaultAddress = async (address) => {
	messageError.value = null;
	try {
		await sanctum(`/api/user-addresses/${address.id}`, { method: 'PATCH', body: { default: true } });
		await refreshAddress();
		flashSuccess('Indirizzo predefinito aggiornato!');
	} catch {
		messageError.value = "Errore durante l'aggiornamento. Riprova.";
	}
};

const deleteAddress = async (id) => {
	deleteLoading.value = true;
	try {
		await sanctum(`/api/user-addresses/${id}`, { method: 'DELETE' });
		await refreshAddress();
		deleteConfirmId.value = null;
		flashSuccess('Indirizzo eliminato.');
	} catch {
		messageError.value = "Errore durante l'eliminazione. Riprova.";
	} finally {
		deleteLoading.value = false;
	}
};
</script>

<template>
	<section class="min-h-[600px] py-[32px] desktop:py-[72px]">
		<div class="my-container">
			<AccountPageHeader
				:eyebrow="addressHeader.eyebrow"
				:title="addressHeader.title"
				:description="addressHeader.description"
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Indirizzi' }]"
				:back-to="isAddressFormOpen ? '/account/indirizzi' : ''"
				back-label="Torna alla rubrica">
				<template #meta>
					<div class="flex flex-wrap gap-[8px]">
						<span class="sf-section-chip">{{ addressStats.total }} salvati</span>
						<span class="sf-section-chip">{{ addressStats.defaults }} predefiniti</span>
					</div>
				</template>
				<template #actions v-if="!isAddressFormOpen">
					<button
						@click="
							showCreateForm = true;
							messageError = null;
							messageSuccess = null;
						"
						class="btn-cta btn-compact inline-flex items-center justify-center gap-[6px] text-[0.875rem]">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
							<path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
						</svg>
						Aggiungi indirizzo
					</button>
				</template>
			</AccountPageHeader>

			<!-- Messaggi globali -->
			<div v-if="messageSuccess" class="mb-[20px] ux-alert ux-alert--success">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="ux-alert__icon"
					aria-hidden="true">
					<path
						d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
				</svg>
				<div>{{ messageSuccess }}</div>
			</div>
			<div v-if="messageError && !showEditForm && !showCreateForm" class="mb-[20px] ux-alert ux-alert--critical">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="ux-alert__icon"
					aria-hidden="true">
					<path
						d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z" />
				</svg>
				<div>{{ messageError }}</div>
			</div>

			<!-- Lista indirizzi -->
			<AccountIndirizziList
				v-if="!showEditForm && !showCreateForm"
				:addresses="addresses"
				:address-stats="addressStats"
				:default-address-name="defaultAddressName"
				:delete-confirm-id="deleteConfirmId"
				:delete-loading="deleteLoading"
				@edit="edit"
				@set-default="editDefaultAddress"
				@delete="deleteAddress"
				@confirm-delete="(id) => (deleteConfirmId = id)"
				@cancel-delete="deleteConfirmId = null"
				@create="showCreateForm = true" />

			<!-- Form modifica -->
			<AccountIndirizziForm
				v-if="showEditForm && editedAddress"
				v-model="editedAddress"
				mode="edit"
				:loading="messageLoading"
				:error="messageError"
				@submit="editAddress"
				@cancel="cancelEdit" />

			<!-- Form creazione -->
			<AccountIndirizziForm
				v-if="showCreateForm"
				v-model="newAddress"
				mode="create"
				:loading="messageLoading"
				:error="messageError"
				@submit="createAddress"
				@cancel="cancelAdd" />
		</div>
	</section>
</template>
