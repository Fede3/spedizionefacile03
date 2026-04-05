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

const inputClass = 'form-input';
</script>

<template>
	<div class="sf-section-block max-w-[880px] mx-auto">
		<div class="sf-section-block__body">
			<form @submit.prevent="emit('submit')">
				<!-- Tipo account -->
				<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px]">Tipo account</h3>
				<div class="flex flex-col tablet:flex-row items-stretch gap-[12px] mb-[20px]">
					<label
						v-for="opt in [
							{ value: 'privato', label: 'Privato' },
							{ value: 'commerciante', label: 'Azienda' },
						]"
						:key="opt.value"
						:class="[
							'flex min-h-[46px] flex-1 items-center justify-center gap-[6px] rounded-[14px] border px-[16px] py-[12px] text-center text-[0.9375rem] font-semibold transition-all cursor-pointer',
							modelValue.user_type === opt.value
								? 'border-[#095866] bg-[#095866] text-white shadow-sm'
								: 'border-[#D8E3E7] bg-white text-[#252B42] hover:border-[#095866] hover:bg-[#F8FCFD]',
						]">
						<input
							type="radio"
							:value="opt.value"
							:checked="modelValue.user_type === opt.value"
							@change="updateField('user_type', opt.value)"
							class="sr-only" />
						{{ opt.label }}
					</label>
				</div>

				<!-- Dati personali -->
				<h3 class="text-[1rem] font-bold text-[#252B42] mb-[16px]">Dati personali</h3>
				<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[16px]">
					<div>
						<label class="form-label">Nome *</label>
						<input type="text" :value="modelValue.name" @input="updateField('name', $event.target.value)" :class="inputClass" required />
					</div>
					<div>
						<label class="form-label">Cognome</label>
						<input type="text" :value="modelValue.surname" @input="updateField('surname', $event.target.value)" :class="inputClass" />
					</div>
				</div>
				<div class="mb-[16px]">
					<label class="form-label">Email *</label>
					<input type="email" :value="modelValue.email" @input="updateField('email', $event.target.value)" :class="inputClass" required />
				</div>
				<div class="mb-[16px]">
					<label class="form-label">Telefono</label>
					<input
						type="text"
						:value="modelValue.telephone_number"
						@input="updateField('telephone_number', $event.target.value)"
						:class="inputClass" />
				</div>

				<!-- Dati aziendali -->
				<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px] mt-[24px] pt-[20px] border-t border-[#F0F0F0]">
					Dati aziendali (opzionale)
				</h3>
				<p class="text-[0.8125rem] text-[#737373] mb-[14px]">Compila solo se sei un commerciante o un'azienda.</p>
				<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[12px]">
					<div>
						<label class="form-label">Ragione Sociale</label>
						<input
							type="text"
							:value="modelValue.company_name"
							@input="updateField('company_name', $event.target.value)"
							placeholder="Nome azienda"
							:class="inputClass" />
					</div>
					<div>
						<label class="form-label">Partita IVA</label>
						<input
							type="text"
							:value="modelValue.vat_number"
							@input="updateField('vat_number', $event.target.value)"
							placeholder="IT12345678901"
							:class="inputClass" />
					</div>
				</div>
				<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[12px]">
					<div>
						<label class="form-label">Codice Fiscale</label>
						<input
							type="text"
							:value="modelValue.fiscal_code"
							@input="updateField('fiscal_code', $event.target.value)"
							placeholder="RSSMRA80A01H501U"
							:class="inputClass" />
					</div>
					<div>
						<label class="form-label">PEC</label>
						<input
							type="email"
							:value="modelValue.pec"
							@input="updateField('pec', $event.target.value)"
							placeholder="azienda@pec.it"
							:class="inputClass" />
					</div>
				</div>
				<div class="mb-[12px]">
					<label class="form-label">Codice SDI</label>
					<input
						type="text"
						:value="modelValue.sdi_code"
						@input="updateField('sdi_code', $event.target.value)"
						placeholder="0000000"
						maxlength="7"
						:class="inputClass" />
				</div>

				<!-- Fatturazione -->
				<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px] mt-[24px] pt-[20px] border-t border-[#F0F0F0]">Dati di fatturazione</h3>
				<label class="flex items-center gap-[8px] cursor-pointer mb-[14px]">
					<input type="checkbox" v-model="billingSameAsShipping" class="w-[18px] h-[18px] accent-[#095866] cursor-pointer" />
					<span class="text-[0.8125rem] text-[#737373]">Uguale ai dati di spedizione</span>
				</label>
				<template v-if="!billingSameAsShipping">
					<div class="mb-[12px]">
						<label class="form-label">Intestatario fatturazione</label>
						<input
							type="text"
							:value="modelValue.billing_name"
							@input="updateField('billing_name', $event.target.value)"
							placeholder="Nome o Ragione Sociale"
							:class="inputClass" />
					</div>
					<div class="mb-[12px]">
						<label class="form-label">Indirizzo fatturazione</label>
						<input
							type="text"
							:value="modelValue.billing_address"
							@input="updateField('billing_address', $event.target.value)"
							placeholder="Via Roma 10"
							:class="inputClass" />
					</div>
					<div class="grid grid-cols-1 tablet:grid-cols-3 gap-[12px] mb-[12px]">
						<div>
							<label class="form-label">Città</label>
							<input
								type="text"
								:value="modelValue.billing_city"
								@input="updateField('billing_city', $event.target.value)"
								placeholder="Roma"
								:class="inputClass" />
						</div>
						<div>
							<label class="form-label">CAP</label>
							<input
								type="text"
								:value="modelValue.billing_postal_code"
								@input="updateField('billing_postal_code', $event.target.value)"
								placeholder="00100"
								:class="inputClass" />
						</div>
						<div>
							<label class="form-label">Provincia</label>
							<input
								type="text"
								:value="modelValue.billing_province"
								@input="updateField('billing_province', $event.target.value)"
								placeholder="RM"
								:class="inputClass" />
						</div>
					</div>
				</template>

				<!-- Password -->
				<h3 class="text-[1rem] font-bold text-[#252B42] mb-[12px] mt-[24px] pt-[20px] border-t border-[#F0F0F0]">Cambia password</h3>
				<div class="grid grid-cols-1 tablet:grid-cols-2 gap-[12px] mb-[24px]">
					<div>
						<label class="form-label">Nuova password</label>
						<input
							type="password"
							:value="modelValue.password"
							@input="updateField('password', $event.target.value)"
							placeholder="Lascia vuoto per mantenere"
							minlength="8"
							pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
							title="Minimo 8 caratteri, almeno una maiuscola, una minuscola e un numero"
							:class="inputClass" />
					</div>
					<div>
						<label class="form-label">Conferma password</label>
						<input
							type="password"
							:value="modelValue.password_confirmation"
							@input="updateField('password_confirmation', $event.target.value)"
							placeholder="Conferma"
							minlength="8"
							:class="inputClass" />
					</div>
				</div>

				<!-- Bottoni -->
				<div class="flex flex-col-reverse tablet:flex-row gap-[12px]">
					<button
						type="button"
						@click.prevent="emit('cancel')"
						:disabled="!!loading"
						class="btn-secondary btn-compact flex-1 inline-flex items-center justify-center gap-[6px] disabled:opacity-60 disabled:cursor-not-allowed">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
						Annulla
					</button>
					<button
						type="submit"
						:disabled="!!loading"
						class="btn-cta btn-compact flex-1 inline-flex items-center justify-center gap-[6px] disabled:opacity-60 disabled:cursor-not-allowed">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2">
							<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
							<polyline points="17 21 17 13 7 13 7 21" />
							<polyline points="7 3 7 8 15 8" />
						</svg>
						{{ loading ? 'Salvataggio...' : 'Salva modifiche' }}
					</button>
				</div>
			</form>
		</div>
	</div>
</template>
