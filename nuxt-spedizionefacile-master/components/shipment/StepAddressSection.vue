<script setup>
const props = defineProps({
	isOpen: { type: Boolean, default: false },
	originAddress: { type: Object, required: true },
	destinationAddress: { type: Object, required: true },
	deliveryMode: { type: String, required: true },
	fieldClass: { type: Function, required: true },
	getFieldError: { type: Function, required: true },
	fieldErrorText: { type: Function, required: true },
	getFieldAssist: { type: Function, required: true },
	applyFieldAssist: { type: Function, required: true },
	smartBlur: { type: Function, required: true },
	onNameInput: { type: Function, required: true },
	onCityInput: { type: Function, required: true },
	onCityFocus: { type: Function, required: true },
	onProvinciaInput: { type: Function, required: true },
	onProvinceFocus: { type: Function, required: true },
	onCapInput: { type: Function, required: true },
	onCapFocus: { type: Function, required: true },
	onTelefonoInput: { type: Function, required: true },
	selectCity: { type: Function, required: true },
	selectProvincia: { type: Function, required: true },
	selectCap: { type: Function, required: true },
	formatCitySuggestionLabel: { type: Function, required: true },
	formatCapSuggestionLabel: { type: Function, required: true },
	sv: { type: Object, required: true },
	originCitySuggestions: { type: Array, default: () => [] },
	originProvinceSuggestions: { type: Array, default: () => [] },
	originCapSuggestions: { type: Array, default: () => [] },
	destCitySuggestions: { type: Array, default: () => [] },
	destProvinceSuggestions: { type: Array, default: () => [] },
	destCapSuggestions: { type: Array, default: () => [] },
	savedAddresses: { type: Array, default: () => [] },
	loadingSavedAddresses: { type: Boolean, default: false },
	showOriginAddressSelector: { type: Boolean, default: false },
	showDestAddressSelector: { type: Boolean, default: false },
	isAuthenticated: { type: Boolean, default: false },
	selectedPudo: { type: Object, default: null },
	canSaveOriginAddress: { type: Boolean, default: false },
	canSaveDestAddress: { type: Boolean, default: false },
	savingOriginAddress: { type: Boolean, default: false },
	savingDestAddress: { type: Boolean, default: false },
});

const emit = defineEmits([
	'update:delivery-mode',
	'save-address',
	'toggle-address-selector',
	'apply-saved-address',
	'open-auth-modal',
	'pudo-selected',
	'pudo-deselected',
]);

const originSelectorRef = defineModel('originSelectorRef', { type: Object });
const destSelectorRef = defineModel('destSelectorRef', { type: Object });

const originSelectorShellRef = ref(null);
const destSelectorShellRef = ref(null);

watch(
	originSelectorShellRef,
	(el) => {
		originSelectorRef.value = el ?? null;
	},
	{ immediate: true },
);

watch(
	destSelectorShellRef,
	(el) => {
		destSelectorRef.value = el ?? null;
	},
	{ immediate: true },
);

const sharedFieldProps = {
	fieldClass: props.fieldClass,
	getFieldError: props.getFieldError,
	fieldErrorText: props.fieldErrorText,
	getFieldAssist: props.getFieldAssist,
	applyFieldAssist: props.applyFieldAssist,
	smartBlur: props.smartBlur,
	onNameInput: props.onNameInput,
	onCityInput: props.onCityInput,
	onCityFocus: props.onCityFocus,
	onProvinciaInput: props.onProvinciaInput,
	onProvinceFocus: props.onProvinceFocus,
	onCapInput: props.onCapInput,
	onCapFocus: props.onCapFocus,
	onTelefonoInput: props.onTelefonoInput,
	selectCity: props.selectCity,
	selectProvincia: props.selectProvincia,
	selectCap: props.selectCap,
	formatCitySuggestionLabel: props.formatCitySuggestionLabel,
	formatCapSuggestionLabel: props.formatCapSuggestionLabel,
	sv: props.sv,
};

const openAddressBook = (target) => {
	if (!props.isAuthenticated) {
		emit('open-auth-modal', 'login');
		return;
	}

	emit('toggle-address-selector', target);
};

const applyAddressBookEntry = (address, target) => {
	emit('apply-saved-address', address, target);
};

const activeCard = ref('origin');
const selectedPudoName = computed(() => String(props.selectedPudo?.name || '').trim());
const selectedPudoAddress = computed(() =>
	[
		String(props.selectedPudo?.address || '').trim(),
		[props.selectedPudo?.zip_code, props.selectedPudo?.city].filter(Boolean).join(' ').trim(),
	]
		.filter(Boolean)
		.join(' · '),
);

