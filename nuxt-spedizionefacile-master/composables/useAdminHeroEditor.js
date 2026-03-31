/**
 * COMPOSABLE: useAdminHeroEditor
 * SCOPO: Logica di business per l'editor hero homepage (desktop/mobile, preview iframe, drag, zoom).
 * DOVE SI USA: pages/account/amministrazione/immagine-homepage.vue
 */
export const useAdminHeroEditor = () => {
	const sanctum = useSanctumClient();
	const { actionMessage, showSuccess, showError } = useAdmin();

	const DEFAULT_HERO_IMAGE = '/img/homepage/hero-truck-landscape.jpg';
	const PREVIEW_ROUTE = '/preview/home-hero';
	const PREVIEW_DRAFT_STORAGE_KEY = 'hero-preview-live-draft';
	const DESKTOP_CANVAS = Object.freeze({ width: 1440, height: 700 });
	const MOBILE_CANVAS = Object.freeze({ width: 390, height: 220 });

	const createViewportDefaults = () => ({ mode: 'fill', zoom: 1, x: 0, y: 0 });
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
		return {
			mode: allowedModes.includes(viewport?.mode) ? viewport.mode : fallback.mode,
			zoom: clamp(viewport?.zoom ?? fallback.zoom ?? 1, 0.5, 4),
			x: clamp(viewport?.x ?? fallback.x ?? 0, -1200, 1200),
			y: clamp(viewport?.y ?? fallback.y ?? 0, -1200, 1200),
		};
	};

	const normalizeConfigResponse = (payload) => {
		const source = payload?.config && typeof payload.config === 'object' ? payload.config : payload;
		const imageUrl = typeof source?.image_url === 'string' && source.image_url.trim().length > 0 ? source.image_url : null;
		return {
			image_url: imageUrl,
			desktop: normalizeViewport(source?.desktop, createViewportDefaults()),
			mobile: normalizeViewport(source?.mobile, createViewportDefaults()),
			updated_at: source?.updated_at || null,
		};
	};

	// Reactive state
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
		active: false, viewport: 'desktop',
		startX: 0, startY: 0, originX: 0, originY: 0,
	});

	let previewSyncTimer = null;
	let previewResizeObserver = null;

	// Computed
	const livePreviewSource = computed(() => {
		if (previewUrl.value) return previewUrl.value;
		if (draftConfig.value.image_url) return draftConfig.value.image_url;
		return DEFAULT_HERO_IMAGE;
	});

	const activeTransform = computed(() => draftConfig.value[activeViewport.value] || createViewportDefaults());

	const hasTransformChanges = computed(() => {
		return JSON.stringify(currentConfig.value.desktop) !== JSON.stringify(draftConfig.value.desktop) ||
			JSON.stringify(currentConfig.value.mobile) !== JSON.stringify(draftConfig.value.mobile);
	});

	const hasPendingChanges = computed(() => Boolean(selectedFile.value) || hasTransformChanges.value);

	// Preview sync
	const frameSrc = (viewport) => `${PREVIEW_ROUTE}?viewport=${viewport}&editor_nonce=${frameRuntimeNonce}`;

	const setActiveViewport = (viewport) => { activeViewport.value = viewport; };

	const computePreviewScale = (viewport) => {
		const target = viewport === 'mobile' ? mobileViewportRef.value : desktopViewportRef.value;
		const canvas = viewport === 'mobile' ? MOBILE_CANVAS : DESKTOP_CANVAS;
		if (!target) return 1;
		const rect = target.getBoundingClientRect();
		if (!rect.width || !rect.height) return 1;
		return clamp(Math.min(rect.width / canvas.width, rect.height / canvas.height), 0.05, 4);
	};

	const updatePreviewScales = () => {
		previewScale.desktop = computePreviewScale('desktop');
		previewScale.mobile = computePreviewScale('mobile');
	};

	const pushPreviewState = () => {
		if (typeof window === 'undefined') return;
		const payload = {
			image_url: livePreviewSource.value,
			desktop: draftConfig.value.desktop,
			mobile: draftConfig.value.mobile,
		};
		try {
			window.localStorage.setItem(PREVIEW_DRAFT_STORAGE_KEY, JSON.stringify({ ts: Date.now(), payload }));
		} catch { /* ignore storage errors */ }

		for (const frameRef of [desktopFrameRef, mobileFrameRef]) {
			const win = frameRef.value?.contentWindow;
			if (win) {
				win.postMessage({ type: 'hero-preview:update', payload }, window.location.origin);
				win.__applyHeroPreviewPayload?.(payload);
			}
		}
	};

	const schedulePreviewSync = () => {
		if (typeof window === 'undefined') return;
		if (previewSyncTimer) window.cancelAnimationFrame(previewSyncTimer);
		previewSyncTimer = window.requestAnimationFrame(() => { previewSyncTimer = null; pushPreviewState(); });
	};

	// Data fetching
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
			nextTick(() => schedulePreviewSync());
		}
	};

	// File handling
	const onFileSelected = (event) => {
		const file = event.target.files?.[0];
		if (!file) return;
		selectedFile.value = file;
		if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
		previewUrl.value = URL.createObjectURL(file);
		schedulePreviewSync();
	};

	const removePreview = () => {
		selectedFile.value = null;
		if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value = null; }
		schedulePreviewSync();
	};

	// Viewport controls
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
			draftConfig.value[viewport].zoom = clamp(numericValue, 0.5, 4);
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

	// Drag & zoom
	const handleWheelZoom = (viewport, event) => {
		if (!event.ctrlKey && !event.metaKey && !event.altKey) return;
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
		const vp = dragState.viewport;
		const scale = vp === 'mobile' ? previewScale.mobile || 1 : previewScale.desktop || 1;
		draftConfig.value[vp].x = clamp(dragState.originX + (dx / scale), -1200, 1200);
		draftConfig.value[vp].y = clamp(dragState.originY + (dy / scale), -1200, 1200);
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
		Object.assign(dragState, {
			active: true, viewport,
			startX: event.clientX, startY: event.clientY,
			originX: draftConfig.value[viewport].x, originY: draftConfig.value[viewport].y,
		});
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
		const vp = event.data.viewport === 'mobile' ? 'mobile' : 'desktop';
		frameReady[vp] = true;
		pushPreviewState();
	};

	// Save
	const saveImage = async () => {
		if (!hasPendingChanges.value) { showSuccess('Nessuna modifica da salvare.'); return; }
		uploading.value = true;
		try {
			const formData = new FormData();
			if (selectedFile.value) formData.append('image', selectedFile.value);
			formData.append('config', JSON.stringify({ desktop: draftConfig.value.desktop, mobile: draftConfig.value.mobile }));
			const res = await sanctum('/api/admin/homepage-image', { method: 'POST', body: formData });
			const normalized = normalizeConfigResponse(res);
			currentConfig.value = normalized;
			draftConfig.value = cloneConfig(normalized);
			if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value = null; }
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

	// Lifecycle
	const initEditor = () => {
		fetchCurrentImage();
		window.addEventListener('message', onFrameMessage);
		window.addEventListener('resize', updatePreviewScales);
		nextTick(() => {
			updatePreviewScales();
			if (typeof ResizeObserver !== 'undefined') {
				previewResizeObserver = new ResizeObserver(() => updatePreviewScales());
				if (desktopViewportRef.value) previewResizeObserver.observe(desktopViewportRef.value);
				if (mobileViewportRef.value) previewResizeObserver.observe(mobileViewportRef.value);
			}
		});

		watch(
			() => [
				livePreviewSource.value,
				draftConfig.value.desktop.mode, draftConfig.value.desktop.zoom, draftConfig.value.desktop.x, draftConfig.value.desktop.y,
				draftConfig.value.mobile.mode, draftConfig.value.mobile.zoom, draftConfig.value.mobile.x, draftConfig.value.mobile.y,
			],
			() => schedulePreviewSync()
		);
	};

	const destroyEditor = () => {
		stopDrag();
		window.removeEventListener('message', onFrameMessage);
		window.removeEventListener('resize', updatePreviewScales);
		if (previewResizeObserver) { previewResizeObserver.disconnect(); previewResizeObserver = null; }
		if (previewSyncTimer) { window.cancelAnimationFrame(previewSyncTimer); previewSyncTimer = null; }
		if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
	};

	return {
		// Constants
		DESKTOP_CANVAS, MOBILE_CANVAS,
		// State
		isLoading, uploading, selectedFile, previewUrl,
		currentConfig, draftConfig, activeViewport,
		desktopFrameRef, mobileFrameRef, desktopViewportRef, mobileViewportRef,
		frameReady, previewScale, dragState,
		// Computed
		livePreviewSource, activeTransform, hasPendingChanges,
		// Actions
		frameSrc, setActiveViewport, onFileSelected, removePreview,
		setViewportMode, updateViewportTransform, resetViewport, resetAllViewports,
		handleWheelZoom, beginDrag, onFrameLoad, saveImage,
		initEditor, destroyEditor,
		// From useAdmin
		actionMessage,
	};
};
