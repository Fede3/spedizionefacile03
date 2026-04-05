<!--
  Pannello controlli per l'editor hero homepage: upload, viewport, modo, zoom, offset, save.
-->
<script setup>
const props = defineProps({
	activeViewport: { type: String, default: 'desktop' },
	activeTransform: { type: Object, default: () => ({ mode: 'fill', zoom: 1, x: 0, y: 0 }) },
	selectedFile: { type: Object, default: null },
	uploading: { type: Boolean, default: false },
	hasPendingChanges: { type: Boolean, default: false },
});

const emit = defineEmits([
	'file-selected',
	'remove-preview',
	'set-viewport',
	'set-mode',
	'update-transform',
	'reset-viewport',
	'reset-all',
	'save',
]);
</script>

<template>
	<div class="sf-admin-hero-panel">
		<h2 class="sf-admin-hero-panel__title">Controlli immagine</h2>
		<p class="sf-admin-hero-panel__meta">Aggiorna il contenuto senza uscire dal brand SpedizioneFacile.</p>

		<!-- Upload -->
		<label class="sf-admin-hero-panel__upload mt-[14px] cursor-pointer">
			<p class="text-[0.875rem] font-semibold text-[#404040]">Carica nuova immagine</p>
			<p class="text-[0.75rem] text-[#617182]">JPG, PNG, WebP - max 5MB</p>
			<input type="file" accept="image/jpeg,image/png,image/webp" @change="emit('file-selected', $event)" class="hidden" />
		</label>

		<div
			v-if="selectedFile"
			class="mt-[10px] rounded-[14px] border border-[#dce5ec] bg-white px-[12px] py-[10px] text-[0.75rem] text-[#44505F] flex items-center justify-between gap-[10px]">
			<span class="truncate">{{ selectedFile.name }}</span>
			<button type="button" class="sf-admin-hero-panel__chip" @click="emit('remove-preview')">Rimuovi</button>
		</div>

		<!-- Viewport toggle -->
		<div class="mt-[14px]">
			<p class="text-[0.75rem] font-semibold text-[#5B6576] uppercase tracking-[0.6px] mb-[8px]">Viewport attiva</p>
			<div class="grid grid-cols-2 gap-[8px]">
				<button
					type="button"
					@click="emit('set-viewport', 'desktop')"
					class="h-[34px] rounded-[12px] text-[0.8125rem] font-semibold border"
					:class="activeViewport === 'desktop' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#095866] border-[#B9D4DC]'">
					Desktop
				</button>
				<button
					type="button"
					@click="emit('set-viewport', 'mobile')"
					class="h-[34px] rounded-[12px] text-[0.8125rem] font-semibold border"
					:class="activeViewport === 'mobile' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#095866] border-[#B9D4DC]'">
					Mobile
				</button>
			</div>
		</div>

		<!-- Mode -->
		<div class="mt-[14px]">
			<p class="text-[0.75rem] font-semibold text-[#5B6576] uppercase tracking-[0.6px] mb-[8px]">Modalita</p>
			<div class="grid grid-cols-3 gap-[8px]">
				<button
					v-for="mode in ['fill', 'fit', 'crop']"
					:key="mode"
					type="button"
					@click="emit('set-mode', mode)"
					class="h-[34px] rounded-[12px] text-[0.8125rem] font-semibold border capitalize"
					:class="activeTransform.mode === mode ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#095866] border-[#B9D4DC]'">
					{{ mode === 'fill' ? 'Fill' : mode === 'fit' ? 'Fit' : 'Crop' }}
				</button>
			</div>
		</div>

		<!-- Sliders -->
		<div class="mt-[14px] space-y-[12px]">
			<div>
				<div class="flex items-center justify-between mb-[4px]">
					<label class="text-[0.8125rem] font-semibold text-[#344054]">Zoom</label>
					<span class="text-[0.75rem] text-[#667085]">{{ activeTransform.zoom.toFixed(2) }}x</span>
				</div>
				<input
					:value="activeTransform.zoom"
					@input="emit('update-transform', 'zoom', $event.target.value)"
					type="range"
					min="0.5"
					max="4"
					step="0.01"
					class="w-full accent-[#095866]" />
			</div>
			<div>
				<div class="flex items-center justify-between mb-[4px]">
					<label class="text-[0.8125rem] font-semibold text-[#344054]">Offset X</label>
					<span class="text-[0.75rem] text-[#667085]">{{ Math.round(activeTransform.x) }} px</span>
				</div>
				<input
					:value="activeTransform.x"
					@input="emit('update-transform', 'x', $event.target.value)"
					type="range"
					min="-1200"
					max="1200"
					step="1"
					class="w-full accent-[#095866]" />
			</div>
			<div>
				<div class="flex items-center justify-between mb-[4px]">
					<label class="text-[0.8125rem] font-semibold text-[#344054]">Offset Y</label>
					<span class="text-[0.75rem] text-[#667085]">{{ Math.round(activeTransform.y) }} px</span>
				</div>
				<input
					:value="activeTransform.y"
					@input="emit('update-transform', 'y', $event.target.value)"
					type="range"
					min="-1200"
					max="1200"
					step="1"
					class="w-full accent-[#095866]" />
			</div>
		</div>

		<!-- Reset buttons -->
		<div class="mt-[14px] grid grid-cols-2 gap-[8px]">
			<button
				type="button"
				@click="emit('reset-viewport')"
				class="h-[36px] rounded-[12px] border border-[#B9D4DC] bg-white text-[#095866] font-semibold text-[0.8125rem] hover:bg-[#F1F8FA]">
				Reset viewport
			</button>
			<button
				type="button"
				@click="emit('reset-all')"
				class="h-[36px] rounded-[12px] border border-[#B9D4DC] bg-white text-[#095866] font-semibold text-[0.8125rem] hover:bg-[#F1F8FA]">
				Reset totale
			</button>
		</div>

		<!-- Save -->
		<button
			type="button"
			@click="emit('save')"
			:disabled="uploading || !hasPendingChanges"
			class="mt-[14px] w-full h-[44px] rounded-[999px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.875rem] disabled:opacity-45 disabled:cursor-not-allowed">
			{{ uploading ? 'Salvataggio...' : 'Salva immagine' }}
		</button>

		<p class="mt-[8px] text-[0.75rem] text-[#6B7280]">Pubblicazione: il sito pubblico si aggiorna solo dopo il salvataggio.</p>
	</div>
</template>
