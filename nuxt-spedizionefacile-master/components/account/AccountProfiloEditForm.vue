<!--
  Form di modifica profilo: dati personali, aziendali, fatturazione, password.
  Props: modelValue, loading.
  Events: update:modelValue, submit, cancel.
-->
<script setup>
const props = defineProps({
	modelValue: { type: Object, required: true },
	loading: { type: String, default: null },
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

const updateField = (key, value) => {
	emit('update:modelValue', { ...props.modelValue, [key]: value });
};

const billingSameAsShipping = ref(false);

const inputClass = 'w-full px-[12px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] text-[0.875rem] focus:border-[#095866] focus:outline-none';
</script>

<template>
	<h1 class="text-[1.5rem] desktop:text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Modifica dati</h1>

	<div class="bg-white rounded-[18px] p-[20px] tablet:p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC] max-w-[880px] mx-auto">
		<form @submit.prevent="emit('submit')">
			<!-- Tipo account -->
			<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px]">Tipo account</h3>
			<div class="flex flex-col tablet:flex-row items-stretch gap-[12px] mb-[20px]">
				<label
					v-for="opt in [{ value: 'privato', label: 'Privato' }, { value: 'commerciante', label: 'Azienda' }]"
					:key="opt.value"
					:class="['flex-1 flex items-center justify-center gap-[6px] px-[16px] py-[12px] rounded-[50px] cursor-pointer border transition-all text-[0.9375rem] font-medium text-center', modelValue.user_type === opt.value ? 'bg-[#095866] text-white border-[#095866] shadow-sm' : 'bg-white text-[#252B42] border-[#E9EBEC] hover:border-[#095866]']">
					<input type="radio" :value="opt.value" :checked="modelValue.user_type === opt.value" @change="updateField('user_type', opt.value)" class="sr-only" />
					{{ opt.label }}
				</label>
			</div>

			<!-- Dati personali -->
			<h3 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Dati personali</h3>
			<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[16px]">
				<div>
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Nome *</label>
					<input type="text" :value="modelValue.name" @input="updateField('name', $event.target.value)" :class="inputClass" required />
				</div>
				<div>
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Cognome</label>
					<input type="text" :value="modelValue.surname" @input="updateField('surname', $event.target.value)" :class="inputClass" />
				</div>
			</div>
			<div class="mb-[16px]">
				<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Email *</label>
				<input type="email" :value="modelValue.email" @input="updateField('email', $event.target.value)" :class="inputClass" required />
			</div>
			<div class="mb-[16px]">
				<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Telefono</label>
				<input type="text" :value="modelValue.telephone_number" @input="updateField('telephone_number', $event.target.value)" :class="inputClass" />
			</div>

			<!-- Dati aziendali -->
			<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px] mt-[24px] pt-[20px] border-t border-[#F0F0F0]">Dati aziendali (opzionale)</h3>
			<p class="text-[0.8125rem] text-[#737373] mb-[14px]">Compila solo se sei un commerciante o un'azienda.</p>
			<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[12px]">
				<div>
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Ragione Sociale</label>
					<input type="text" :value="modelValue.company_name" @input="updateField('company_name', $event.target.value)" placeholder="Nome azienda" :class="inputClass" />
				</div>
				<div>
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Partita IVA</label>
					<input type="text" :value="modelValue.vat_number" @input="updateField('vat_number', $event.target.value)" placeholder="IT12345678901" :class="inputClass" />
				</div>
			</div>
			<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[12px]">
				<div>
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Codice Fiscale</label>
					<input type="text" :value="modelValue.fiscal_code" @input="updateField('fiscal_code', $event.target.value)" placeholder="RSSMRA80A01H501U" :class="inputClass" />
				</div>
				<div>
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">PEC</label>
					<input type="email" :value="modelValue.pec" @input="updateField('pec', $event.target.value)" placeholder="azienda@pec.it" :class="inputClass" />
				</div>
			</div>
			<div class="mb-[12px]">
				<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Codice SDI</label>
				<input type="text" :value="modelValue.sdi_code" @input="updateField('sdi_code', $event.target.value)" placeholder="0000000" maxlength="7" :class="inputClass" />
			</div>

			<!-- Fatturazione -->
			<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px] mt-[24px] pt-[20px] border-t border-[#F0F0F0]">Dati di fatturazione</h3>
			<label class="flex items-center gap-[8px] cursor-pointer mb-[14px]">
				<input type="checkbox" v-model="billingSameAsShipping" class="w-[18px] h-[18px] accent-[#095866] cursor-pointer" />
				<span class="text-[0.8125rem] text-[#737373]">Uguale ai dati di spedizione</span>
			</label>
			<template v-if="!billingSameAsShipping">
				<div class="mb-[12px]">
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Intestatario fatturazione</label>
					<input type="text" :value="modelValue.billing_name" @input="updateField('billing_name', $event.target.value)" placeholder="Nome o Ragione Sociale" :class="inputClass" />
				</div>
				<div class="mb-[12px]">
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Indirizzo fatturazione</label>
					<input type="text" :value="modelValue.billing_address" @input="updateField('billing_address', $event.target.value)" placeholder="Via Roma 10" :class="inputClass" />
				</div>
				<div class="grid grid-cols-1 tablet:grid-cols-3 gap-[12px] mb-[12px]">
					<div>
						<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Città</label>
						<input type="text" :value="modelValue.billing_city" @input="updateField('billing_city', $event.target.value)" placeholder="Roma" :class="inputClass" />
					</div>
					<div>
						<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">CAP</label>
						<input type="text" :value="modelValue.billing_postal_code" @input="updateField('billing_postal_code', $event.target.value)" placeholder="00100" :class="inputClass" />
					</div>
					<div>
						<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Provincia</label>
						<input type="text" :value="modelValue.billing_province" @input="updateField('billing_province', $event.target.value)" placeholder="RM" :class="inputClass" />
					</div>
				</div>
			</template>

			<!-- Password -->
			<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px] mt-[24px] pt-[20px] border-t border-[#F0F0F0]">Cambia password</h3>
			<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[24px]">
				<div>
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Nuova password</label>
					<input type="password" :value="modelValue.password" @input="updateField('password', $event.target.value)" placeholder="Lascia vuoto per mantenere" minlength="8" pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$" title="Minimo 8 caratteri, almeno una maiuscola, una minuscola e un numero" :class="inputClass" />
				</div>
				<div>
					<label class="block text-[0.8125rem] font-semibold text-[#404040] mb-[4px]">Conferma password</label>
					<input type="password" :value="modelValue.password_confirmation" @input="updateField('password_confirmation', $event.target.value)" placeholder="Conferma" minlength="8" :class="inputClass" />
				</div>
			</div>

			<!-- Bottoni -->
			<div class="flex flex-col-reverse tablet:flex-row gap-[12px]">
				<button type="button" @click.prevent="emit('cancel')" :disabled="!!loading" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] font-semibold text-[0.9375rem] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					Annulla
				</button>
				<button type="submit" :disabled="!!loading" class="flex-1 inline-flex items-center justify-center gap-[6px] py-[14px] rounded-[50px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.9375rem] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
					{{ loading ? 'Salvataggio...' : 'Salva modifiche' }}
				</button>
			</div>
		</form>
	</div>
</template>
