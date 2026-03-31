# Modifiche Nuovo Flusso UX - Preventivo.vue

## Data: 2026-03-02

---

## NUOVO FLUSSO UTENTE

### Prima (vecchio flusso):
1. Seleziona tipo collo (Pacco/Pallet/Valigia)
2. Inserisci dimensioni e peso

### Ora (nuovo flusso):
1. **Inserisci dimensioni e peso PRIMA**
2. **Poi seleziona tipo collo**

---

## MODIFICHE JAVASCRIPT

### 1. Nuove Variabili di Stato (righe 88-89)
```javascript
const showDimensionForm = ref(true);  // Mostra form dimensioni all'inizio
const showPackageTypeSelector = ref(false);  // Mostra selettore DOPO dimensioni
```

### 2. Dati Temporanei (righe 103-109)
```javascript
const tempPackageData = ref({
	weight: '',
	first_size: '',
	second_size: '',
	third_size: '',
	quantity: 1
});
```

### 3. Funzione Validazione Dimensioni (righe 282-313)
```javascript
const validateDimensionsAndShowSelector = () => {
	// Verifica campi compilati
	if (!tempPackageData.value.weight || !tempPackageData.value.first_size ||
	    !tempPackageData.value.second_size || !tempPackageData.value.third_size) {
		messageError.value = { packages: ["Compila tutti i campi: peso e dimensioni."] };
		return;
	}

	// Verifica valori numerici validi
	const weight = parseFloat(tempPackageData.value.weight);
	const size1 = parseFloat(tempPackageData.value.first_size);
	const size2 = parseFloat(tempPackageData.value.second_size);
	const size3 = parseFloat(tempPackageData.value.third_size);

	if (isNaN(weight) || weight <= 0 ||
	    isNaN(size1) || size1 <= 0 ||
	    isNaN(size2) || size2 <= 0 ||
	    isNaN(size3) || size3 <= 0) {
		messageError.value = { packages: ["Inserisci valori numerici validi maggiori di zero."] };
		return;
	}

	messageError.value = null;

	// Nascondi form dimensioni e mostra selettore tipo
	showDimensionForm.value = false;
	setTimeout(() => {
		showPackageTypeSelector.value = true;
	}, 300);
};
```

### 4. Funzione Annulla Selezione (righe 316-325)
```javascript
const cancelSelector = () => {
	cancellingSelector.value = true;
	showPackageTypeSelector.value = false;
	setTimeout(() => {
		showDimensionForm.value = true;
		cancellingSelector.value = false;
		selectedCardIndex.value = null;
		animationPhase.value = 'idle';
	}, 300);
};
```

### 5. Funzione Aggiungi Altro Collo (righe 479-489)
```javascript
const addAnotherPackage = () => {
	showAddButton.value = false;
	showDimensionForm.value = true;
	tempPackageData.value = {
		weight: '',
		first_size: '',
		second_size: '',
		third_size: '',
		quantity: 1
	};
};
```

### 6. Aggiornamento selectPackageType (righe 326-336)
Ora usa i dati da `tempPackageData`:
```javascript
newPackage.value = {
	package_type: packageType.text,
	quantity: tempPackageData.value.quantity,
	weight: tempPackageData.value.weight,
	first_size: tempPackageData.value.first_size,
	second_size: tempPackageData.value.second_size,
	third_size: tempPackageData.value.third_size,
	img: packageType.img,
	width: packageType.width,
	height: packageType.height
};
```

### 7. Aggiornamento resetForm (righe 841-873)
```javascript
// Reset temp package data
tempPackageData.value = {
	weight: '',
	first_size: '',
	second_size: '',
	third_size: '',
	quantity: 1
};

// Reset animation states per nuovo flusso
showDimensionForm.value = true;
showPackageTypeSelector.value = false;
showPackSection.value = false;
showAddButton.value = false;
```

### 8. Aggiornamento onMounted (righe 135-151)
```javascript
onMounted(() => {
	TIMING.init();
	loadPriceBands();

	// Inizializza stato basato su pacchi esistenti
	if (userStore.packages.length > 0) {
		showDimensionForm.value = false;
		showPackageTypeSelector.value = false;
		showPackSection.value = true;
		showAddButton.value = true;
	} else {
		showDimensionForm.value = true;
		showPackageTypeSelector.value = false;
		showPackSection.value = false;
		showAddButton.value = false;
	}
});
```

---

## MODIFICHE TEMPLATE HTML

