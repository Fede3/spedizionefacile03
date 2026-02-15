<!--
  FILE: pages/carrello.vue
  SCOPO: Carrello spedizioni — lista pacchi raggruppati per indirizzo/servizio, modifica quantita', coupon, checkout.
  API: GET/DELETE /api/cart o /api/guest-cart (via useCart), DELETE /api/cart/{id}.
  COMPOSABLE: useCart (gestione carrello autenticato/ospite).
  ROUTE: /carrello (pubblica, funziona sia autenticato che ospite).
-->
<script setup>
// Meta tag SEO
useSeoMeta({
	title: 'Carrello | SpedizioneFacile',
	ogTitle: 'Carrello | SpedizioneFacile',
});

// Recupera i dati del carrello dal composable useCart
const { cart, refresh, status } = useCart();
const { isAuthenticated } = useSanctumAuth();
const sanctum = useSanctumClient();
const router = useRouter();
const route = useRoute();
const toast = useToast();

// Promo settings per banner e badge
const { loadPriceBands, promoSettings } = usePriceBands();
onMounted(async () => { await loadPriceBands(); });

// Endpoint diverso per svuotare il carrello in base a se l'utente e' loggato o ospite
const endpoint = computed(() => (isAuthenticated.value ? "/api/empty-cart" : "/api/empty-guest-cart"));

// Aggiorna i dati del carrello ogni volta che la pagina viene visitata
// Se arriviamo da un edit (query param 'updated'), forziamo invalidazione cache
// Auto-merge: unisce automaticamente i pacchi identici nel carrello (lato server)
onMounted(async () => {
	if (route.query.updated) {
		// Invalidiamo la cache e forziamo un fetch fresco
		clearNuxtData("cart");
	}
	// Il merge avviene automaticamente nel backend quando si carica il carrello
	await refresh();
});

// --- FILTRI ---
// Filtro per citta' di provenienza della spedizione
const filterProvenienza = ref('');
// Filtro per riferimento (ID, nome mittente o destinatario)
const filterRiferimento = ref('');

// Lista filtrata degli elementi del carrello in base ai filtri attivi
const filteredCartItems = computed(() => {
	if (!cart.value?.data) return [];
	let items = [...cart.value.data];
	// Filtra per citta' di origine
	if (filterProvenienza.value) {
		items = items.filter(item =>
			item.origin_address?.city?.toLowerCase().includes(filterProvenienza.value.toLowerCase())
		);
	}
	// Filtra per riferimento (ID, nome mittente o destinatario)
	if (filterRiferimento.value) {
		items = items.filter(item =>
			String(item.id).includes(filterRiferimento.value) ||
			(item.origin_address?.name || '').toLowerCase().includes(filterRiferimento.value.toLowerCase()) ||
			(item.destination_address?.name || '').toLowerCase().includes(filterRiferimento.value.toLowerCase())
		);
	}
	return items;
});

// Elenco delle citta' uniche di provenienza per il dropdown filtro
const uniqueCities = computed(() => {
	if (!cart.value?.data) return [];
	const cities = cart.value.data.map(item => item.origin_address?.city).filter(Boolean);
	return [...new Set(cities)];
});

// --- ELIMINAZIONE SINGOLA SPEDIZIONE ---
const showDeleteConfirm = ref(false);   // Mostra/nasconde il popup di conferma eliminazione
const deleteTargetId = ref(null);        // ID della spedizione da eliminare
const deleteLoading = ref(false);        // Stato di caricamento durante l'eliminazione

// Apre il popup di conferma eliminazione per una spedizione
const askDelete = (id) => {
	deleteTargetId.value = id;
	showDeleteConfirm.value = true;
};

// Conferma l'eliminazione della spedizione dal carrello
const confirmDelete = async () => {
	deleteLoading.value = true;
	try {
		await sanctum(`/api/cart/${deleteTargetId.value}`, { method: "DELETE" });
		clearNuxtData("cart");
		await refreshNuxtData("cart");
		toast.add({ title: 'Spedizione rimossa dal carrello.', color: 'success' });
	} catch (e) {
		console.error(e);
		toast.add({ title: 'Errore durante la rimozione. Riprova.', color: 'error' });
	} finally {
		deleteLoading.value = false;
		showDeleteConfirm.value = false;
		deleteTargetId.value = null;
	}
};

// --- SVUOTA CARRELLO ---
const showEmptyConfirm = ref(false);    // Mostra/nasconde il popup di conferma svuotamento
const emptyCartLoading = ref(false);    // Stato di caricamento durante lo svuotamento