watch(
	() => props.isOpen,
	(isOpen) => {
		if (isOpen && activeCard.value !== 'origin' && activeCard.value !== 'dest') {
			activeCard.value = 'origin';
		}
	},
	{ immediate: true },
);

watch(
	() => props.deliveryMode,
	(mode) => {
		if (mode === 'pudo') {
			activeCard.value = 'dest';
		}
	},
);

const setActiveCard = (card) => {
	activeCard.value = card;
};

const isOriginActive = computed(() => activeCard.value === 'origin');
const isDestActive = computed(() => activeCard.value === 'dest');

const compactAddressLine = (address, fallback) => {
	const line = [String(address?.address || '').trim(), String(address?.address_number || '').trim()].filter(Boolean).join(' ');
	const location = [String(address?.postal_code || '').trim(), String(address?.city || '').trim()].filter(Boolean).join(' ');
	if (!line || !location) {
		return location || line || fallback;
	}

	return [location, line].filter(Boolean).join(' · ') || fallback;
};

const originSummaryLine = computed(() => compactAddressLine(props.originAddress, ''));

const destSummaryLine = computed(() => {
	if (props.deliveryMode === 'pudo') {
		return selectedPudoName.value || selectedPudoAddress.value || 'Punto BRT';
	}

	return compactAddressLine(props.destinationAddress, '');
});
</script>

