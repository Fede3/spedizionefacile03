<script setup>
defineProps({
	email: { type: String, required: true },
	verificationCode: { type: Array, required: true },
	verificationCodeHint: { type: String, default: null },
	verificationError: { type: String, default: '' },
	verificationSuccess: { type: String, default: '' },
	verificationLoading: { type: Boolean, default: false },
})

const emit = defineEmits([
	'input',
	'keydown',
	'paste',
	'verify',
	'resend',
	'back',
])
</script>

<template>
	<div class="bg-white p-[16px] tablet:p-[28px] rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#E9EBEC] text-[#252B42] mt-[24px]">
		<div class="text-center mb-[20px]">
			<div class="w-[56px] h-[56px] mx-auto mb-[16px] bg-[#095866]/10 rounded-full flex items-center justify-center">
				<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#095866" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
			</div>
			<h3 class="text-[1.125rem] font-semibold text-[#252B42]">Verifica il tuo account</h3>
			<p class="text-[0.875rem] text-[#737373] mt-[8px]">Inserisci il codice di verifica a 6 cifre per verificare l'account <strong>{{ email }}</strong></p>
			<div v-if="verificationCodeHint" class="mt-[12px] bg-blue-50 border border-blue-200 rounded-[12px] p-[12px] text-center">
				<p class="text-[0.8125rem] text-blue-700 mb-[4px]">Il tuo codice di verifica:</p>
				<p class="text-[1.5rem] font-bold text-blue-800 tracking-[8px]">{{ verificationCodeHint }}</p>
			</div>
		</div>
		<div class="flex justify-center gap-[6px] tablet:gap-[8px] mb-[20px]" @paste="emit('paste', $event)">
			<input
				v-for="(digit, index) in verificationCode"
				:key="index"
				type="text"
				maxlength="1"
				inputmode="numeric"
				:value="verificationCode[index]"
				@input="emit('input', index, $event)"
				@keydown="emit('keydown', index, $event)"
				class="w-[40px] h-[48px] tablet:w-[48px] tablet:h-[56px] text-center text-[1.125rem] tablet:text-[1.25rem] font-bold bg-[#F8F9FB] border border-[#E9EBEC] rounded-[12px] focus:border-[#095866] focus:outline-none transition-colors focus:shadow-[0_0_0_3px_rgba(9,88,102,0.1)]"
			/>
		</div>
		<p v-if="verificationError" class="text-red-500 text-[0.8125rem] mb-[12px] bg-red-50 p-[10px] rounded-[6px] text-center">{{ verificationError }}</p>
		<p v-if="verificationSuccess" class="text-emerald-600 text-[0.8125rem] mb-[12px] bg-emerald-50 p-[10px] rounded-[6px] text-center">{{ verificationSuccess }}</p>
		<button
			type="button"
			@click="emit('verify')"
			:disabled="verificationLoading"
			:class="['w-full py-[14px] rounded-[50px] text-white font-semibold text-[1rem] transition-[background-color,transform]', verificationLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#095866] hover:bg-[#074a56] cursor-pointer']">
			<span v-if="verificationLoading">Verifica in corso...</span>
			<span v-else>Verifica Account</span>
		</button>
		<div class="flex items-center justify-between mt-[16px]">
			<button type="button" @click="emit('resend')" :disabled="verificationLoading" class="text-[0.8125rem] text-[#095866] font-semibold hover:underline cursor-pointer disabled:opacity-60">Invia nuovo codice</button>
			<button type="button" @click="emit('back')" class="text-[0.8125rem] text-[#737373] hover:underline cursor-pointer">Torna al login</button>
		</div>
	</div>
</template>
