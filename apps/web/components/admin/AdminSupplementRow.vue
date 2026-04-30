<script setup>
const props = defineProps({
	rule: { type: Object, required: true },
	supplementAmountToEuro: { type: Function, required: true },
	updateSupplementAmountFromEuro: { type: Function, required: true },
});

const emit = defineEmits(['remove', 'update:rule']);

const ruleValue = (field) => props.rule?.[field] ?? '';
const updateRule = (field, value) => {
	emit('update:rule', {
		...props.rule,
		[field]: value,
	});
};
const updateRuleAmount = (value) => {
	const nextRule = { ...props.rule };
	props.updateSupplementAmountFromEuro(nextRule, value);
	emit('update:rule', nextRule);
};
</script>

<template>
	<div class="grid grid-cols-1 tablet:grid-cols-[120px_160px_1fr_auto_auto] gap-[8px] items-center p-[12px] rounded-[12px] border-[1.5px] border-[#DFE2E7] bg-[#FAFBFC]">
		<label class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">Prefisso CAP
			<input :value="ruleValue('prefix')" type="text" inputmode="numeric" maxlength="5" class="mt-[4px] w-full h-[36px] px-[10px] rounded-[12px] border-[1.5px] border-[#DFE2E7] bg-white text-[0.8125rem]" @input="updateRule('prefix', $event.target.value)">
		</label>
		<label class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">Importo (&euro;)
			<input :value="supplementAmountToEuro(rule)" type="text" class="mt-[4px] w-full h-[36px] px-[10px] rounded-[12px] border-[1.5px] border-[#DFE2E7] bg-white text-[0.8125rem]" @input="updateRuleAmount($event.target.value)">
		</label>
		<label class="text-[0.75rem] text-[var(--color-brand-text-secondary)]">Applica a
			<select :value="ruleValue('apply_to')" class="mt-[4px] w-full h-[36px] px-[10px] rounded-[12px] border-[1.5px] border-[#DFE2E7] bg-white text-[0.8125rem]" @change="updateRule('apply_to', $event.target.value)">
				<option value="both">Origine + Destinazione</option>
				<option value="origin">Solo origine</option>
				<option value="destination">Solo destinazione</option>
			</select>
		</label>
		<button type="button" role="switch" :aria-checked="ruleValue('enabled') ? 'true' : 'false'" aria-label="Attiva supplemento" :class="ruleValue('enabled') ? 'bg-[var(--color-brand-primary)]' : 'bg-[#C8CCD0]'" class="relative inline-flex h-[28px] w-[48px] items-center rounded-full transition-colors cursor-pointer mt-[16px]" @click="updateRule('enabled', !ruleValue('enabled'))">
			<span :class="ruleValue('enabled') ? 'translate-x-[24px]' : 'translate-x-[2px]'" class="inline-block h-[22px] w-[22px] transform rounded-full bg-white transition-transform shadow-sm" />
		</button>
		<button type="button" class="px-[10px] py-[7px] rounded-[16px] border border-red-200 text-red-600 text-[0.75rem] hover:bg-red-50 cursor-pointer mt-[16px]" @click="$emit('remove')">
			Elimina
		</button>
	</div>
</template>