<template>
	<div v-if="isOpen" class="address-stage-shell sf-section-block">
		<div class="address-stage-shell__header sf-section-block__header">
			<div class="address-stage-shell__header-copy">
				<h2 class="sf-section-title">Partenza e destinazione</h2>
				<p class="flow-section-header__text">Compila i riferimenti essenziali e scegli come consegnare prima del riepilogo.</p>
			</div>
			<span class="sf-section-chip">{{ deliveryMode === 'pudo' ? 'PUDO' : 'Domicilio' }}</span>
		</div>
		<div class="address-stage-shell__content sf-section-block__body">
			<div class="address-stage-grid">
				<div
					class="address-entry-card"
					:class="{ 'address-entry-card--active': isOriginActive, 'address-entry-card--compact': !isOriginActive }"
					:role="!isOriginActive ? 'button' : null"
					:tabindex="!isOriginActive ? 0 : null"
					:aria-expanded="isOriginActive ? 'true' : 'false'"
					@click="!isOriginActive && setActiveCard('origin')"
					@keydown.enter.prevent="!isOriginActive && setActiveCard('origin')"
					@keydown.space.prevent="!isOriginActive && setActiveCard('origin')">
					<div class="address-entry-card__head">
						<div class="address-entry-card__title-stack">
							<h2 class="address-entry-card__title">Partenza</h2>
						</div>
						<div
							v-if="isOriginActive && (canSaveOriginAddress || (isAuthenticated && savedAddresses.length > 0))"
							ref="originSelectorShellRef"
							class="address-entry-card__actions">
							<button
								v-if="!canSaveOriginAddress && isAuthenticated && savedAddresses.length > 0"
								type="button"
								class="address-entry-card__link-action btn-secondary btn-compact"
								@click.stop="openAddressBook('origin')">
								Rubrica
							</button>
							<button
								v-if="canSaveOriginAddress"
								type="button"
								class="address-entry-card__link-action btn-cta btn-compact"
								:disabled="savingOriginAddress"
								@click.stop="$emit('save-address', 'origin')">
								{{ savingOriginAddress ? 'Salvataggio...' : 'Salva' }}
							</button>

							<div v-if="showOriginAddressSelector && isAuthenticated" class="address-stage-menu address-stage-menu--card">
								<div v-if="loadingSavedAddresses" class="address-stage-menu__empty-text">Caricamento in corso...</div>
								<div v-else-if="savedAddresses.length > 0" class="address-stage-menu__list">
									<button
										v-for="address in savedAddresses"
										:key="`origin-address-${address.id}`"
										type="button"
										class="address-stage-menu__item"
										@click="applyAddressBookEntry(address, 'origin')">
										<span class="address-stage-menu__route">{{ address.name }}</span>
										<span class="address-stage-menu__meta">{{ address.city }}</span>
									</button>
								</div>
								<div v-else class="address-stage-menu__empty">
									<p class="address-stage-menu__empty-text">Rubrica vuota.</p>
									<NuxtLink to="/account/indirizzi" class="address-stage-menu__link btn-secondary btn-compact">Rubrica</NuxtLink>
								</div>
							</div>
						</div>
					</div>

					<div v-if="!isOriginActive" class="address-entry-card__summary">
						<p class="address-entry-card__summary-line" :class="{ 'address-entry-card__summary-line--placeholder': !originSummaryLine }">
							{{ originSummaryLine || 'Apri e completa' }}
						</p>
					</div>

					<ShipmentAddressFormFields
						v-else
						type="origin"
						:address="originAddress"
						v-bind="sharedFieldProps"
						:city-suggestions="originCitySuggestions"
						:province-suggestions="originProvinceSuggestions"
						:cap-suggestions="originCapSuggestions" />
				</div>

				<div
					class="address-entry-card"
					:class="{ 'address-entry-card--active': isDestActive, 'address-entry-card--compact': !isDestActive }"
					:role="!isDestActive ? 'button' : null"
					:tabindex="!isDestActive ? 0 : null"
					:aria-expanded="isDestActive ? 'true' : 'false'"
					@click="!isDestActive && setActiveCard('dest')"
					@keydown.enter.prevent="!isDestActive && setActiveCard('dest')"
					@keydown.space.prevent="!isDestActive && setActiveCard('dest')">
					<div class="address-entry-card__head">
						<div class="address-entry-card__title-stack">
							<h2 class="address-entry-card__title">Destinazione</h2>
						</div>
						<div
							v-if="isDestActive && deliveryMode !== 'pudo' && (canSaveDestAddress || (isAuthenticated && savedAddresses.length > 0))"
							ref="destSelectorShellRef"
							class="address-entry-card__actions">
							<button
								v-if="!canSaveDestAddress && isAuthenticated && savedAddresses.length > 0"
								type="button"
								class="address-entry-card__link-action btn-secondary btn-compact"
								@click.stop="openAddressBook('dest')">
								Rubrica
							</button>
							<button
								v-if="canSaveDestAddress"
								type="button"
								class="address-entry-card__link-action btn-cta btn-compact"
								:disabled="savingDestAddress"
								@click.stop="$emit('save-address', 'dest')">
								{{ savingDestAddress ? 'Salvataggio...' : 'Salva' }}
							</button>

							<div v-if="showDestAddressSelector && isAuthenticated" class="address-stage-menu address-stage-menu--card">
								<div v-if="loadingSavedAddresses" class="address-stage-menu__empty-text">Caricamento in corso...</div>
								<div v-else-if="savedAddresses.length > 0" class="address-stage-menu__list">
									<button
										v-for="address in savedAddresses"
										:key="`dest-address-${address.id}`"
										type="button"
										class="address-stage-menu__item"
										@click="applyAddressBookEntry(address, 'dest')">
										<span class="address-stage-menu__route">{{ address.name }}</span>
										<span class="address-stage-menu__meta">{{ address.city }}</span>
									</button>
								</div>
								<div v-else class="address-stage-menu__empty">
									<p class="address-stage-menu__empty-text">Rubrica vuota.</p>
									<NuxtLink to="/account/indirizzi" class="address-stage-menu__link btn-secondary btn-compact">Rubrica</NuxtLink>
								</div>
							</div>
						</div>
					</div>

					<div v-if="!isDestActive" class="address-entry-card__summary">
						<p class="address-entry-card__summary-line" :class="{ 'address-entry-card__summary-line--placeholder': !destSummaryLine }">
							{{ destSummaryLine || 'Apri e completa' }}
						</p>
					</div>

					<div v-if="isDestActive" class="address-entry-card__mode">
						<ShipmentAddressPudoSection
							:delivery-mode="deliveryMode"
							:destination-address="destinationAddress"
							:selected-pudo="selectedPudo"
							@update:delivery-mode="$emit('update:delivery-mode', $event)"
							@pudo-selected="$emit('pudo-selected', $event)"
							@pudo-deselected="$emit('pudo-deselected')" />
					</div>

					<ShipmentAddressFormFields
						v-if="isDestActive && deliveryMode !== 'pudo'"
						type="dest"
						:address="destinationAddress"
						v-bind="sharedFieldProps"
						:city-suggestions="destCitySuggestions"
						:province-suggestions="destProvinceSuggestions"
						:cap-suggestions="destCapSuggestions" />
				</div>
			</div>
		</div>
	</div>
</template>
