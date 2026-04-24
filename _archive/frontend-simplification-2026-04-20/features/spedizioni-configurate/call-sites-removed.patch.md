# Call Sites Rimossi — Spedizioni Configurate

Snippet originali dei call-site rimossi al momento dell'archiviazione.
Usati come reference per la riattivazione.

## 1. `composables/useOrdersList.ts`

### Import/sanctum (già presente per altre call)
Nessun cambio in cima al file.

### Blocco "Salva come configurata" (righe ~258-343)

```ts
	/* --- Salva come configurata --- */
	const savingToConfigured = ref<Record<string, boolean>>({});
	const savedToConfigured = ref<Record<string, boolean>>({});
	const savedShipmentsList = ref<any[]>([]);

	const loadSavedShipments = async (): Promise<void> => {
		try { savedShipmentsList.value = ((await sanctum("/api/saved-shipments")) as any)?.data || []; } catch {}
	};
	onMounted(loadSavedShipments);

	const isAlreadySaved = (order: any): boolean => {
		if (savedToConfigured.value[order.id]) return true;
		if (!order.packages?.length || !savedShipmentsList.value.length) return false;
		const pkg = order.packages[0];
		return savedShipmentsList.value.some(saved =>
			saved.package_type === pkg.package_type
			&& String(saved.weight) === String(pkg.weight)
			&& String(saved.first_size) === String(pkg.first_size)
			&& String(saved.second_size) === String(pkg.second_size)
			&& String(saved.third_size) === String(pkg.third_size)
			&& saved.origin_address?.city === pkg.origin_address?.city
			&& saved.origin_address?.postal_code === pkg.origin_address?.postal_code
			&& saved.origin_address?.name === pkg.origin_address?.name
			&& saved.destination_address?.city === pkg.destination_address?.city
			&& saved.destination_address?.postal_code === pkg.destination_address?.postal_code
			&& saved.destination_address?.name === pkg.destination_address?.name
		);
	};

	const saveToConfigured = async (order: any): Promise<void> => {
		if (!order.packages?.length) { saveError.value[order.id] = "Nessun collo presente in questo ordine."; return; }
		if (isAlreadySaved(order)) { saveError.value[order.id] = "Questa spedizione \u00E8 gi\u00E0 stata salvata nelle spedizioni configurate."; return; }
		savingToConfigured.value[order.id] = true;
		saveError.value[order.id] = null;
		try {
			const pkg = order.packages[0];
			const svc = pkg.services || pkg.service || {};
			await sanctum("/api/saved-shipments", {
				method: "POST",
				body: {
					origin_address: {
						type: "Partenza", name: pkg.origin_address?.name || "N/D",
						additional_information: pkg.origin_address?.additional_information || "",
						address: pkg.origin_address?.address || "N/D",
						number_type: pkg.origin_address?.number_type || "Numero Civico",
						address_number: pkg.origin_address?.address_number || "SNC",
						intercom_code: pkg.origin_address?.intercom_code || "",
						country: pkg.origin_address?.country || "Italia",
						city: pkg.origin_address?.city || "N/D",
						postal_code: pkg.origin_address?.postal_code || "00000",
						province: pkg.origin_address?.province || "N/D",
						telephone_number: pkg.origin_address?.telephone_number || "0000000000",
						email: pkg.origin_address?.email || "",
					},
					destination_address: {
						type: "Destinazione", name: pkg.destination_address?.name || "N/D",
						additional_information: pkg.destination_address?.additional_information || "",
						address: pkg.destination_address?.address || "N/D",
						number_type: pkg.destination_address?.number_type || "Numero Civico",
						address_number: pkg.destination_address?.address_number || "SNC",
						intercom_code: pkg.destination_address?.intercom_code || "",
						country: pkg.destination_address?.country || "Italia",
						city: pkg.destination_address?.city || "N/D",
						postal_code: pkg.destination_address?.postal_code || "00000",
						province: pkg.destination_address?.province || "N/D",
						telephone_number: pkg.destination_address?.telephone_number || "0000000000",
						email: pkg.destination_address?.email || "",
					},
					services: { service_type: svc.service_type || "Nessuno", date: svc.date || "", time: svc.time || "" },
					packages: order.packages.map((p: any) => ({
						package_type: p.package_type || "Pacco", quantity: p.quantity || 1,
						weight: p.weight || 1, first_size: p.first_size || 10,
						second_size: p.second_size || 10, third_size: p.third_size || 10,
						single_price: Number(p.single_price || 0) / 100,
						weight_price: p.weight_price || 0, volume_price: p.volume_price || 0,
					})),
				},
			});
			savedToConfigured.value[order.id] = true;
			saveError.value[order.id] = null;
			await loadSavedShipments();
		} catch (e: any) {
			const errorData = e?.response?._data || e?.data;
			saveError.value[order.id] = errorData?.message || "Errore durante il salvataggio. Riprova.";
		} finally { savingToConfigured.value[order.id] = false; }
	};
```