// Svuota completamente il carrello chiamando l'API di svuotamento
const emptyCart = async () => {
	emptyCartLoading.value = true;
	try {
		await sanctum(endpoint.value, { method: "DELETE" });
		clearNuxtData("cart");
		await refreshNuxtData("cart");
		showEmptyConfirm.value = false;
		toast.add({ title: 'Carrello svuotato.', color: 'success' });
	} catch (error) {
		console.error(error);
		toast.add({ title: 'Errore durante lo svuotamento del carrello.', color: 'error' });
	} finally {
		emptyCartLoading.value = false;
	}
};

// --- HELPER PREZZI ---
// Formatta il prezzo da centesimi a euro con virgola (es. 1200 -> "12,00€")
// single_price e' salvato in centesimi nel backend (prezzo * 100)
// single_price = prezzo totale per tutte le quantita' (prezzo_unitario * quantita')
const formatPrice = (cents) => {
	if (!cents && cents !== 0) return '0,00\u20AC';
	const num = Number(cents) / 100;
	return num.toFixed(2).replace('.', ',') + '\u20AC';
};

// Calcola il prezzo unitario dividendo il totale per la quantita'
const unitPrice = (item) => {
	const total = Number(item.single_price) || 0;
	const qty = Math.max(1, Number(item.quantity) || 1);
	return Math.round(total / qty);
};

// --- AGGIORNAMENTO QUANTITA' ---
const quantityUpdating = ref(null); // ID dell'elemento in fase di aggiornamento quantita'

// Aggiorna la quantita' di una spedizione nel carrello tramite API
const updateQuantity = async (itemId, newQty) => {
	if (newQty < 1) return;
	quantityUpdating.value = itemId;
	try {
		await sanctum(`/api/cart/${itemId}/quantity`, {
			method: 'PATCH',
			body: { quantity: newQty },
		});
		clearNuxtData("cart");
		await refreshNuxtData("cart");
	} catch (e) {
		console.error('Errore aggiornamento quantita:', e);
		toast.add({ title: 'Errore nell\'aggiornamento della quantita. Riprova.', color: 'error' });
	} finally {
		quantityUpdating.value = null;
	}
};

