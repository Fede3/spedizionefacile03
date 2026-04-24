/**
 * useContenutoHeader
 */
interface ViewportConfig {
	mode: 'fill' | 'fit' | 'crop' | string
	zoom: number
	x: number
	y: number
}

interface HeroConfig {
	image_url: string
	desktop: ViewportConfig
	mobile: ViewportConfig
	updated_at: string | null
}

interface HeroPayload {
	image_url?: string
	desktop?: Partial<ViewportConfig>
	mobile?: Partial<ViewportConfig>
	updated_at?: string | null
	config?: Partial<HeroPayload>
}

interface HeroError {
	statusCode?: number
	response?: { status?: number }
	message?: string
}

declare global {
	interface Window {
		__applyHeroPreviewPayload?: (payload: HeroPayload) => void
	}
}

export default function useContenutoHeader() {
	const route = useRoute()

	const DEFAULT_HOMEPAGE_HERO = '/img/homepage/hero-truck-landscape.jpg'
	const PREVIEW_DRAFT_STORAGE_KEY = 'hero-preview-live-draft'

	const createViewportDefaults = (): ViewportConfig => ({ mode: 'fill', zoom: 1, x: 0, y: 0 })

	const heroConfig = ref<HeroConfig>({
		image_url: DEFAULT_HOMEPAGE_HERO,
		desktop: createViewportDefaults(),
		mobile: createViewportDefaults(),
		updated_at: null,
	})
	const homepageHeroEndpointAvailable = ref(true)
	const isDesktopViewport = ref(true)
	const heroPrefetched = ref(false)

	let homepageHeroPoll: ReturnType<typeof setInterval> | null = null
	let previewDraftLastTs: number | null = null

	const isPreviewHeroRoute = computed(() => route.path === '/preview/home-hero')
	const isHomepageHeroRoute = computed(() => route.path === '/' || isPreviewHeroRoute.value)

	const clamp = (value: unknown, min: number, max: number): number => {
		const numeric = Number(value)
		if (!Number.isFinite(numeric)) return min
		return Math.min(max, Math.max(min, numeric))
	}

	const normalizeViewport = (viewport: Partial<ViewportConfig> | undefined, fallback: ViewportConfig = createViewportDefaults()): ViewportConfig => {
		const allowedModes = ['fill', 'fit', 'crop']
		const mode = allowedModes.includes(viewport?.mode || '') ? (viewport?.mode as string) : fallback.mode
		return {
			mode,
			zoom: clamp(viewport?.zoom ?? fallback.zoom ?? 1, 0.5, 4),
			x: clamp(viewport?.x ?? fallback.x ?? 0, -1200, 1200),
			y: clamp(viewport?.y ?? fallback.y ?? 0, -1200, 1200),
		}
	}

	const normalizeHeroConfig = (payload: HeroPayload | null | undefined): HeroConfig => {
		const source: HeroPayload = (payload?.config && typeof payload.config === 'object' ? payload.config : payload) || {}
		const imageUrl = typeof source?.image_url === 'string' && source.image_url.trim().length > 0
			? source.image_url
			: DEFAULT_HOMEPAGE_HERO
		return {
			image_url: imageUrl,
			desktop: normalizeViewport(source?.desktop, createViewportDefaults()),
			mobile: normalizeViewport(source?.mobile, createViewportDefaults()),
			updated_at: source?.updated_at || null,
		}
	}

	const isUnavailableHeroError = (error: HeroError | null | undefined): boolean => {
		const status = Number(error?.statusCode || error?.response?.status || 0)
		if ([404, 500, 502, 503].includes(status)) return true
		const message = String(error?.message || '').toLowerCase()
		return message.includes('homepage-image') || message.includes('bad gateway')
	}

	const stopHomepageHeroRefresh = (): void => {
		homepageHeroEndpointAvailable.value = false
		if (homepageHeroPoll) { clearInterval(homepageHeroPoll); homepageHeroPoll = null }
	}

	const applyHomepageImage = async (): Promise<void> => {
		if (!homepageHeroEndpointAvailable.value) return
		try {
			const res = await $fetch<HeroPayload>('/api/public/homepage-image', { method: 'GET' })
			heroConfig.value = normalizeHeroConfig(res)
		} catch (error: unknown) {
			heroConfig.value = normalizeHeroConfig({ image_url: DEFAULT_HOMEPAGE_HERO, desktop: createViewportDefaults(), mobile: createViewportDefaults() })
			if (isUnavailableHeroError(error as HeroError)) stopHomepageHeroRefresh()
		}
	}

	const refreshHomepageImage = (): void => {
		if (!isHomepageHeroRoute.value || !homepageHeroEndpointAvailable.value) return
		void applyHomepageImage()
	}

	const prefetchHero = async (): Promise<void> => {
		if (!isHomepageHeroRoute.value) return
		try {
			const { data: initialHeroResponse } = await useFetch<HeroPayload | null>('/api/public/homepage-image', {
				key: `homepage-hero-config:${route.path}`,
				server: true,
				lazy: false,
				default: () => null,
			})
			if (initialHeroResponse.value) {
				heroConfig.value = normalizeHeroConfig(initialHeroResponse.value)
				heroPrefetched.value = true
			}
		} catch (error: unknown) {
			heroConfig.value = normalizeHeroConfig({ image_url: DEFAULT_HOMEPAGE_HERO, desktop: createViewportDefaults(), mobile: createViewportDefaults() })
			if (isUnavailableHeroError(error as HeroError)) stopHomepageHeroRefresh()
		}
	}

	const getForcedPreviewViewport = (): boolean | null => {
		if (!isPreviewHeroRoute.value) return null
		const requested = typeof route.query.viewport === 'string' ? route.query.viewport.toLowerCase() : ''
		if (requested === 'desktop') return true
		if (requested === 'mobile') return false
		return null
	}

	const updateViewportFlag = (): void => {
		if (typeof window === 'undefined') return
		const forced = getForcedPreviewViewport()
		if (forced !== null) { isDesktopViewport.value = forced; return }
		isDesktopViewport.value = window.innerWidth >= 1024
	}

	const applyHeroPreviewPayload = (payload: HeroPayload): void => {
		if (!isPreviewHeroRoute.value) return
		heroConfig.value = normalizeHeroConfig(payload || {})
	}

	const onHeroPreviewMessage = (event: MessageEvent): void => {
		if (!isPreviewHeroRoute.value) return
		if (event.origin !== window.location.origin) return
		const data = event.data as { type?: string; payload?: HeroPayload } | null
		if (!data || data.type !== 'hero-preview:update') return
		heroConfig.value = normalizeHeroConfig(data.payload || {})
	}

	const applyPreviewDraftFromStorage = (): void => {
		if (typeof window === 'undefined' || !isPreviewHeroRoute.value) return
		try {
			const raw = window.localStorage.getItem(PREVIEW_DRAFT_STORAGE_KEY)
			if (!raw) return
			const parsed = JSON.parse(raw) as { ts?: number; payload?: HeroPayload } | null
			if (!parsed || typeof parsed !== 'object') return
			if (!parsed.ts || parsed.ts === previewDraftLastTs) return
			previewDraftLastTs = parsed.ts
			applyHeroPreviewPayload(parsed.payload || {})
		} catch { /* Ignore malformed localStorage data. */ }
	}

	const onPreviewDraftStorageEvent = (event: StorageEvent): void => {
		if (!isPreviewHeroRoute.value) return
		if (event.key !== PREVIEW_DRAFT_STORAGE_KEY) return
		applyPreviewDraftFromStorage()
	}

	const notifyHeroPreviewReady = (): void => {
		if (typeof window === 'undefined' || !isPreviewHeroRoute.value) return
		const viewport = getForcedPreviewViewport() === false ? 'mobile' : 'desktop'
		window.parent?.postMessage({ type: 'hero-preview:ready', viewport }, window.location.origin)
	}

	const onHomepageImageStorage = (event: StorageEvent): void => { if (event.key === 'homepage-image-updated-at') refreshHomepageImage() }
	const onHomepageImageEvent = (): void => refreshHomepageImage()
	const onVisibilityChange = (): void => { if (document.visibilityState === 'visible') refreshHomepageImage() }

	onMounted(() => {
		updateViewportFlag()
		if (!isPreviewHeroRoute.value && !heroPrefetched.value) refreshHomepageImage()

		window.addEventListener('resize', updateViewportFlag)

		if (route.path === '/') {
			if (homepageHeroEndpointAvailable.value) {
				homepageHeroPoll = setInterval(refreshHomepageImage, 30000)
				window.addEventListener('focus', refreshHomepageImage)
				window.addEventListener('storage', onHomepageImageStorage)
				window.addEventListener('homepage-image-updated', onHomepageImageEvent)
				document.addEventListener('visibilitychange', onVisibilityChange)
			}
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
		if (homepageHeroPoll) { clearInterval(homepageHeroPoll); homepageHeroPoll = null }
		window.removeEventListener('focus', refreshHomepageImage)
		window.removeEventListener('storage', onHomepageImageStorage)
		window.removeEventListener('homepage-image-updated', onHomepageImageEvent)
		document.removeEventListener('visibilitychange', onVisibilityChange)
		window.removeEventListener('resize', updateViewportFlag)
		window.removeEventListener('message', onHeroPreviewMessage)
		window.removeEventListener('storage', onPreviewDraftStorageEvent)
		if (typeof window !== 'undefined' && window.__applyHeroPreviewPayload) {
			delete window.__applyHeroPreviewPayload
		}
	})

	const heroImageUrl = computed(() => heroConfig.value.image_url || DEFAULT_HOMEPAGE_HERO)

	const activeViewportConfig = computed(() =>
		isDesktopViewport.value ? heroConfig.value.desktop : heroConfig.value.mobile,
	)

	const heroImageStyle = computed(() => {
		const transform = activeViewportConfig.value || createViewportDefaults()
		const objectFit = transform.mode === 'fit' ? 'contain' : 'cover'
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
			objectFit,
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
