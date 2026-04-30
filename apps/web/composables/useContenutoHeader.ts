type HeroViewportMode = 'fill' | 'fit' | 'crop'
type HeroViewport = {
	mode: HeroViewportMode
	zoom: number
	x: number
	y: number
}
type HeroConfig = {
	image_url: string
	desktop: HeroViewport
	mobile: HeroViewport
	updated_at: string | null
}
type HeroPreviewMessage = {
	type?: string
	payload?: unknown
}
type HeroErrorLike = {
	statusCode?: number | string
	response?: { status?: number | string }
	message?: string
}

declare global {
	interface Window {
		__applyHeroPreviewPayload?: (payload: unknown) => void
	}
}

const DEFAULT_HOMEPAGE_HERO = '/img/homepage/hero-truck-landscape.jpg'
const PREVIEW_DRAFT_STORAGE_KEY = 'hero-preview-live-draft'
const VIEWPORT_MODES: HeroViewportMode[] = ['fill', 'fit', 'crop']

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null

const createViewportDefaults = (): HeroViewport => ({ mode: 'fill', zoom: 1, x: 0, y: 0 })
const clamp = (value: unknown, min: number, max: number): number => {
	const numeric = Number(value)
	if (!Number.isFinite(numeric)) return min
	return Math.min(max, Math.max(min, numeric))
}
const normalizeViewport = (viewport: unknown, fallback = createViewportDefaults()): HeroViewport => {
	const source = isRecord(viewport) ? viewport : {}
	const mode = typeof source.mode === 'string' && VIEWPORT_MODES.includes(source.mode as HeroViewportMode)
		? source.mode as HeroViewportMode
		: fallback.mode

	return {
		mode,
		zoom: clamp(source.zoom ?? fallback.zoom, 0.5, 4),
		x: clamp(source.x ?? fallback.x, -1200, 1200),
		y: clamp(source.y ?? fallback.y, -1200, 1200),
	}
}
const normalizeHeroConfig = (payload: unknown): HeroConfig => {
	const envelope = isRecord(payload) ? payload : {}
	const source = isRecord(envelope.config) ? envelope.config : envelope
	const imageUrl = typeof source.image_url === 'string' && source.image_url.trim()
		? source.image_url
		: DEFAULT_HOMEPAGE_HERO

	return {
		image_url: imageUrl,
		desktop: normalizeViewport(source.desktop),
		mobile: normalizeViewport(source.mobile),
		updated_at: typeof source.updated_at === 'string' ? source.updated_at : null,
	}
}
const isUnavailableHeroError = (error: unknown): boolean => {
	const err = error as HeroErrorLike
	const status = Number(err.statusCode || err.response?.status || 0)
	if ([404, 500, 502, 503].includes(status)) return true
	return String(err.message || '').toLowerCase().includes('homepage-image') ||
		String(err.message || '').toLowerCase().includes('bad gateway')
}

