<script setup>
/**
 * AccountConfirmDialog — modal di conferma azione (delete, conferma operazione).
 *
 * Pattern uso:
 *   <AccountConfirmDialog
 *     v-model:open="confirmOpen"
 *     title="Eliminare l'indirizzo?"
 *     description="Questa operazione non puo essere annullata."
 *     confirm-label="Elimina"
 *     tone="danger"
 *     :loading="deleting"
 *     @confirm="handleDelete"
 *   />
 */
const props = defineProps({
	open: { type: Boolean, default: false },
	title: { type: String, default: 'Conferma azione' },
	description: { type: String, default: '' },
	confirmLabel: { type: String, default: 'Conferma' },
	cancelLabel: { type: String, default: 'Annulla' },
	tone: { type: String, default: 'danger' },
	loading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:open', 'confirm', 'cancel']);

const close = () => {
	emit('update:open', false);
	emit('cancel');
};

const modalDescription = computed(() => props.description || `Conferma richiesta: ${props.title}.`);

const modalUi = {
	overlay: 'bg-brand-text/40 backdrop-blur-md',
	content: '!divide-y-0 !ring-0 !p-0 !rounded-card !shadow-sf-lg !bg-brand-card w-[min(calc(100vw-1rem),30rem)]',
	body: '!p-0',
};
</script>

<template>
	<UModal
		:open="open"
		:dismissible="!loading"
		:close="false"
		:title="title"
		:description="modalDescription"
		:ui="modalUi"
		@update:open="$emit('update:open', $event)"
	>
		<template #body>
			<section role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
				<div class="flex items-start gap-4 p-6">
					<div
						aria-hidden="true"
						:class="[
							'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
							tone === 'primary'
								? 'bg-brand-primary/10 text-brand-primary'
								: 'bg-brand-error/10 text-brand-error',
						]"
					>
						<svg v-if="tone === 'primary'" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor">
							<path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M12 20C7.59 20 4 16.41 4 12S7.59 4 12 4 20 7.59 20 12 16.41 20 12 20M16.59 7.58L10 14.17L7.41 11.59L6 13L10 17L18 9L16.59 7.58Z" />
						</svg>
						<svg v-else aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor">
							<path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" />
						</svg>
					</div>
					<div class="flex-1 min-w-0">
						<h3 id="confirm-dialog-title" class="font-display text-lg font-semibold text-brand-text mb-1">
							{{ title }}
						</h3>
						<p v-if="description" class="text-sm text-brand-text-secondary leading-relaxed">
							{{ description }}
						</p>
					</div>
				</div>

				<div class="border-t border-brand-border" />

				<div class="flex items-center justify-end gap-2 px-6 py-4 bg-brand-bg-alt">
					<SfButton
						variant="secondary"
						size="sm"
						:disabled="loading"
						@click="close"
					>
						<template #leading>
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
								<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
							</svg>
						</template>
						{{ cancelLabel }}
					</SfButton>
					<SfButton
						:variant="tone === 'primary' ? 'primary' : 'danger'"
						size="sm"
						:loading="loading"
						loading-text="Operazione in corso..."
						@click="$emit('confirm')"
					>
						<template #leading>
							<svg v-if="tone === 'primary'" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
								<path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
							</svg>
							<svg v-else aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
								<path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" />
							</svg>
						</template>
						{{ confirmLabel }}
					</SfButton>
				</div>
			</section>
		</template>
	</UModal>
</template>
