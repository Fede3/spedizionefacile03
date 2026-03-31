<!--
  FILE: pages/account/amministrazione/immagine-homepage.vue
  SCOPO: Editor visuale hero homepage con controlli stile Figma (desktop/mobile separati).
  API:
    - GET /api/admin/homepage-image
    - POST /api/admin/homepage-image
  ROUTE: /account/amministrazione/immagine-homepage
-->
<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

const sanctum = useSanctumClient();
const { actionMessage, showSuccess, showError } = useAdmin();

const DEFAULT_HERO_IMAGE = '/img/homepage/hero-truck-landscape.jpg';
const PREVIEW_ROUTE = '/preview/home-hero';
const PREVIEW_DRAFT_STORAGE_KEY = 'hero-preview-live-draft';
const DESKTOP_CANVAS = Object.freeze({ width: 1440, height: 700 });
const MOBILE_CANVAS = Object.freeze({ width: 390, height: 220 });

const createViewportDefaults = () => ({
	mode: 'fill',
	zoom: 1,
	x: 0,
	y: 0,
});

const createDefaultConfig = (imageUrl = null) => ({
	image_url: imageUrl || null,
	desktop: createViewportDefaults(),
	mobile: createViewportDefaults(),
	updated_at: null,
});

const cloneConfig = (config) => JSON.parse(JSON.stringify(config));

const clamp = (value, min, max) => {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return min;
	return Math.min(max, Math.max(min, numeric));
};

const normalizeViewport = (viewport, fallback = createViewportDefaults()) => {
	const allowedModes = ['fill', 'fit', 'crop'];
	const normalizedMode = allowedModes.includes(viewport?.mode) ? viewport.mode : fallback.mode;
	const minZoom = 0.5;
	return {
		mode: normalizedMode,
		zoom: clamp(viewport?.zoom ?? fallback.zoom ?? 1, minZoom, 4),
		x: clamp(viewport?.x ?? fallback.x ?? 0, -1200, 1200),
		y: clamp(viewport?.y ?? fallback.y ?? 0, -1200, 1200),
	};
};

const normalizeConfigResponse = (payload) => {
	const source = payload?.config && typeof payload.config === 'object' ? payload.config : payload;
	const imageUrl =
		typeof source?.image_url === 'string' && source.image_url.trim().length > 0
			? source.image_url
			: null;

	return {
		image_url: imageUrl,
		desktop: normalizeViewport(source?.desktop, createViewportDefaults()),
		mobile: normalizeViewport(source?.mobile, createViewportDefaults()),
		updated_at: source?.updated_at || null,
	};
};

const isLoading = ref(true);
const uploading = ref(false);

const selectedFile = ref(null);
const previewUrl = ref(null);

const currentConfig = ref(createDefaultConfig(null));
const draftConfig = ref(createDefaultConfig(null));

const activeViewport = ref('desktop');
const desktopFrameRef = ref(null);
const mobileFrameRef = ref(null);
const desktopViewportRef = ref(null);
const mobileViewportRef = ref(null);
const frameReady = reactive({ desktop: false, mobile: false });
const previewScale = reactive({ desktop: 1, mobile: 1 });
const frameRuntimeNonce = Date.now().toString();

const dragState = reactive({
	active: false,
	viewport: 'desktop',
	startX: 0,
	startY: 0,
	originX: 0,
	originY: 0,
});

let previewSyncTimer = null;
let previewResizeObserver = null;

const livePreviewSource = computed(() => {
	if (previewUrl.value) return previewUrl.value;
	if (draftConfig.value.image_url) return draftConfig.value.image_url;
	return DEFAULT_HERO_IMAGE;
});

const activeTransform = computed(() => {
	return draftConfig.value[activeViewport.value] || createViewportDefaults();
});

