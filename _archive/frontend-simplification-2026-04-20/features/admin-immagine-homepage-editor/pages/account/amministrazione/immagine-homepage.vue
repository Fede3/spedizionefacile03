<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Homepage hero admin | SpediamoFacile',
	ogTitle: 'Homepage hero admin | SpediamoFacile',
	description: 'Aggiorna immagine e contenuti hero della homepage dal pannello admin SpediamoFacile.',
	ogDescription: 'Gestione hero homepage nel pannello admin SpediamoFacile.',
	robots: 'noindex, nofollow',
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
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container sf-stack-section">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Hero homepage"
				description="Allinea immagine desktop e mobile in una sola configurazione, poi salva quando la preview e corretta."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Hero Homepage' },
				]"
				back-to="/account/amministrazione"
				back-label="Torna all'amministrazione" />

			<AdminActionBanner :message="actionMessage?.text || ''" :tone="actionMessage?.type || ''" />

			<!-- Loading skeleton -->
			<div v-if="isLoading" class="sf-surface-card rounded-[16px] p-[16px] desktop:p-[20px]">
				<div class="h-[20px] w-[200px] rounded bg-[#EEF2F5] animate-pulse mb-[16px]"></div>
				<div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_340px] gap-[16px] desktop:gap-[20px]">
					<div class="rounded-[16px] border border-[var(--color-brand-border)] bg-[#F7FAFC] h-[320px] animate-pulse"></div>
					<div class="rounded-[16px] border border-[var(--color-brand-border)] bg-[#F7FAFC] h-[320px] animate-pulse"></div>
				</div>
			</div>

			<!-- Editor -->
			<template v-else>
				<div class="sf-surface-card rounded-[16px] p-[14px] desktop:p-[18px]">
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
