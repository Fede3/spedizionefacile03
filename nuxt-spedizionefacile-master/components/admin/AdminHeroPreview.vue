<!--
  Anteprima iframe per desktop e mobile nel hero editor.
-->
<script setup>
const props = defineProps({
	activeViewport: { type: String, default: 'desktop' },
	desktopFrameRef: { type: Object, default: null },
	mobileFrameRef: { type: Object, default: null },
	desktopViewportRef: { type: Object, default: null },
	mobileViewportRef: { type: Object, default: null },
	previewScale: { type: Object, default: () => ({ desktop: 1, mobile: 1 }) },
	dragState: { type: Object, default: () => ({ active: false, viewport: 'desktop' }) },
	DESKTOP_CANVAS: { type: Object, required: true },
	MOBILE_CANVAS: { type: Object, required: true },
	frameSrc: { type: Function, required: true },
});

const emit = defineEmits([
	'set-viewport',
	'begin-drag',
	'wheel-zoom',
	'frame-load',
	'update:desktopFrameRef',
	'update:mobileFrameRef',
	'update:desktopViewportRef',
	'update:mobileViewportRef',
]);

const localDesktopFrame = ref(null);
const localMobileFrame = ref(null);
const localDesktopViewport = ref(null);
const localMobileViewport = ref(null);

// Expose refs to parent
defineExpose({
	desktopFrameRef: localDesktopFrame,
	mobileFrameRef: localMobileFrame,
	desktopViewportRef: localDesktopViewport,
	mobileViewportRef: localMobileViewport,
});
</script>

<template>
	<div class="sf-admin-hero-preview">
		<div class="flex items-center justify-between mb-[10px]">
			<h2 class="sf-admin-hero-preview__title">Anteprima reale homepage</h2>
			<span class="sf-admin-hero-preview__subtitle">drag + wheel zoom</span>
		</div>

		<div class="space-y-[12px]">
			<!-- Desktop preview -->
			<div class="sf-admin-hero-preview__frame p-[8px]">
				<div class="flex items-center justify-between mb-[8px]">
					<p class="text-[0.75rem] font-semibold text-[var(--color-brand-text)] uppercase tracking-[0.6px]">Desktop</p>
					<button
						type="button"
						@click="emit('set-viewport', 'desktop')"
						class="sf-admin-hero-preview__button"
						:class="activeViewport === 'desktop' ? 'bg-[var(--color-brand-primary)] text-white border-[var(--color-brand-primary)]' : ''">
						Modifica
					</button>
				</div>
				<div
					ref="localDesktopViewport"
					class="relative overflow-hidden rounded-[14px] border border-[#D3DEE6] aspect-[1440/700] bg-[#EEF3F7]">
					<iframe
						ref="localDesktopFrame"
						title="Anteprima desktop hero"
						:src="frameSrc('desktop')"
						scrolling="no"
						class="absolute left-0 top-0 origin-top-left bg-transparent border-0"
						:style="{
							left: '-1px',
							top: '-1px',
							width: `${DESKTOP_CANVAS.width + 2}px`,
							height: `${DESKTOP_CANVAS.height + 2}px`,
							transform: `scale(${previewScale.desktop})`,
						}"
						@load="emit('frame-load', 'desktop')" />
					<div
						class="absolute inset-0 z-[5]"
						:class="
							activeViewport === 'desktop'
								? dragState.active && dragState.viewport === 'desktop'
									? 'cursor-grabbing ring-2 ring-inset ring-[#0b6d7d]/40'
									: 'cursor-grab ring-2 ring-inset ring-[#0b6d7d]/40'
								: 'cursor-pointer'
						"
						@pointerdown="emit('begin-drag', 'desktop', $event)"
						@wheel="emit('wheel-zoom', 'desktop', $event)"
						@click="emit('set-viewport', 'desktop')" />
				</div>
			</div>

			<!-- Mobile preview -->
			<div class="sf-admin-hero-preview__frame p-[8px] w-full max-w-[980px]">
				<div class="flex items-center justify-between mb-[8px]">
					<p class="text-[0.75rem] font-semibold text-[var(--color-brand-text)] uppercase tracking-[0.6px]">Mobile</p>
					<button
						type="button"
						@click="emit('set-viewport', 'mobile')"
						class="sf-admin-hero-preview__button"
						:class="activeViewport === 'mobile' ? 'bg-[var(--color-brand-primary)] text-white border-[var(--color-brand-primary)]' : ''">
						Modifica
					</button>
				</div>
				<div
					ref="localMobileViewport"
					class="relative overflow-hidden rounded-[14px] border border-[#D3DEE6] aspect-[390/220] bg-[#EEF3F7]">
					<iframe
						ref="localMobileFrame"
						title="Anteprima mobile hero"
						:src="frameSrc('mobile')"
						scrolling="no"
						class="absolute left-0 top-0 origin-top-left bg-transparent border-0"
						:style="{
							left: '-1px',
							top: '-1px',
							width: `${MOBILE_CANVAS.width + 2}px`,
							height: `${MOBILE_CANVAS.height + 2}px`,
							transform: `scale(${previewScale.mobile})`,
						}"
						@load="emit('frame-load', 'mobile')" />
					<div
						class="absolute inset-0 z-[5]"
						:class="
							activeViewport === 'mobile'
								? dragState.active && dragState.viewport === 'mobile'
									? 'cursor-grabbing ring-2 ring-inset ring-[#0b6d7d]/40'
									: 'cursor-grab ring-2 ring-inset ring-[#0b6d7d]/40'
								: 'cursor-pointer'
						"
						@pointerdown="emit('begin-drag', 'mobile', $event)"
						@wheel="emit('wheel-zoom', 'mobile', $event)"
						@click="emit('set-viewport', 'mobile')" />
				</div>
			</div>
		</div>
	</div>
</template>