// Formatta la data di creazione dell'elemento in formato italiano (gg/mm/aaaa)
const formatDate = (item) => {
	if (item.created_at) {
		return new Date(item.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}
	return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Restituisce l'icona corrispondente al tipo di pacco (pallet, busta, valigia o pacco generico)
const getPackageIcon = (item) => {
	const type = item.package_type?.toLowerCase() || '';
	if (type.includes('pallet')) return '/img/quote/first-step/pallet.png';
	if (type.includes('busta')) return '/img/quote/first-step/envelope.png';
	if (type.includes('valigia')) return '/img/quote/first-step/suitcase.png';
	return '/img/quote/first-step/pack.png';
};

// --- RAGGRUPPAMENTO PER INDIRIZZO ---
// Dati dei gruppi dal backend (meta.address_groups)
const addressGroups = computed(() => cart.value?.meta?.address_groups || []);

// Colori per i gruppi (usati per le bande laterali dei gruppi multi-collo)
const groupColors = ['#095866', '#E44203', '#6B21A8', '#0369A1', '#B45309'];

// Stato di espansione dei gruppi (true = espanso, default espanso)
const expandedGroups = ref({});

// Toggle espansione gruppo
const toggleGroup = (groupIdx) => {
	expandedGroups.value[groupIdx] = !isGroupExpanded(groupIdx);
};

// Controlla se un gruppo e' espanso (default: espanso)
const isGroupExpanded = (groupIdx) => {
	return expandedGroups.value[groupIdx] !== false;
};

// Costruisce la lista di display raggruppando gli elementi filtrati secondo i gruppi API
// Ogni voce e' o un 'group' (multi-collo) o un 'single' (collo singolo)
const displayEntries = computed(() => {
	const items = filteredCartItems.value;
	if (!items.length) return [];

	const filteredIds = new Set(items.map(i => i.id));
	const usedIds = new Set();
	const entries = [];

	// Per ogni gruppo del backend, verifichiamo quanti items filtrati ne fanno parte
	for (let gIdx = 0; gIdx < addressGroups.value.length; gIdx++) {
		const group = addressGroups.value[gIdx];
		const groupItems = (group.package_ids || [])
			.filter(id => filteredIds.has(id) && !usedIds.has(id))
			.map(id => items.find(i => i.id === id))
			.filter(Boolean);

		if (groupItems.length === 0) continue;

		groupItems.forEach(i => usedIds.add(i.id));

		if (groupItems.length > 1) {
			// Gruppo multi-collo: mostra come card raggruppata
			const groupTotal = groupItems.reduce((sum, i) => sum + (Number(i.single_price) || 0), 0);
			entries.push({
				type: 'group',
				groupIndex: gIdx,
				group,
				items: groupItems,
				totalCents: groupTotal,
				color: groupColors[gIdx % groupColors.length],
			});
		} else {
			// Singolo collo: mostra come riga normale
			entries.push({
				type: 'single',
				groupIndex: gIdx,
				item: groupItems[0],
			});
		}
	}

	// Items che non sono in nessun gruppo (fallback sicuro)
	for (const item of items) {
		if (!usedIds.has(item.id)) {
			entries.push({
				type: 'single',
				groupIndex: -1,
				item,
			});
		}
	}

	return entries;
});

// --- COUPON / CODICE SCONTO ---
const couponCode = ref('');           // Codice coupon inserito dall'utente
const couponMessage = ref(null);      // Messaggio di feedback (successo o errore)
const couponApplied = ref(false);     // Se un coupon e' stato applicato con successo
const couponDiscount = ref(null);     // Percentuale di sconto del coupon
const appliedTotal = ref(null);       // Nuovo totale dopo lo sconto

// Verifica e applica il coupon chiamando l'API del backend
const applyCoupon = async () => {
	if (!couponCode.value.trim()) return;
	couponMessage.value = null;

	try {
		// Converti il totale dal formato stringa "12,50 EUR" a numero 12.50
		const total = cart.value?.meta?.total;
		const numericTotal = Number(String(total).replace(/[\u20AC\s\u00A0EUR]/gi, '').replace(/\./g, '').replace(',', '.')) || 0;

		const data = await sanctum('/api/calculate-coupon', {
			method: 'POST',
			body: { coupon: couponCode.value, total: numericTotal },
		});

		if (data?.success) {
			couponApplied.value = true;
			couponDiscount.value = data.percentage;
			appliedTotal.value = data.new_total;
			couponMessage.value = { type: 'success', text: `Sconto del ${data.percentage}% applicato!` };
		} else {
			couponMessage.value = { type: 'error', text: 'Coupon non valido.' };
		}
	} catch (e) {
		couponMessage.value = { type: 'error', text: 'Errore nella verifica del coupon.' };
	}
};

// Rimuove il coupon applicato e ripristina il totale originale
const removeCoupon = () => {
	couponCode.value = '';
	couponApplied.value = false;
	couponDiscount.value = null;
	appliedTotal.value = null;
	couponMessage.value = null;
};

// Totale da mostrare: con sconto se coupon applicato, altrimenti totale originale
const displayTotal = computed(() => {
	return couponApplied.value && appliedTotal.value ? appliedTotal.value : cart.value?.meta?.total;
});
</script>

<template>
	<section class="min-h-[600px] py-[30px] desktop:py-[50px] bg-[#F0F0F0]">
		<div class="my-container max-w-[1200px]">
			<!-- Cart content -->
			<div v-if="cart?.data?.length > 0" class="max-w-[1200px] mx-auto">
				<!-- Promo banner -->
				<div v-if="promoSettings?.active && promoSettings?.label_text" class="flex justify-center mb-[16px]">
					<span
						:style="{ backgroundColor: promoSettings.label_color || '#E44203' }"
						class="inline-flex items-center gap-[6px] px-[16px] py-[8px] rounded-[10px] text-white text-[0.9375rem] font-bold tracking-wide shadow-sm">
						<!-- Ottimizzazione: lazy loading + decoding async + dimensioni per CLS -->
						<img v-if="promoSettings.label_image" :src="promoSettings.label_image" alt="" loading="lazy" decoding="async" width="40" height="20" class="h-[20px] w-auto" />
						{{ promoSettings.label_text }}
					</span>
				</div>

				<!-- Title -->
				<h1 class="text-[1.5rem] tablet:text-[2rem] font-bold text-[#252B42] text-center mb-[4px] font-montserrat">Carrello</h1>
				<div class="w-[40px] h-[3px] bg-[#E44203] mx-auto mb-[32px]"></div>

				<!-- Main card -->
				<div class="bg-[#E6E6E6] rounded-[20px] p-[16px] tablet:p-[30px_36px] border border-dashed border-[#B0B0B0]">
					<!-- Filters row -->
					<div class="flex flex-col tablet:flex-row gap-[12px] tablet:gap-[16px] items-stretch tablet:items-center mb-[20px]">
						<div class="w-full tablet:flex-1 tablet:min-w-[200px] tablet:max-w-[400px]">
							<select v-model="filterProvenienza" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[48px] tablet:h-[44px] px-[18px] text-[1rem] tablet:text-[0.875rem] text-[#404040] appearance-none cursor-pointer transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]">
								<option value="">Provenienza</option>
								<option v-for="city in uniqueCities" :key="city" :value="city">{{ city }}</option>
							</select>
						</div>
						<div class="w-full tablet:flex-1 tablet:min-w-[200px] tablet:max-w-[400px] tablet:ml-auto">
							<input type="text" v-model="filterRiferimento" placeholder="Riferimento" class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[48px] tablet:h-[44px] px-[18px] text-[1rem] tablet:text-[0.875rem] text-[#404040] placeholder:text-[#999] transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
						</div>
					</div>

					<!-- Dotted divider -->
					<div class="border-t border-dashed border-[#B0B0B0] my-[16px]"></div>

					<!-- Coupon row -->
					<div class="flex flex-col tablet:flex-row items-stretch tablet:items-center gap-[12px] tablet:gap-[16px] mb-[20px]">
						<span class="text-[1rem] font-bold text-[#252B42]">Inserisci Coupon</span>
						<div class="w-full tablet:flex-1 tablet:max-w-[300px]">
							<input
								v-if="!couponApplied"
								type="text"
								v-model="couponCode"
								placeholder="PROVA123"
								class="w-full bg-white border border-[#D0D0D0] rounded-[30px] h-[48px] tablet:h-[44px] px-[18px] text-[1rem] tablet:text-[0.875rem] text-[#404040] placeholder:text-[#999] transition-[border-color,box-shadow] duration-200 focus:border-[#095866] focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]" />
							<div v-else class="flex items-center gap-[8px] bg-emerald-50 border border-emerald-200 rounded-[30px] h-[44px] px-[18px]">
								<span class="text-emerald-700 font-semibold text-[0.875rem]">{{ couponCode.toUpperCase() }} (-{{ couponDiscount }}%)</span>
								<button @click="removeCoupon" class="text-red-500 text-[0.75rem] hover:underline cursor-pointer ml-auto">X</button>
							</div>
						</div>
						<button
							v-if="!couponApplied"
							type="button"
							@click="applyCoupon"
							class="inline-flex items-center justify-center gap-[6px] bg-[#095866] text-white font-semibold text-[0.9375rem] px-[28px] min-h-[48px] w-full tablet:w-auto rounded-[30px] hover:bg-[#074a56] transition-[background-color,transform] duration-200 cursor-pointer active:scale-[0.97]">
							<Icon name="mdi:tag-outline" class="text-[18px]" />
							Applica Coupon
						</button>
					</div>
					<p v-if="couponMessage" class="text-[0.8125rem] mb-[12px]" :class="couponMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'">
						{{ couponMessage.text }}
					</p>

					<!-- Dotted divider -->
					<div class="border-t border-dashed border-[#B0B0B0] my-[16px]"></div>

					<!-- Spedizioni section -->
					<h2 class="text-[1.25rem] font-bold text-[#252B42] text-center mb-[16px]">Spedizioni</h2>

					<!-- Display entries (grouped or single) -->
					<div class="space-y-[12px]">
						<template v-for="(entry, eIdx) in displayEntries" :key="'e-'+eIdx">

							<!-- ========== GROUPED ENTRY (multi-collo) ========== -->
							<div v-if="entry.type === 'group'"
								class="bg-white rounded-[16px] border-l-[4px] overflow-hidden"
								:style="{ borderLeftColor: entry.color }">

								<!-- Group header (clickable to expand/collapse) -->
								<button
									type="button"
									@click="toggleGroup(entry.groupIndex)"
									class="w-full flex items-center gap-[10px] tablet:gap-[16px] p-[14px] tablet:p-[20px] hover:bg-[#f8fafb] transition cursor-pointer text-left">
									<!-- Merge icon -->
									<div class="w-[36px] h-[36px] tablet:w-[44px] tablet:h-[44px] rounded-[10px] tablet:rounded-[12px] flex items-center justify-center shrink-0"
										:style="{ backgroundColor: entry.color + '15' }">
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" :stroke="entry.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tablet:w-[22px] tablet:h-[22px]"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
									</div>

									<!-- Route info -->
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-[6px] tablet:gap-[8px] flex-wrap">
											<span class="text-[0.8125rem] tablet:text-[0.9375rem] font-bold text-[#252B42]">
												{{ entry.items[0]?.origin_address?.city || 'Partenza' }}
											</span>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 tablet:w-[18px] tablet:h-[18px]"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
											<span class="text-[0.8125rem] tablet:text-[0.9375rem] font-bold text-[#252B42]">
												{{ entry.items[0]?.destination_address?.city || 'Destinazione' }}
											</span>
										</div>
										<div class="flex items-center gap-[12px] mt-[4px] flex-wrap">
											<span class="text-[0.8125rem] text-[#737373]">
												{{ entry.items.length }} colli
											</span>
											<span class="inline-flex items-center gap-[4px] px-[8px] py-[2px] rounded-[6px] text-[0.75rem] font-semibold text-white"
												:style="{ backgroundColor: entry.color }">
												<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>
												Spedizione unica
											</span>
											<span class="text-[0.75rem] text-[#737373] bg-[#F0F0F0] px-[8px] py-[2px] rounded-[6px]">
												{{ entry.items[0]?.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}
											</span>
										</div>
									</div>

									<!-- Total price -->
									<div class="text-right shrink-0">
										<p class="text-[0.9375rem] tablet:text-[1.125rem] font-bold text-[#252B42]">{{ formatPrice(entry.totalCents) }}</p>
										<p class="text-[0.6875rem] tablet:text-[0.75rem] text-[#737373]">totale gruppo</p>
									</div>

									<!-- Expand/collapse chevron -->
									<div class="shrink-0 ml-[4px] transition-transform" :class="{ 'rotate-180': isGroupExpanded(entry.groupIndex) }">
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
									</div>
								</button>

								<!-- Group addresses (always visible) -->
								<div class="px-[14px] tablet:px-[20px] pb-[4px] flex flex-wrap gap-x-[24px] gap-y-[4px] text-[0.75rem] tablet:text-[0.8125rem] text-[#404040]">
									<div class="flex items-start gap-[6px] min-w-0">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" class="shrink-0 mt-[2px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
										<span class="break-words">{{ entry.items[0]?.origin_address?.name || '' }} - {{ entry.items[0]?.origin_address?.address || '' }}, {{ entry.items[0]?.origin_address?.city || '' }}</span>
									</div>
									<div class="flex items-start gap-[6px] min-w-0">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0 mt-[2px]"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
										<span class="break-words">{{ entry.items[0]?.destination_address?.name || '' }} - {{ entry.items[0]?.destination_address?.address || '' }}, {{ entry.items[0]?.destination_address?.city || '' }}</span>
									</div>
								</div>

								<!-- Expanded: individual parcels -->
								<div v-if="isGroupExpanded(entry.groupIndex)" class="px-[12px] tablet:px-[20px] pb-[16px] pt-[8px]">
									<div class="border-t border-dashed border-[#D0D0D0] pt-[12px]">
										<div
											v-for="(item, pIdx) in entry.items"
											:key="item.id"
											class="flex flex-wrap tablet:flex-nowrap items-center gap-[8px] tablet:gap-[12px] py-[10px] px-[8px] tablet:px-[12px] rounded-[10px] mb-[6px]"
											:class="pIdx % 2 === 0 ? 'bg-[#F8F9FB]' : 'bg-white'">
											<!-- Package icon -->
											<div class="w-[32px] h-[32px] tablet:w-[36px] tablet:h-[36px] rounded-[8px] bg-[#F0F0F0] flex items-center justify-center shrink-0">
												<!-- Ottimizzazione: decoding async -->
												<NuxtImg :src="getPackageIcon(item)" alt="" width="22" height="22" loading="lazy" decoding="async" class="w-[18px] h-[18px] tablet:w-[22px] tablet:h-[22px]" />
											</div>

											<!-- Package info -->
											<div class="flex-1 min-w-0">
												<p class="text-[0.8125rem] tablet:text-[0.875rem] font-semibold text-[#252B42]">
													Collo {{ pIdx + 1 }}
													<span class="font-normal text-[#737373] ml-[4px]">{{ item.package_type || 'Pacco' }}</span>
												</p>
												<p class="text-[0.75rem] tablet:text-[0.8125rem] text-[#737373]">
													{{ item.weight }} kg
													<span class="mx-[4px]">&middot;</span>
													{{ item.first_size }}x{{ item.second_size }}x{{ item.third_size }} cm
												</p>
											</div>

											<!-- Price (on mobile, placed next to package info) -->
											<div class="text-right shrink-0 min-w-[60px] tablet:min-w-[70px]">
												<span v-if="(item.quantity || 1) > 1" class="block text-[0.6875rem] text-[#737373]">{{ formatPrice(unitPrice(item)) }}/cad</span>
												<span class="text-[0.8125rem] tablet:text-[0.875rem] font-semibold text-[#252B42]">{{ formatPrice(item.single_price) }}</span>
											</div>

											<!-- Quantity + Actions row (wraps to second line on mobile) -->
											<div class="w-full tablet:w-auto flex items-center justify-between tablet:justify-start gap-[8px] tablet:gap-[4px] pl-[40px] tablet:pl-0">
												<!-- Quantity -->
												<div class="flex items-center gap-[4px] shrink-0">
													<button type="button" @click="updateQuantity(item.id, (item.quantity || 1) - 1)" :disabled="(item.quantity || 1) <= 1" class="w-[32px] h-[32px] tablet:w-[24px] tablet:h-[24px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.875rem] tablet:text-[0.75rem] font-bold hover:bg-[#D0D0D0] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-90">-</button>
													<span class="min-w-[20px] text-center font-semibold text-[0.8125rem] text-[#252B42]">{{ item.quantity || 1 }}</span>
													<button type="button" @click="updateQuantity(item.id, (item.quantity || 1) + 1)" class="w-[32px] h-[32px] tablet:w-[24px] tablet:h-[24px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.875rem] tablet:text-[0.75rem] font-bold hover:bg-[#D0D0D0] cursor-pointer transition-[background-color,transform] duration-200 active:scale-90">+</button>
												</div>

												<!-- Actions -->
												<div class="flex items-center gap-[6px] shrink-0">
													<NuxtLink :to="`/riepilogo?edit=${item.id}`" class="min-w-[36px] min-h-[36px] tablet:min-w-0 tablet:min-h-0 flex items-center justify-center text-[#095866] hover:text-[#074a56] cursor-pointer" title="Modifica collo">
														<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
													</NuxtLink>
													<button type="button" @click="askDelete(item.id)" class="min-w-[36px] min-h-[36px] tablet:min-w-0 tablet:min-h-0 flex items-center justify-center text-red-500 hover:text-red-700 cursor-pointer" title="Elimina collo">
														<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
													</button>
												</div>
											</div>
										</div>
									</div>
								</div>

								<!-- Collapsed summary -->
								<div v-else class="px-[14px] tablet:px-[20px] pb-[16px] pt-[4px]">
									<p class="text-[0.75rem] tablet:text-[0.8125rem] text-[#737373]">
										{{ entry.items.map((i, idx) => `Collo ${idx + 1}: ${i.weight}kg`).join(' | ') }}
									</p>
								</div>
							</div>

							<!-- ========== SINGLE ENTRY (collo singolo) ========== -->
							<div v-else
								class="bg-white rounded-[16px] overflow-hidden">

								<!-- Desktop layout -->
								<div class="hidden desktop:flex items-center gap-[16px] p-[16px_20px]">
									<!-- Package icon -->
									<div class="w-[44px] h-[44px] rounded-[10px] bg-[#F8F9FB] flex items-center justify-center shrink-0">
										<!-- Ottimizzazione: decoding async -->
										<NuxtImg :src="getPackageIcon(entry.item)" alt="" width="28" height="28" loading="lazy" decoding="async" />
									</div>

									<!-- Route -->
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-[8px]">
											<span class="text-[0.9375rem] font-semibold text-[#252B42]">
												{{ entry.item.origin_address?.city || 'Partenza' }}
											</span>
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
											<span class="text-[0.9375rem] font-semibold text-[#252B42]">
												{{ entry.item.destination_address?.city || 'Destinazione' }}
											</span>
										</div>
										<p class="text-[0.8125rem] text-[#737373] mt-[2px]">
											{{ entry.item.package_type || 'Pacco' }}
											<span class="mx-[4px]">&middot;</span>
											{{ entry.item.weight }} kg
											<span class="mx-[4px]">&middot;</span>
											{{ entry.item.first_size }}x{{ entry.item.second_size }}x{{ entry.item.third_size }} cm
										</p>
									</div>

									<!-- Service -->
									<span class="text-[0.75rem] text-[#737373] bg-[#F0F0F0] px-[8px] py-[3px] rounded-[6px] shrink-0">
										{{ entry.item.services?.service_type?.split(',')[0]?.trim() || 'BRT' }}
									</span>

									<!-- Addresses -->
									<div class="text-[0.75rem] text-[#404040] shrink-0 max-w-[200px]">
										<div class="flex items-center gap-[4px]">
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E44203" stroke-width="2" class="shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
											<span class="truncate">{{ entry.item.origin_address?.name?.split(' ')[0] || '' }} - {{ entry.item.origin_address?.city || '' }}</span>
										</div>
										<div class="flex items-center gap-[4px] mt-[2px]">
											<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" class="shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
											<span class="truncate">{{ entry.item.destination_address?.name?.split(' ')[0] || '' }} - {{ entry.item.destination_address?.city || '' }}</span>
										</div>
									</div>

									<!-- Quantity -->
									<div class="flex items-center gap-[4px] shrink-0">
										<button type="button" @click="updateQuantity(entry.item.id, (entry.item.quantity || 1) - 1)" :disabled="(entry.item.quantity || 1) <= 1" class="w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.75rem] font-bold hover:bg-[#D0D0D0] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-90">-</button>
										<span class="min-w-[20px] text-center font-semibold text-[0.8125rem]">{{ entry.item.quantity || 1 }}</span>
										<button type="button" @click="updateQuantity(entry.item.id, (entry.item.quantity || 1) + 1)" class="w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.75rem] font-bold hover:bg-[#D0D0D0] cursor-pointer transition-[background-color,transform] duration-200 active:scale-90">+</button>
									</div>

									<!-- Price -->
									<div class="text-right shrink-0 min-w-[80px]">
										<span v-if="(entry.item.quantity || 1) > 1" class="block text-[0.6875rem] text-[#737373]">{{ formatPrice(unitPrice(entry.item)) }}/cad</span>
										<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(entry.item.single_price) }}</span>
									</div>

									<!-- Actions -->
									<div class="flex items-center gap-[8px] shrink-0">
										<NuxtLink :to="`/riepilogo?edit=${entry.item.id}`" class="text-[#095866] hover:text-[#074a56] cursor-pointer" title="Modifica">
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
										</NuxtLink>
										<button type="button" @click="askDelete(entry.item.id)" class="text-red-500 hover:text-red-700 cursor-pointer" title="Elimina">
											<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
										</button>
									</div>
								</div>

								<!-- Mobile layout -->
								<div class="desktop:hidden p-[14px]">
									<div class="flex items-center justify-between mb-[8px]">
										<div class="min-w-0 flex-1 mr-[10px]">
											<p class="text-[0.875rem] font-semibold text-[#252B42] truncate">{{ entry.item.origin_address?.city || 'Partenza' }} &rarr; {{ entry.item.destination_address?.city || 'Destinazione' }}</p>
											<p class="text-[0.75rem] text-[#737373]">{{ entry.item.weight }} kg &middot; {{ entry.item.first_size }}x{{ entry.item.second_size }}x{{ entry.item.third_size }} cm</p>
										</div>
										<div class="text-right shrink-0">
											<span v-if="(entry.item.quantity || 1) > 1" class="block text-[0.6875rem] text-[#737373]">{{ formatPrice(unitPrice(entry.item)) }}/cad</span>
											<span class="text-[0.9375rem] font-bold text-[#252B42]">{{ formatPrice(entry.item.single_price) }}</span>
										</div>
									</div>
									<div class="flex items-center justify-between mt-[6px]">
										<div class="flex items-center gap-[8px]">
											<button type="button" @click="updateQuantity(entry.item.id, (entry.item.quantity || 1) - 1)" :disabled="(entry.item.quantity || 1) <= 1" class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.875rem] font-bold hover:bg-[#D0D0D0] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-[background-color,transform] duration-200 active:scale-90">-</button>
											<span class="min-w-[24px] text-center font-semibold text-[0.875rem] text-[#252B42]">{{ entry.item.quantity || 1 }}x</span>
											<button type="button" @click="updateQuantity(entry.item.id, (entry.item.quantity || 1) + 1)" class="w-[36px] h-[36px] flex items-center justify-center rounded-full bg-[#E9EBEC] text-[#252B42] text-[0.875rem] font-bold hover:bg-[#D0D0D0] cursor-pointer transition-[background-color,transform] duration-200 active:scale-90">+</button>
										</div>
										<div class="flex items-center gap-[12px]">
											<NuxtLink :to="`/riepilogo?edit=${entry.item.id}`" class="inline-flex items-center gap-[4px] text-[0.8125rem] text-[#095866] font-semibold hover:underline cursor-pointer min-h-[44px] px-[4px]">
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
												Modifica
											</NuxtLink>
											<button type="button" @click="askDelete(entry.item.id)" class="text-[0.8125rem] text-red-500 font-semibold hover:underline cursor-pointer min-h-[44px] px-[4px]">Elimina</button>
										</div>
									</div>
								</div>
							</div>

						</template>
					</div>

					<!-- Totals -->
					<div class="mt-[20px] border-t border-[#C0C0C0] pt-[12px]">
						<div class="flex items-center justify-between py-[8px] border-b border-dashed border-[#C0C0C0]">
							<span class="text-[0.9375rem] font-bold text-[#252B42]">Importo spedizioni</span>
							<span class="text-[0.9375rem] font-bold text-[#252B42]" :class="{ 'line-through text-[#A0A5AB]': couponApplied }">{{ cart.meta?.total }}</span>
						</div>
						<div v-if="couponApplied" class="flex items-center justify-between py-[8px] border-b border-dashed border-[#C0C0C0]">
							<span class="text-[0.9375rem] font-bold text-emerald-600">Sconto coupon ({{ couponDiscount }}%)</span>
							<span class="text-[0.9375rem] font-bold text-emerald-600">{{ appliedTotal }}</span>
						</div>
						<div class="flex items-center justify-between py-[8px]">
							<span class="text-[1rem] font-bold text-[#252B42]">Importo totale</span>
							<span class="text-[1rem] font-bold text-[#252B42]">{{ displayTotal }}</span>
						</div>
					</div>

					<!-- Action buttons -->
					<div class="flex flex-col-reverse tablet:flex-row items-stretch tablet:items-center tablet:justify-between mt-[24px] gap-[12px]">
						<button
							type="button"
							@click="showEmptyConfirm = true"
							class="inline-flex items-center justify-center gap-[6px] px-[20px] min-h-[48px] rounded-[30px] border border-[#E9EBEC] text-[#737373] text-[0.875rem] font-medium hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-[border-color,color,background-color,transform] duration-200 cursor-pointer active:scale-[0.97]">
							<Icon name="mdi:delete-sweep-outline" class="text-[18px]" />
							Svuota carrello
						</button>
						<NuxtLink
							to="/checkout"
							class="inline-flex items-center justify-center gap-[8px] px-[40px] min-h-[52px] rounded-[30px] bg-[#E44203] text-white font-semibold text-[1rem] hover:bg-[#c93800] transition-[background-color,box-shadow,transform] duration-200 shadow-sm hover:shadow-[0_4px_12px_rgba(228,66,3,0.3)] active:scale-[0.97]">
							Procedi con l'ordine
							<Icon name="mdi:arrow-right" class="text-[20px]" />
						</NuxtLink>
					</div>
				</div>
			</div>

			<!-- Empty cart -->
			<div v-else-if="status !== 'pending'" class="max-w-[600px] mx-auto py-[80px] text-center">
				<h1 class="text-[1.5rem] tablet:text-[2rem] font-bold text-[#252B42] text-center mb-[4px] font-montserrat">Carrello</h1>
				<div class="w-[40px] h-[3px] bg-[#E44203] mx-auto mb-[32px]"></div>
				<div class="w-[80px] h-[80px] mx-auto mb-[20px] bg-[#E44203] rounded-full flex items-center justify-center">
					<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
				</div>
				<h2 class="text-[1.25rem] font-bold text-[#252B42] mb-[10px]">Il carrello è vuoto</h2>
				<p class="text-[#737373] text-[0.9375rem] max-w-[400px] mx-auto mb-[24px] leading-[1.6]">
					Non hai ancora aggiunto spedizioni al carrello. Configura la tua prima spedizione per iniziare.
				</p>
				<NuxtLink
					to="/preventivo"
					class="inline-flex items-center gap-[6px] px-[24px] py-[14px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[10px] font-semibold text-[0.9375rem] transition-[background-color,transform] duration-200 active:scale-[0.97] min-h-[48px]">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					Crea nuova spedizione
				</NuxtLink>
			</div>
		</div>

		<!-- Delete confirm popup -->
		<UModal v-model:open="showDeleteConfirm" :dismissible="true" :close="false">
			<template #title>
				<h3 class="text-[1.125rem] font-bold text-[#252B42]">Conferma eliminazione</h3>
			</template>
			<template #body>
				<p class="text-[0.9375rem] text-[#737373] leading-[1.6]">
					Sei sicuro di voler rimuovere questa spedizione dal carrello? L'azione non può essere annullata.
				</p>
			</template>
			<template #footer>
				<div class="flex justify-end gap-[10px]">
					<button
						type="button"
						@click="showDeleteConfirm = false"
						class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[10px] border border-[#E9EBEC] text-[#737373] hover:bg-[#F8F9FB] transition text-[0.875rem] font-medium cursor-pointer">
						<Icon name="mdi:close" class="text-[18px]" />
						Annulla
					</button>
					<button
						type="button"
						@click="confirmDelete"
						:disabled="deleteLoading"
						class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[10px] bg-red-500 text-white hover:bg-red-600 transition text-[0.875rem] font-semibold disabled:opacity-60 cursor-pointer">
						<Icon name="mdi:delete-outline" class="text-[18px]" />
						{{ deleteLoading ? 'Eliminazione...' : 'Elimina' }}
					</button>
				</div>
			</template>
		</UModal>

		<!-- Empty cart confirm popup -->
		<UModal v-model:open="showEmptyConfirm" :dismissible="true" :close="false">
			<template #title>
				<h3 class="text-[1.125rem] font-bold text-[#252B42]">Svuota carrello</h3>
			</template>
			<template #body>
				<p class="text-[0.9375rem] text-[#737373] leading-[1.6]">
					Sei sicuro di voler svuotare tutto il carrello? Tutte le spedizioni verranno rimosse.
				</p>
			</template>
			<template #footer>
				<div class="flex justify-end gap-[10px]">
					<button
						type="button"
						@click="showEmptyConfirm = false"
						class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[10px] border border-[#E9EBEC] text-[#737373] hover:bg-[#F8F9FB] transition text-[0.875rem] font-medium cursor-pointer">
						<Icon name="mdi:close" class="text-[18px]" />
						Annulla
					</button>
					<button
						type="button"
						@click="emptyCart"
						:disabled="emptyCartLoading"
						class="inline-flex items-center gap-[6px] px-[20px] py-[10px] rounded-[10px] bg-red-500 text-white hover:bg-red-600 transition text-[0.875rem] font-semibold disabled:opacity-60 cursor-pointer">
						<Icon name="mdi:delete-sweep-outline" class="text-[18px]" />
						{{ emptyCartLoading ? 'Svuotamento...' : 'Svuota tutto' }}
					</button>
				</div>
			</template>
		</UModal>
	</section>
</template>
