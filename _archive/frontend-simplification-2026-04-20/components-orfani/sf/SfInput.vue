<script setup lang="ts">
import { computed, useId } from 'vue';

type Size = 'sm' | 'md' | 'lg';

interface Props {
	modelValue?: string | number | null;
	type?: string;
	label?: string;
	placeholder?: string;
	error?: string;
	hint?: string;
	icon?: string;
	suffix?: string;
	size?: Size;
	disabled?: boolean;
	required?: boolean;
	name?: string;
	autocomplete?: string;
	id?: string;
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: '',
	type: 'text',
	label: '',
	placeholder: '',
	error: '',
	hint: '',
	icon: '',
	suffix: '',
	size: 'md',
	disabled: false,
	required: false,
	name: '',
	autocomplete: '',
	id: '',
});

const emit = defineEmits<{
	(e: 'update:modelValue', v: string | number): void;
	(e: 'blur', ev: FocusEvent): void;
	(e: 'focus', ev: FocusEvent): void;
}>();

const autoId = useId();
const inputId = computed(() => props.id || `sf-input-${autoId}`);
const hintId = computed(() => `${inputId.value}-hint`);
const errorId = computed(() => `${inputId.value}-error`);

const describedBy = computed(() => {
	const parts: string[] = [];
	if (props.hint) parts.push(hintId.value);
	if (props.error) parts.push(errorId.value);
	return parts.length ? parts.join(' ') : undefined;
});

const wrapperClasses = computed(() => [
	'sf-input',
	`sf-input--${props.size}`,
	{
		'sf-input--error': !!props.error,
		'sf-input--disabled': props.disabled,
		'sf-input--has-icon': !!props.icon,
		'sf-input--has-suffix': !!props.suffix,
	},
]);

function onInput(e: Event) {
	const target = e.target as HTMLInputElement;
	emit('update:modelValue', target.value);
}
</script>

<template>
	<div :class="wrapperClasses">
		<label v-if="label" :for="inputId" class="sf-input__label">
			{{ label }}<span v-if="required" aria-hidden="true" class="sf-input__required">*</span>
		</label>
		<div class="sf-input__field">
			<UIcon v-if="icon" :name="icon" class="sf-input__icon" aria-hidden="true" />
			<input
				:id="inputId"
				:type="type"
				:value="modelValue"
				:placeholder="placeholder"
				:disabled="disabled"
				:required="required"
				:name="name || undefined"
				:autocomplete="autocomplete || undefined"
				:aria-invalid="!!error || undefined"
				:aria-describedby="describedBy"
				class="sf-input__control"
				@input="onInput"
				@blur="$emit('blur', $event)"
				@focus="$emit('focus', $event)"
			/>
			<span v-if="suffix" class="sf-input__suffix" aria-hidden="true">{{ suffix }}</span>
		</div>
		<p v-if="hint && !error" :id="hintId" class="sf-input__hint">{{ hint }}</p>
		<p v-if="error" :id="errorId" class="sf-input__error" role="alert">{{ error }}</p>
	</div>
</template>

<style scoped>
.sf-input { display: flex; flex-direction: column; gap: var(--gap-1); width: 100%; }
.sf-input__label {
	font-family: var(--font-inter); font-weight: 600;
	font-size: var(--font-size-sm); color: var(--color-brand-text);
}
.sf-input__required { color: var(--color-brand-accent); margin-left: 2px; }
.sf-input__field {
	position: relative; display: flex; align-items: center;
	background: var(--sf-field-bg); border: 1.5px solid var(--sf-field-border);
	border-radius: var(--sf-radius-control);
	transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}
.sf-input__field:focus-within { border-color: var(--color-brand-primary); box-shadow: var(--shadow-focus); }
.sf-input--error .sf-input__field { border-color: var(--color-brand-error); }
.sf-input--error .sf-input__field:focus-within { box-shadow: var(--sf-field-error-ring); }
.sf-input--disabled .sf-input__field { background: var(--color-brand-bg-alt); cursor: not-allowed; }
.sf-input__control {
	flex: 1; min-width: 0; background: transparent; border: none; outline: none;
	font-family: var(--font-inter); font-size: var(--font-size-base);
	color: var(--color-brand-text); padding: 0 16px;
}
.sf-input__control::placeholder { color: var(--color-brand-text-muted); }
.sf-input__control:disabled { cursor: not-allowed; }
.sf-input--sm .sf-input__field { height: var(--button-height-sm); }
.sf-input--md .sf-input__field { height: var(--button-height-md); }
.sf-input--lg .sf-input__field { height: var(--button-height-lg); }
.sf-input__icon {
	width: var(--icon-small); height: var(--icon-small);
	color: var(--color-brand-text-muted); margin-left: 12px; flex-shrink: 0;
}
.sf-input--has-icon .sf-input__control { padding-left: 8px; }
.sf-input__suffix {
	color: var(--color-brand-text-muted); font-size: var(--font-size-sm);
	padding-right: 14px; flex-shrink: 0;
}
.sf-input__hint { font-size: var(--font-size-xs); color: var(--color-brand-text-muted); margin: 0; }
.sf-input__error { font-size: var(--font-size-xs); color: var(--color-brand-error); margin: 0; font-weight: 500; }
</style>