### Export (era nell'oggetto `return`)

```ts
	savingToConfigured, savedToConfigured, isAlreadySaved, saveToConfigured,
```

## 2. `pages/la-tua-spedizione/[step].vue`

### Handler rimosso (righe ~389-426)

```ts
const handleSaveConfiguredFromVentaglio = async () => {
	if (isSavingConfiguredFromVentaglio.value) return;
	if (!isAuthenticated.value) {
		openAuthModal?.({
			title: 'Accedi per salvare',
			message: 'Devi effettuare il login per salvare le spedizioni configurate.',
		});
		return;
	}
	if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
	await nextTick();

	if (!validateInlineServiceDetails()) {
		focusFirstInvalidServiceField();
		return;
	}

	isSavingConfiguredFromVentaglio.value = true;
	try {
		const persisted = await persistAndContinueToCart();
		if (persisted === false) return;
		const payload = shipmentFlowStore.pendingShipment;
		if (!payload) throw new Error('Dati spedizione non disponibili.');
		await sanctumClient('/api/saved-shipments', { method: 'POST', body: payload });
		uiFeedback.success(
			'Spedizione configurata',
			'Trovi la configurazione salvata in Spedizioni configurate.',
		);
		await navigateTo('/account/spedizioni-configurate');
	} catch (err) {
		uiFeedback.error(
			'Spedizioni configurate',
			resolveApiError(err, 'Errore durante il salvataggio. Riprova.'),
		);
	} finally {
		isSavingConfiguredFromVentaglio.value = false;
	}
};
```

Nota: cercare altre occorrenze di `handleSaveConfiguredFromVentaglio` e
`isSavingConfiguredFromVentaglio` nel template + button "Salva modello"
per ripristinare anche la UI.

## 3. `utils/accountNavigationGroups.ts`

### Entry rimosse

```ts
// In adminNavGroups > 'account-personale':
{ label: 'Modelli spedizione', to: '/account/spedizioni-configurate', iconKey: 'package' },

// In clientNavGroups.items (dopo 'Spedizioni'):
{ label: 'Modelli', to: '/account/spedizioni-configurate', iconKey: 'package' },

// In proNavGroups.items (dopo 'Spedizioni'):
{ label: 'Modelli', to: '/account/spedizioni-configurate', iconKey: 'package' },
```

## 4. `utils/accountNavigation.ts`

### Entry rimossa da `createAccountSections > 'Spedizioni'.pages`

```ts
{
    title: 'Configurate',
    description: 'Template pronti da riusare nelle prossime spedizioni.',
    url: '/spedizioni-configurate',
    visible: true,
    iconKey: 'package',
    ...shippingTone,
},
```

## 5. `pages/account/spedizioni/index.vue`

### CTA rimosso da empty state (righe ~144-146)

```vue
<NuxtLink to="/account/spedizioni-configurate" class="sf-empty-state__cta sf-empty-state__cta--ghost">
    <span>Vedi modelli salvati</span>
</NuxtLink>
```

## 6. `tests/e2e/account.spec.ts`

### Entry rimosse

```ts
// Riga ~24 (array auth-gate):
['T6.7', '/account/spedizioni-configurate', 'spedizioni configurate richiede autenticazione'],

// Test completo ~150-170 (se esisteva):
test('T6.7.x - ...', async ({ page }) => {
    await page.goto('/account/spedizioni-configurate');
    // ...
});
```

## 7. `types/index.ts`

### Commento JSDoc aggiornato (non rimosso il tipo)

```ts
// PRIMA:
* Restituita da /api/saved-shipments.

// DOPO:
* (Feature archiviata 2026-04-20 — tipo mantenuto per retrocompatibilita'.)
```