const hasTransformChanges = computed(() => {
	const desktopCurrent = JSON.stringify(currentConfig.value.desktop);
	const desktopDraft = JSON.stringify(draftConfig.value.desktop);
	const mobileCurrent = JSON.stringify(currentConfig.value.mobile);
	const mobileDraft = JSON.stringify(draftConfig.value.mobile);
	return desktopCurrent !== desktopDraft || mobileCurrent !== mobileDraft;
});

const hasPendingChanges = computed(() => Boolean(selectedFile.value) || hasTransformChanges.value);

const frameSrc = (viewport) => `${PREVIEW_ROUTE}?viewport=${viewport}&editor_nonce=${frameRuntimeNonce}`;

const setActiveViewport = (viewport) => {
	activeViewport.value = viewport;
};

const computePreviewScale = (viewport) => {
	const target = viewport === 'mobile' ? mobileViewportRef.value : desktopViewportRef.value;
	const canvas = viewport === 'mobile' ? MOBILE_CANVAS : DESKTOP_CANVAS;

	if (!target) return 1;
	const rect = target.getBoundingClientRect();
	if (!rect.width || !rect.height) return 1;

	const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
	return clamp(scale, 0.05, 4);
};

const updatePreviewScales = () => {
	previewScale.desktop = computePreviewScale('desktop');
	previewScale.mobile = computePreviewScale('mobile');
};

const schedulePreviewSync = () => {
	if (typeof window === 'undefined') return;
	if (previewSyncTimer) {
		window.cancelAnimationFrame(previewSyncTimer);
	}
	previewSyncTimer = window.requestAnimationFrame(() => {
		previewSyncTimer = null;
		pushPreviewState();
	});
};

const pushPreviewState = () => {
	if (typeof window === 'undefined') return;

	const payload = {
		image_url: livePreviewSource.value,
		desktop: draftConfig.value.desktop,
		mobile: draftConfig.value.mobile,
	};

	try {
		window.localStorage.setItem(
			PREVIEW_DRAFT_STORAGE_KEY,
			JSON.stringify({
				ts: Date.now(),
				payload,
			})
		);
	} catch {
		// Ignore storage errors and keep direct transport channels.
	}

	const desktopWindow = desktopFrameRef.value?.contentWindow;
	if (desktopWindow) {
		desktopWindow.postMessage({
			type: 'hero-preview:update',
			payload,
		}, window.location.origin);
		desktopWindow.__applyHeroPreviewPayload?.(payload);
	}

	const mobileWindow = mobileFrameRef.value?.contentWindow;
	if (mobileWindow) {
		mobileWindow.postMessage({
			type: 'hero-preview:update',
			payload,
		}, window.location.origin);
		mobileWindow.__applyHeroPreviewPayload?.(payload);
	}
};

const fetchCurrentImage = async () => {
	isLoading.value = true;
	try {
		const res = await sanctum('/api/admin/homepage-image');
		const normalized = normalizeConfigResponse(res);
		currentConfig.value = normalized;
		draftConfig.value = cloneConfig(normalized);
	} catch (error) {
		const fallback = createDefaultConfig(null);
		currentConfig.value = fallback;
		draftConfig.value = cloneConfig(fallback);
		showError(error, 'Impossibile caricare la configurazione hero.');
	} finally {
		isLoading.value = false;
		nextTick(() => {
			schedulePreviewSync();
		});
	}
};

const onFileSelected = (event) => {
	const file = event.target.files?.[0];
	if (!file) return;

	selectedFile.value = file;

	if (previewUrl.value) {
		URL.revokeObjectURL(previewUrl.value);
	}
	previewUrl.value = URL.createObjectURL(file);
	schedulePreviewSync();
};

const removePreview = () => {
	selectedFile.value = null;
	if (previewUrl.value) {
		URL.revokeObjectURL(previewUrl.value);
		previewUrl.value = null;
	}
	schedulePreviewSync();
};

const setViewportMode = (mode) => {
	if (!['fill', 'fit', 'crop'].includes(mode)) return;
	draftConfig.value[activeViewport.value].mode = mode;
	schedulePreviewSync();
};