export default function useContenutoHeader() {
	const route = useRoute()
	const heroConfig = ref<HeroConfig>(normalizeHeroConfig({}))
	const homepageHeroEndpointAvailable = ref(true)
	const isDesktopViewport = ref(true)
	const heroPrefetched = ref(false)
	const isPreviewHeroRoute = computed(() => route.path === '/preview/home-hero')
	const isHomepageHeroRoute = computed(() => route.path === '/' || isPreviewHeroRoute.value)
	let homepageHeroPoll: ReturnType<typeof setInterval> | null = null
	let previewDraftLastTs: string | number | null = null

	const stopHomepageHeroRefresh = () => {
		homepageHeroEndpointAvailable.value = false
		if (homepageHeroPoll) {
			clearInterval(homepageHeroPoll)
			homepageHeroPoll = null
		}
	}
	const applyHomepageImage = async () => {
		if (!homepageHeroEndpointAvailable.value) return

		try {
			heroConfig.value = normalizeHeroConfig(await $fetch('/api/public/homepage-image', { method: 'GET' }))
		} catch (error) {
			heroConfig.value = normalizeHeroConfig({})
			if (isUnavailableHeroError(error)) stopHomepageHeroRefresh()
		}
	}
	const refreshHomepageImage = () => {
		if (isHomepageHeroRoute.value && homepageHeroEndpointAvailable.value) {
			void applyHomepageImage()
		}
	}
	const prefetchHero = async () => {
		if (!isHomepageHeroRoute.value) return

		try {
			const { data } = await useFetch('/api/public/homepage-image', {
				key: `homepage-hero-config:${route.path}`,
				server: true,
				lazy: false,
				default: () => null,
			})
			if (data.value) {
				heroConfig.value = normalizeHeroConfig(data.value)
				heroPrefetched.value = true
			}
		} catch (error) {
			heroConfig.value = normalizeHeroConfig({})
			if (isUnavailableHeroError(error)) stopHomepageHeroRefresh()
		}
	}

	const getForcedPreviewViewport = () => {
		if (!isPreviewHeroRoute.value) return null
		const requested = typeof route.query.viewport === 'string' ? route.query.viewport.toLowerCase() : ''
		if (requested === 'desktop') return true
		if (requested === 'mobile') return false
		return null
	}
	const updateViewportFlag = () => {
		if (typeof window === 'undefined') return
		const forced = getForcedPreviewViewport()
		isDesktopViewport.value = forced ?? window.innerWidth >= 1024
	}
	const applyHeroPreviewPayload = (payload: unknown) => {
		if (isPreviewHeroRoute.value) {
			heroConfig.value = normalizeHeroConfig(payload)
		}
	}
	const onHeroPreviewMessage = (event: MessageEvent<HeroPreviewMessage>) => {
		if (!isPreviewHeroRoute.value) return
		if (event.origin !== window.location.origin) return
		if (event.data?.type !== 'hero-preview:update') return
		applyHeroPreviewPayload(event.data.payload)
	}
	const applyPreviewDraftFromStorage = () => {
		if (typeof window === 'undefined' || !isPreviewHeroRoute.value) return

		try {
			const raw = window.localStorage.getItem(PREVIEW_DRAFT_STORAGE_KEY)
			const parsed = raw ? JSON.parse(raw) as unknown : null
			if (!isRecord(parsed)) return
			if (!parsed.ts || parsed.ts === previewDraftLastTs) return
			previewDraftLastTs = typeof parsed.ts === 'number' || typeof parsed.ts === 'string' ? parsed.ts : null
			applyHeroPreviewPayload(parsed.payload)
		} catch {
			// Malformed preview drafts are ignored.
		}
	}
	const onPreviewDraftStorageEvent = (event: StorageEvent) => {
		if (isPreviewHeroRoute.value && event.key === PREVIEW_DRAFT_STORAGE_KEY) {
			applyPreviewDraftFromStorage()
		}
	}
	const notifyHeroPreviewReady = () => {
		if (typeof window === 'undefined' || !isPreviewHeroRoute.value) return
		window.parent?.postMessage(
			{ type: 'hero-preview:ready', viewport: getForcedPreviewViewport() === false ? 'mobile' : 'desktop' },
			window.location.origin,
		)
	}
	const onHomepageImageStorage = (event: StorageEvent) => {
		if (event.key === 'homepage-image-updated-at') refreshHomepageImage()
	}
	const onVisibilityChange = () => {
		if (document.visibilityState === 'visible') refreshHomepageImage()
	}

	onMounted(() => {
		updateViewportFlag()
		if (!isPreviewHeroRoute.value && !heroPrefetched.value) refreshHomepageImage()

		window.addEventListener('resize', updateViewportFlag)
		if (route.path === '/' && homepageHeroEndpointAvailable.value) {
			if (homepageHeroPoll) clearInterval(homepageHeroPoll)
			homepageHeroPoll = setInterval(refreshHomepageImage, 120000)
			window.addEventListener('focus', refreshHomepageImage)
			window.addEventListener('storage', onHomepageImageStorage)
			window.addEventListener('homepage-image-updated', refreshHomepageImage)
			document.addEventListener('visibilitychange', onVisibilityChange)
		}

		if (isPreviewHeroRoute.value) {
			window.__applyHeroPreviewPayload = applyHeroPreviewPayload
			window.addEventListener('message', onHeroPreviewMessage)
			window.addEventListener('storage', onPreviewDraftStorageEvent)
			applyPreviewDraftFromStorage()
			notifyHeroPreviewReady()
		}
	})

	onBeforeUnmount(() => {
		if (homepageHeroPoll) clearInterval(homepageHeroPoll)
		window.removeEventListener('focus', refreshHomepageImage)
		window.removeEventListener('storage', onHomepageImageStorage)
		window.removeEventListener('homepage-image-updated', refreshHomepageImage)
		window.removeEventListener('resize', updateViewportFlag)
		window.removeEventListener('message', onHeroPreviewMessage)
		window.removeEventListener('storage', onPreviewDraftStorageEvent)
		document.removeEventListener('visibilitychange', onVisibilityChange)
		delete window.__applyHeroPreviewPayload
	})

	const heroImageUrl = computed(() => heroConfig.value.image_url || DEFAULT_HOMEPAGE_HERO)
	const activeViewportConfig = computed(() =>
		isDesktopViewport.value ? heroConfig.value.desktop : heroConfig.value.mobile,
	)
	const heroImageStyle = computed(() => {
		const transform = activeViewportConfig.value || createViewportDefaults()
		const isMobile = !isDesktopViewport.value
		const offsetLimit = isMobile ? 260 : 1200
		const maxZoom = isMobile ? 2.4 : 4
		const offsetX = Math.round(clamp(transform.x, -offsetLimit, offsetLimit))
		const offsetY = Math.round(clamp(transform.y, -offsetLimit, offsetLimit))
		const zoom = clamp(transform.zoom, 0.5, maxZoom)

		return {
			position: 'absolute',
			top: '50%',
			left: '50%',
			width: '100%',
			height: '100%',
			objectFit: transform.mode === 'fit' ? 'contain' : 'cover',
			objectPosition: '50% 50%',
			transform: `translate(-50%, -50%) translate3d(${offsetX}px, ${offsetY}px, 0) scale(${zoom})`,
			transformOrigin: 'center center',
			willChange: 'transform',
		}
	})

	useHead(() =>
		isHomepageHeroRoute.value
			? { link: [{ rel: 'preload', as: 'image', href: DEFAULT_HOMEPAGE_HERO, fetchpriority: 'high' }] }
			: {},
	)

	return {
		isHomepageHeroRoute,
		isPreviewHeroRoute,
		heroImageUrl,
		heroImageStyle,
		prefetchHero,
	}
}