### 1. Titolo Dinamico (righe 891-893)
```html
<!-- Titolo cambia in base a presenza pacchi -->
<h3 v-if="userStore.packages.length === 0" class="...">Inserisci le dimensioni e il peso del collo</h3>
<h3 v-else class="...">Aggiungi altri colli alla spedizione</h3>
```

### 2. Form Dimensioni (righe 908-975)
```html
<!-- FORM DIMENSIONI (appare per primo nel nuovo flusso) -->
<Transition name="dimension-form" appear>
	<div v-if="showDimensionForm" class="mt-[20px]">
		<div class="border-[1px] border-[rgba(0,0,0,.2)] rounded-[20px] tablet:rounded-[30px] p-[16px] tablet:p-[20px]">
			<div class="flex flex-wrap gap-[16px] tablet:gap-[20px] justify-center">
				<!-- Peso -->
				<div class="w-full tablet:w-[calc(50%-10px)] desktop:w-[200px]">
					<label for="temp_weight" class="label-preventivo-rapido">Peso (Kg)</label>
					<input type="text" id="temp_weight" v-model="tempPackageData.weight" placeholder="...Kg" class="input-preventivo-rapido" @input="messageError = null" required />
				</div>

				<!-- Lato 1 -->
				<div class="w-full tablet:w-[calc(50%-10px)] desktop:w-[200px]">
					<label for="temp_first_size" class="label-preventivo-rapido">Lato 1 (Cm)</label>
					<input type="text" id="temp_first_size" v-model="tempPackageData.first_size" placeholder="...Cm" class="input-preventivo-rapido" @input="messageError = null" required />
				</div>

				<!-- Lato 2 -->
				<div class="w-full tablet:w-[calc(50%-10px)] desktop:w-[200px]">
					<label for="temp_second_size" class="label-preventivo-rapido">Lato 2 (Cm)</label>
					<input type="text" id="temp_second_size" v-model="tempPackageData.second_size" placeholder="...Cm" class="input-preventivo-rapido" @input="messageError = null" required />
				</div>

				<!-- Lato 3 -->
				<div class="w-full tablet:w-[calc(50%-10px)] desktop:w-[200px]">
					<label for="temp_third_size" class="label-preventivo-rapido">Lato 3 (Cm)</label>
					<input type="text" id="temp_third_size" v-model="tempPackageData.third_size" placeholder="...Cm" class="input-preventivo-rapido" @input="messageError = null" required />
				</div>
			</div>

			<!-- Messaggio errore -->
			<Transition name="msg-fade">
				<p v-if="messageError?.packages" class="text-red-500 text-[0.875rem] mt-[12px] text-center">
					{{ messageError.packages[0] }}
				</p>
			</Transition>

			<!-- Bottone Continua -->
			<div class="flex justify-center mt-[20px]">
				<button type="button" @click="validateDimensionsAndShowSelector" class="bg-[#E44203] text-white font-semibold px-[32px] py-[14px] rounded-[50px] hover:bg-[#c93800] transition-colors duration-200 flex items-center gap-[8px]">
					Scegli tipo collo
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
				</button>
			</div>
		</div>
	</div>
</Transition>
```

### 3. Selettore Tipo Collo (righe 977-1026)
```html
<!-- SELETTORE TIPO COLLO (appare dopo validazione dimensioni) -->
<Transition name="selector" appear @after-leave="onSelectorAfterLeave" @after-enter="onSelectorAfterEnter">
	<div v-if="showPackageTypeSelector" class="mt-[20px]">
		<p class="text-center text-[0.875rem] text-[#737373] mb-[16px]">Seleziona il tipo di collo</p>
		<ul class="flex flex-wrap justify-center gap-[12px] tablet:gap-[16px]" :class="{ 'selector-busy-pulse': selectorBusyPulse }">
			<li v-for="(packageType, packageTypeIndex) in packageTypes" :key="packageType.text" :style="{ '--stagger-delay': `${packageTypeIndex * 80}ms` }" class="package-card ..." @click="selectPackageType(packageType, packageTypeIndex)">
				<span class="text-[1rem] tablet:text-[1.125rem] font-semibold text-[#252B42]">{{ packageType.text }}</span>
			</li>
		</ul>

		<!-- Bottone Annulla -->
		<div class="flex justify-center mt-[20px]">
			<button type="button" @click="cancelSelector" class="text-[#737373] hover:text-[#E44203] text-[0.875rem] font-medium transition-colors duration-200 flex items-center gap-[6px]">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
				Annulla
			</button>
		</div>
	</div>
</Transition>
```