const updateViewportTransform = (field, rawValue) => {
	const viewport = activeViewport.value;
	if (!['zoom', 'x', 'y'].includes(field)) return;
	const numericValue = Number(rawValue);

	if (field === 'zoom') {
		const minZoom = 0.5;
		draftConfig.value[viewport].zoom = clamp(numericValue, minZoom, 4);
	} else {
		draftConfig.value[viewport][field] = clamp(numericValue, -1200, 1200);
	}

	schedulePreviewSync();
};

const resetViewport = (viewport = activeViewport.value) => {
	draftConfig.value[viewport] = createViewportDefaults();
	schedulePreviewSync();
};

const resetAllViewports = () => {
	draftConfig.value.desktop = createViewportDefaults();
	draftConfig.value.mobile = createViewportDefaults();
	schedulePreviewSync();
};

const handleWheelZoom = (viewport, event) => {
	const shouldZoom = event.ctrlKey || event.metaKey || event.altKey;
	if (!shouldZoom) return;
	event.preventDefault();
	setActiveViewport(viewport);
	const currentZoom = draftConfig.value[viewport].zoom;
	const delta = event.deltaY > 0 ? -0.08 : 0.08;
	draftConfig.value[viewport].zoom = clamp(currentZoom + delta, 0.5, 4);
	schedulePreviewSync();
};

const onDragMove = (event) => {
	if (!dragState.active) return;
	const dx = event.clientX - dragState.startX;
	const dy = event.clientY - dragState.startY;
	const viewport = dragState.viewport;
	const scale = viewport === 'mobile' ? previewScale.mobile || 1 : previewScale.desktop || 1;

	draftConfig.value[viewport].x = clamp(dragState.originX + (dx / scale), -1200, 1200);
	draftConfig.value[viewport].y = clamp(dragState.originY + (dy / scale), -1200, 1200);
	schedulePreviewSync();
};

const stopDrag = () => {
	dragState.active = false;
	window.removeEventListener('pointermove', onDragMove);
	window.removeEventListener('pointerup', stopDrag);
};

const beginDrag = (viewport, event) => {
	if (event.button !== 0) return;
	event.preventDefault();
	setActiveViewport(viewport);
	dragState.active = true;
	dragState.viewport = viewport;
	dragState.startX = event.clientX;
	dragState.startY = event.clientY;
	dragState.originX = draftConfig.value[viewport].x;
	dragState.originY = draftConfig.value[viewport].y;

	window.addEventListener('pointermove', onDragMove);
	window.addEventListener('pointerup', stopDrag);
};

const onFrameLoad = (viewport) => {
	frameReady[viewport] = true;
	updatePreviewScales();
	pushPreviewState();
};

const onFrameMessage = (event) => {
	if (event.origin !== window.location.origin) return;
	if (!event.data || event.data.type !== 'hero-preview:ready') return;

	const viewport = event.data.viewport === 'mobile' ? 'mobile' : 'desktop';
	frameReady[viewport] = true;
	pushPreviewState();
};

const saveImage = async () => {
	if (!hasPendingChanges.value) {
		showSuccess('Nessuna modifica da salvare.');
		return;
	}

	uploading.value = true;
	try {
		const formData = new FormData();
		if (selectedFile.value) {
			formData.append('image', selectedFile.value);
		}

		formData.append(
			'config',
			JSON.stringify({
				desktop: draftConfig.value.desktop,
				mobile: draftConfig.value.mobile,
			})
		);

		const res = await sanctum('/api/admin/homepage-image', {
			method: 'POST',
			body: formData,
		});

		const normalized = normalizeConfigResponse(res);
		currentConfig.value = normalized;
		draftConfig.value = cloneConfig(normalized);

		if (previewUrl.value) {
			URL.revokeObjectURL(previewUrl.value);
			previewUrl.value = null;
		}
		selectedFile.value = null;

		const updatedAt = Date.now().toString();
		if (typeof window !== 'undefined') {
			localStorage.setItem('homepage-image-updated-at', updatedAt);
			window.dispatchEvent(new CustomEvent('homepage-image-updated', { detail: { updatedAt } }));
		}

		showSuccess('Immagine e assetto hero salvati con successo.');
		schedulePreviewSync();
	} catch (error) {
		showError(error, 'Errore durante il salvataggio della hero homepage.');
	} finally {
		uploading.value = false;
	}
};

