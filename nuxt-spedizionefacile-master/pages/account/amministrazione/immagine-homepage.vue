<!--
  FILE: pages/account/amministrazione/immagine-homepage.vue
  SCOPO: Editor visuale hero homepage con controlli stile Figma (desktop/mobile separati).
  API:
    - GET /api/admin/homepage-image
    - POST /api/admin/homepage-image
  ROUTE: /account/amministrazione/immagine-homepage
  COMPOSABLE: useAdminHeroEditor — logica completa dell'editor (preview, drag, zoom, salvataggio).
-->
<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Homepage hero admin | SpediamoFacile',
	ogTitle: 'Homepage hero admin | SpediamoFacile',
	description: 'Aggiorna immagine e contenuti hero della homepage dal pannello admin SpediamoFacile.',
	ogDescription: 'Gestione hero homepage nel pannello admin SpediamoFacile.',
});

const {
	DESKTOP_CANVAS,
	MOBILE_CANVAS,
	isLoading,
	uploading,
	selectedFile,
	previewUrl,
	draftConfig,
	activeViewport,
	desktopFrameRef,
	mobileFrameRef,
	desktopViewportRef,
	mobileViewportRef,
	frameReady,
	previewScale,
	dragState,
	activeTransform,
	hasPendingChanges,
	frameSrc,
	setActiveViewport,
	onFileSelected,
	removePreview,
	setViewportMode,
	updateViewportTransform,
	resetViewport,
	resetAllViewports,
	handleWheelZoom,
	beginDrag,
	onFrameLoad,
	saveImage,
	initEditor,
	destroyEditor,
	actionMessage,
} = useAdminHeroEditor();

const previewRef = ref(null);

onMounted(() => {
	initEditor();
	// Sync refs from preview sub-component after mount
	nextTick(() => {
		if (previewRef.value) {
			desktopFrameRef.value = previewRef.value.desktopFrameRef;
			mobileFrameRef.value = previewRef.value.mobileFrameRef;
			desktopViewportRef.value = previewRef.value.desktopViewportRef;
			mobileViewportRef.value = previewRef.value.mobileViewportRef;
		}
	});
});

onBeforeUnmount(() => {
	destroyEditor();
});
</script>

<template>
	<section class="min-h-[600px] py-[28px] desktop:py-[44px] desktop-xl:py-[58px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Admin"
				title="Editor Hero Homepage"
				description="Desktop e mobile restano separati ma dentro la stessa console. Le modifiche restano in bozza finche non premi Salva immagine."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Hero Homepage' },
				]"
				back-to="/account/amministrazione"
				back-label="Torna all'amministrazione" />

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success'
						? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
						: 'bg-amber-50 text-amber-700 border border-amber-200',
				]">
				<template v-if="actionMessage.type === 'success'">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor">
						<path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
					</svg>
				</template>
				<template v-else>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor">
						<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
					</svg>
				</template>
				{{ actionMessage.text }}
			</div>

			<!-- Loading skeleton -->
			<div v-if="isLoading" class="rounded-[12px] border border-[#E9EBEC] bg-white p-[20px] desktop:p-[28px] shadow-sm">
				<div class="h-[20px] w-[200px] rounded bg-[#EEF2F5] animate-pulse mb-[14px]"></div>
				<div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_340px] gap-[16px] desktop:gap-[20px]">
					<div class="rounded-[12px] border border-[#E9EBEC] bg-[#F7FAFC] h-[320px] animate-pulse"></div>
					<div class="rounded-[12px] border border-[#E9EBEC] bg-[#F7FAFC] h-[320px] animate-pulse"></div>
				</div>
			</div>

			<!-- Editor -->
			<template v-else>
				<div class="rounded-[12px] border border-[#E9EBEC] bg-white p-[16px] desktop:p-[20px] shadow-sm">
					<div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_340px] gap-[16px] desktop:gap-[20px]">
						<AdminHeroPreview
							ref="previewRef"
							:active-viewport="activeViewport"
							:preview-scale="previewScale"
							:drag-state="dragState"
							:DESKTOP_CANVAS="DESKTOP_CANVAS"
							:MOBILE_CANVAS="MOBILE_CANVAS"
							:frame-src="frameSrc"
							@set-viewport="setActiveViewport"
							@begin-drag="beginDrag"
							@wheel-zoom="handleWheelZoom"
							@frame-load="onFrameLoad" />

						<AdminHeroControls
							:active-viewport="activeViewport"
							:active-transform="activeTransform"
							:selected-file="selectedFile"
							:uploading="uploading"
							:has-pending-changes="hasPendingChanges"
							@file-selected="onFileSelected"
							@remove-preview="removePreview"
							@set-viewport="setActiveViewport"
							@set-mode="setViewportMode"
							@update-transform="updateViewportTransform"
							@reset-viewport="resetViewport()"
							@reset-all="resetAllViewports"
							@save="saveImage" />
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
