<!-- SfAlert — Primitive alert/feedback unica sitewide.
     Rimpiazza i 4 pattern sparsi: .error, .m6-alert--err, .sf-form-error, .text-red.
     3 severità: error (rosso), warning (arancione), success (verde).
     Uso:
       <SfAlert severity="error">Errore generico</SfAlert>
       <SfAlert severity="warning" icon>Attenzione!</SfAlert>
       <SfAlert severity="success" dismissible @dismiss="...">Completato</SfAlert>
-->
<script setup>
const props = defineProps({
	severity: {
		type: String,
		default: 'error',
		validator: (v) => ['error', 'warning', 'success', 'info'].includes(v),
	},
	icon: { type: Boolean, default: true },
	dismissible: { type: Boolean, default: false },
	role: { type: String, default: 'alert' },
});

const emit = defineEmits(['dismiss']);

const toneConfig = computed(() => {
	switch (props.severity) {
		case 'success':
			return { bg: '#F0F9F4', border: 'rgba(4,120,87,0.22)', color: '#047857', iconBg: '#10B981' };
		case 'warning':
			return { bg: '#FFFBEB', border: 'rgba(180,83,9,0.22)', color: '#B45309', iconBg: '#D97706' };
		case 'info':
			return { bg: '#EEF7F8', border: 'rgba(9,88,102,0.22)', color: '#095866', iconBg: '#095866' };
		case 'error':
		default:
			return { bg: '#FEF2F2', border: 'rgba(228,66,3,0.22)', color: '#B91C1C', iconBg: '#E44203' };
	}
});
</script>

<template>
	<div
		class="sf-alert"
		:style="{ background: toneConfig.bg, borderColor: toneConfig.border, color: toneConfig.color }"
		:role="role">
		<svg
			v-if="icon"
			class="sf-alert__icon"
			:style="{ color: toneConfig.iconBg }"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			width="18"
			height="18"
			fill="currentColor"
			aria-hidden="true">
			<path
				v-if="severity === 'success'"
				d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M10,17L5,12L6.41,10.59L10,14.17L17.59,6.58L19,8L10,17Z" />
			<path
				v-else
				d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
		</svg>
		<span class="sf-alert__message"><slot /></span>
		<button
			v-if="dismissible"
			type="button"
			class="sf-alert__dismiss"
			aria-label="Chiudi avviso"
			@click="emit('dismiss')">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>
		</button>
	</div>
</template>

<style scoped>
.sf-alert {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 12px 14px;
	border-radius: 10px;
	border: 1px solid transparent;
	font-size: 0.9375rem;
	line-height: 1.4;
	font-weight: 500;
}

.sf-alert__icon {
	flex-shrink: 0;
}

.sf-alert__message {
	flex: 1;
}

.sf-alert__dismiss {
	background: transparent;
	border: none;
	color: currentColor;
	opacity: 0.65;
	cursor: pointer;
	padding: 4px;
	display: inline-flex;
	align-items: center;
	transition: opacity 150ms ease;
}

.sf-alert__dismiss:hover {
	opacity: 1;
}
</style>