watch(
	() => [
		livePreviewSource.value,
		draftConfig.value.desktop.mode,
		draftConfig.value.desktop.zoom,
		draftConfig.value.desktop.x,
		draftConfig.value.desktop.y,
		draftConfig.value.mobile.mode,
		draftConfig.value.mobile.zoom,
		draftConfig.value.mobile.x,
		draftConfig.value.mobile.y,
	],
	() => {
		schedulePreviewSync();
	}
);

onMounted(() => {
	fetchCurrentImage();
	window.addEventListener('message', onFrameMessage);
	window.addEventListener('resize', updatePreviewScales);
	nextTick(() => {
		updatePreviewScales();
		if (typeof ResizeObserver !== 'undefined') {
			previewResizeObserver = new ResizeObserver(() => {
				updatePreviewScales();
			});
			if (desktopViewportRef.value) previewResizeObserver.observe(desktopViewportRef.value);
			if (mobileViewportRef.value) previewResizeObserver.observe(mobileViewportRef.value);
		}
	});
});

onBeforeUnmount(() => {
	stopDrag();
	window.removeEventListener('message', onFrameMessage);
	window.removeEventListener('resize', updatePreviewScales);
	if (previewResizeObserver) {
		previewResizeObserver.disconnect();
		previewResizeObserver = null;
	}

	if (previewSyncTimer) {
		window.cancelAnimationFrame(previewSyncTimer);
		previewSyncTimer = null;
	}

	if (previewUrl.value) {
		URL.revokeObjectURL(previewUrl.value);
	}
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

			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200',
				]">
				<template v-if="actionMessage.type === 'success'"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg></template>
				<template v-else><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg></template>
				{{ actionMessage.text }}
			</div>

			<div v-if="isLoading" class="rounded-[20px] border border-[#E9EBEC] bg-white p-[20px] desktop:p-[28px] shadow-sm">
				<div class="h-[20px] w-[200px] rounded bg-[#EEF2F5] animate-pulse mb-[14px]"></div>
				<div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_340px] gap-[16px] desktop:gap-[20px]">
					<div class="rounded-[14px] border border-[#E9EBEC] bg-[#F7FAFC] h-[320px] animate-pulse"></div>
					<div class="rounded-[14px] border border-[#E9EBEC] bg-[#F7FAFC] h-[320px] animate-pulse"></div>
				</div>
			</div>

			<template v-else>
				<div class="rounded-[20px] border border-[#E9EBEC] bg-white p-[16px] desktop:p-[20px] shadow-sm">
					<div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_340px] gap-[16px] desktop:gap-[20px]">
						<div class="rounded-[14px] border border-[#E9EBEC] bg-[#F8FBFD] p-[12px] desktop:p-[14px]">
							<div class="flex items-center justify-between mb-[10px]">
								<h2 class="text-[1rem] font-bold text-[#252B42]">Anteprima reale homepage</h2>
								<span class="text-[0.75rem] text-[#6B7280]">drag + wheel zoom</span>
							</div>

							<div class="space-y-[12px]">
								<div class="rounded-[12px] border border-[#DCE5EC] bg-white p-[8px]">
									<div class="flex items-center justify-between mb-[8px]">
										<p class="text-[0.75rem] font-semibold text-[#252B42] uppercase tracking-[0.6px]">Desktop</p>
										<button
											type="button"
											@click="setActiveViewport('desktop')"
											class="text-[0.75rem] font-semibold px-[10px] py-[4px] rounded-[999px] border"
											:class="activeViewport === 'desktop' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#095866] border-[#B9D4DC]'">
												Modifica
										</button>
									</div>

									<div ref="desktopViewportRef" class="relative overflow-hidden rounded-[10px] border border-[#D3DEE6] aspect-[1440/700] bg-[#EEF3F7]">
										<iframe
											ref="desktopFrameRef"
											:title="'Anteprima desktop hero'"
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
											@load="onFrameLoad('desktop')" />

										<div
											class="absolute inset-0 z-[5]"
											:class="activeViewport === 'desktop' ? (dragState.active && dragState.viewport === 'desktop' ? 'cursor-grabbing ring-2 ring-inset ring-[#0b6d7d]/40' : 'cursor-grab ring-2 ring-inset ring-[#0b6d7d]/40') : 'cursor-pointer'"
											@pointerdown="beginDrag('desktop', $event)"
											@wheel="handleWheelZoom('desktop', $event)"
											@click="setActiveViewport('desktop')" />
									</div>
								</div>

								<div class="rounded-[12px] border border-[#DCE5EC] bg-white p-[8px] w-full max-w-[980px]">
									<div class="flex items-center justify-between mb-[8px]">
										<p class="text-[0.75rem] font-semibold text-[#252B42] uppercase tracking-[0.6px]">Mobile</p>
										<button
											type="button"
											@click="setActiveViewport('mobile')"
											class="text-[0.75rem] font-semibold px-[10px] py-[4px] rounded-[999px] border"
											:class="activeViewport === 'mobile' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#095866] border-[#B9D4DC]'">
												Modifica
										</button>
									</div>

									<div ref="mobileViewportRef" class="relative overflow-hidden rounded-[10px] border border-[#D3DEE6] aspect-[390/220] bg-[#EEF3F7]">
										<iframe
											ref="mobileFrameRef"
											:title="'Anteprima mobile hero'"
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
											@load="onFrameLoad('mobile')" />

										<div
											class="absolute inset-0 z-[5]"
											:class="activeViewport === 'mobile' ? (dragState.active && dragState.viewport === 'mobile' ? 'cursor-grabbing ring-2 ring-inset ring-[#0b6d7d]/40' : 'cursor-grab ring-2 ring-inset ring-[#0b6d7d]/40') : 'cursor-pointer'"
											@pointerdown="beginDrag('mobile', $event)"
											@wheel="handleWheelZoom('mobile', $event)"
											@click="setActiveViewport('mobile')" />
									</div>
								</div>
							</div>
						</div>

						<div class="rounded-[14px] border border-[#E9EBEC] bg-[#FBFCFD] p-[14px] desktop:p-[16px]">
							<h2 class="text-[1rem] font-bold text-[#252B42] mb-[12px]">Controlli immagine</h2>

							<label class="flex flex-col items-center justify-center py-[24px] rounded-[12px] border-2 border-dashed border-[#C8CCD0] hover:border-[#095866] bg-white cursor-pointer transition-colors">
								<p class="text-[0.875rem] font-medium text-[#404040]">Carica nuova immagine</p>
								<p class="text-[0.75rem] text-[#737373] mt-[4px]">JPG, PNG, WebP - max 5MB</p>
								<input type="file" accept="image/jpeg,image/png,image/webp" @change="onFileSelected" class="hidden" />
							</label>

							<div v-if="selectedFile" class="mt-[8px] rounded-[10px] border border-[#E4E7EB] bg-white px-[10px] py-[8px] text-[0.75rem] text-[#44505F] flex items-center justify-between gap-[10px]">
								<span class="truncate">{{ selectedFile.name }}</span>
								<button type="button" class="text-[#095866] font-semibold hover:underline" @click="removePreview">Rimuovi</button>
							</div>

							<div class="mt-[14px]">
								<p class="text-[0.75rem] font-semibold text-[#5B6576] uppercase tracking-[0.6px] mb-[8px]">Viewport attiva</p>
								<div class="grid grid-cols-2 gap-[8px]">
									<button
										type="button"
										@click="setActiveViewport('desktop')"
										class="h-[34px] rounded-[10px] text-[0.8125rem] font-semibold border"
										:class="activeViewport === 'desktop' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#095866] border-[#B9D4DC]'">
										Desktop
									</button>
									<button
										type="button"
										@click="setActiveViewport('mobile')"
										class="h-[34px] rounded-[10px] text-[0.8125rem] font-semibold border"
										:class="activeViewport === 'mobile' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#095866] border-[#B9D4DC]'">
										Mobile
									</button>
								</div>
							</div>

							<div class="mt-[14px]">
								<p class="text-[0.75rem] font-semibold text-[#5B6576] uppercase tracking-[0.6px] mb-[8px]">Modalita</p>
								<div class="grid grid-cols-3 gap-[8px]">
									<button
										type="button"
										@click="setViewportMode('fill')"
										class="h-[34px] rounded-[10px] text-[0.8125rem] font-semibold border"
										:class="activeTransform.mode === 'fill' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#095866] border-[#B9D4DC]'">
										Fill
									</button>
									<button
										type="button"
										@click="setViewportMode('fit')"
										class="h-[34px] rounded-[10px] text-[0.8125rem] font-semibold border"
										:class="activeTransform.mode === 'fit' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#095866] border-[#B9D4DC]'">
										Fit
									</button>
									<button
										type="button"
										@click="setViewportMode('crop')"
										class="h-[34px] rounded-[10px] text-[0.8125rem] font-semibold border"
										:class="activeTransform.mode === 'crop' ? 'bg-[#095866] text-white border-[#095866]' : 'bg-white text-[#095866] border-[#B9D4DC]'">
										Crop
									</button>
								</div>
							</div>

							<div class="mt-[14px] space-y-[12px]">
								<div>
									<div class="flex items-center justify-between mb-[4px]">
										<label class="text-[0.8125rem] font-semibold text-[#344054]">Zoom</label>
										<span class="text-[0.75rem] text-[#667085]">{{ activeTransform.zoom.toFixed(2) }}x</span>
									</div>
									<input
										:value="activeTransform.zoom"
										@input="updateViewportTransform('zoom', $event.target.value)"
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
										@input="updateViewportTransform('x', $event.target.value)"
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
										@input="updateViewportTransform('y', $event.target.value)"
										type="range"
										min="-1200"
										max="1200"
										step="1"
										class="w-full accent-[#095866]" />
								</div>
							</div>

							<div class="mt-[14px] grid grid-cols-2 gap-[8px]">
								<button type="button" @click="resetViewport()" class="h-[36px] rounded-[10px] border border-[#B9D4DC] bg-white text-[#095866] font-semibold text-[0.8125rem] hover:bg-[#F1F8FA]">
									Reset viewport
								</button>
								<button type="button" @click="resetAllViewports" class="h-[36px] rounded-[10px] border border-[#B9D4DC] bg-white text-[#095866] font-semibold text-[0.8125rem] hover:bg-[#F1F8FA]">
									Reset totale
								</button>
							</div>

							<button
								type="button"
								@click="saveImage"
								:disabled="uploading || !hasPendingChanges"
								class="mt-[14px] w-full h-[44px] rounded-[999px] bg-[#095866] hover:bg-[#074a56] text-white font-semibold text-[0.875rem] disabled:opacity-45 disabled:cursor-not-allowed">
								{{ uploading ? 'Salvataggio...' : 'Salva immagine' }}
							</button>

							<p class="mt-[8px] text-[0.75rem] text-[#6B7280]">
								Pubblicazione: il sito pubblico si aggiorna solo dopo il salvataggio.
							</p>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