### 4. Toast "Collo aggiunto!" (righe 1121-1127)
```html
<!-- TOAST "COLLO AGGIUNTO!" -->
<Transition name="toast">
	<div v-if="showAddedToast" class="fixed top-[100px] left-1/2 -translate-x-1/2 z-50 bg-[#4CAF50] text-white px-[24px] py-[12px] rounded-[12px] shadow-lg font-medium text-[0.875rem] tablet:text-[1rem]">
		✓ Collo aggiunto!
	</div>
</Transition>
```

### 5. Bottone "Aggiungi altro collo" (righe 1129-1143)
```html
<button type="button" @click="addAnotherPackage" class="...">
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
	Aggiungi altro collo
</button>
```

---

## MODIFICHE CSS

### Animazioni Form Dimensioni (righe 1387-1423)
```css
/* ========================================
   ANIMAZIONI FORM DIMENSIONI
   ======================================== */
.dimension-form-enter-active,
.dimension-form-appear-active {
	transition:
		opacity var(--pm-duration-slow) var(--pm-ease),
		transform var(--pm-duration-slow) var(--pm-ease);
}

.dimension-form-leave-active {
	transition:
		opacity var(--pm-duration-slow) var(--pm-ease),
		transform var(--pm-duration-slow) var(--pm-ease);
}

.dimension-form-enter-from,
.dimension-form-appear-from {
	opacity: 0;
	transform: translateY(20px) scale(0.98);
}

.dimension-form-enter-to,
.dimension-form-appear-to {
	opacity: 1;
	transform: translateY(0) scale(1);
}

.dimension-form-leave-from {
	opacity: 1;
	transform: translateY(0) scale(1);
}

.dimension-form-leave-to {
	opacity: 0;
	transform: translateY(-20px) scale(0.98);
}
```

---

## SEQUENZA ANIMAZIONI COMPLETA

### Primo Collo (da zero):
1. **Form dimensioni visibile** (showDimensionForm = true)
2. Utente compila peso e dimensioni
3. Click "Scegli tipo collo" → validazione
4. **Form dimensioni scompare** (translateY -20px, 1000ms)
5. **Selettore tipo appare** (translateY -20px → 0, 1000ms)
6. Utente clicca su Pacco/Pallet/Valigia
7. Card conferma (700ms)
8. **Selettore scompare** (translateY -30px, 1000ms)
9. Pausa 300ms
10. **Box dimensioni appare** (translateY 20px → 0, 1000ms)
11. **Toast "Collo aggiunto!" appare** (2000ms)
12. **Bottone "Aggiungi altro collo" appare** (850ms dopo)

### Colli Successivi:
1. Click "Aggiungi altro collo"
2. **Bottone scompare**
3. **Form dimensioni appare** (translateY 20px → 0, 1000ms)
4. Ripete sequenza da punto 2

### Annulla Selezione:
1. Click "Annulla" nel selettore tipo
2. **Selettore scompare** (translateY -30px, 1000ms)
3. **Form dimensioni riappare** (translateY 20px → 0, 1000ms)

---

## VANTAGGI NUOVO FLUSSO

1. **UX Migliorata**: Utente inserisce dati concreti prima di scegliere tipo
2. **Meno Errori**: Validazione dimensioni prima della selezione tipo
3. **Più Logico**: Prima "cosa spedisco" (dimensioni), poi "come lo chiamo" (tipo)
4. **Flessibile**: Possibilità di annullare e tornare indietro
5. **Animazioni Fluide**: Transizioni coordinate a 1000ms

---

## FILE MODIFICATO

- **File**: `nuxt-spedizionefacile-master/components/Preventivo.vue`
- **Righe totali**: 1669
- **Modifiche**: ~200 righe (JavaScript + Template + CSS)

---

## TEST CONSIGLIATI

1. **Primo collo**: Compila dimensioni → Scegli tipo → Verifica animazioni
2. **Validazione**: Prova a cliccare "Scegli tipo collo" senza compilare campi
3. **Annulla**: Compila dimensioni → Scegli tipo collo → Click Annulla
4. **Aggiungi altro**: Aggiungi primo collo → Click "Aggiungi altro collo"
5. **Reset**: Click "Azzera" → Verifica ritorno a form dimensioni
6. **Responsive**: Testa su mobile, tablet, desktop
7. **Eliminazione**: Elimina ultimo collo → Verifica ritorno a form dimensioni

---

## COMPATIBILITÀ

- ✅ Mantiene tutte le animazioni esistenti
- ✅ Compatibile con sistema timing (350ms/700ms/1000ms)
- ✅ Supporta reduced motion
- ✅ Responsive su tutti i dispositivi
- ✅ Nessuna breaking change per backend
