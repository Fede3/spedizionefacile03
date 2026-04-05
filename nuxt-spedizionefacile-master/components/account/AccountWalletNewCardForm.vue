<!--
  FILE: components/account/AccountWalletNewCardForm.vue
  SCOPO: Form inline per aggiunta nuova carta Stripe nel wallet top-up.
  PROPS: isPreparingNewCardForm, cardHolderName, cardError, hasSavedCard.
  EVENTS: update:cardHolderName, close.
-->
<script setup>
defineProps({
  isPreparingNewCardForm: { type: Boolean, default: false },
  cardHolderName: { type: String, default: "" },
  cardError: { type: String, default: null },
  hasSavedCard: { type: Boolean, default: false },
});
defineEmits(["update:cardHolderName", "close"]);
</script>

<template>
	<div class="space-y-[12px] rounded-[12px] border border-[#E9EBEC] bg-white p-[14px]">
		<div class="flex items-start justify-between gap-[10px]">
			<div>
				<p class="text-[0.875rem] font-semibold text-[#252B42]">Nuova carta per la ricarica</p>
				<p class="mt-[4px] text-[0.8125rem] leading-[1.5] text-[#737373]">
					La useremo per questa operazione e la salveremo come carta predefinita per checkout e wallet.
				</p>
			</div>
			<button type="button" @click="$emit('close')" class="whitespace-nowrap text-[0.8125rem] font-medium text-[#095866] hover:underline">
				{{ hasSavedCard ? 'Usa carta salvata' : 'Chiudi' }}
			</button>
		</div>

		<div v-if="isPreparingNewCardForm" class="flex items-center gap-[10px] rounded-[12px] border border-[#E9EBEC] bg-[#FAFCFD] px-[14px] py-[12px] text-[0.8125rem] text-[#737373]">
			<div class="h-[20px] w-[20px] animate-spin rounded-full border-2 border-[#E9EBEC] border-t-[#095866]"></div>
			Preparazione modulo carta in corso...
		</div>

		<div v-else class="space-y-[12px]">
			<div>
				<label class="mb-[6px] block text-[0.8125rem] font-semibold text-[#404040]">Titolare carta</label>
				<input
					:value="cardHolderName"
					@input="$emit('update:cardHolderName', $event.target.value)"
					type="text"
					placeholder="Mario Rossi"
					class="w-full rounded-[12px] border border-[#E9EBEC] bg-white px-[14px] py-[12px] text-[0.9375rem] text-[#252B42] placeholder:text-[#a0a0a0] transition-colors focus:border-[#095866] focus:outline-none" />
			</div>

			<div>
				<label class="mb-[6px] block text-[0.8125rem] font-semibold text-[#404040]">Numero carta</label>
				<div id="wallet-card-number" class="stripe-field"></div>
			</div>

			<div class="grid grid-cols-1 gap-[12px] tablet:grid-cols-[minmax(0,1fr)_132px]">
				<div>
					<label class="mb-[6px] block text-[0.8125rem] font-semibold text-[#404040]">Scadenza</label>
					<div id="wallet-card-expiry" class="stripe-field"></div>
				</div>
				<div class="min-w-0 tablet:w-[132px]">
					<label class="mb-[6px] block text-[0.8125rem] font-semibold text-[#404040]">CVC</label>
					<div id="wallet-card-cvc" class="stripe-field"></div>
				</div>
			</div>

			<p v-if="cardError" class="rounded-[12px] border border-red-200 bg-red-50 p-[10px] text-[0.8125rem] text-red-500">
				{{ cardError }}
			</p>
		</div>
	</div>
</template>

<style scoped>
.stripe-field {
  width: 100%;
  border: 1px solid #e9ebec;
  border-radius: 12px;
  background-color: #ffffff;
  padding: 12px 16px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.stripe-field:focus-within {
  border-color: #095866;
  box-shadow: 0 0 0 3px rgba(9, 88, 102, 0.1);
}
</style>
