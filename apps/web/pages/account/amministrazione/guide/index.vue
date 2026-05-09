<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

useSeoMeta({
	title: 'Admin - Guide',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const { actionLoading, actionMessage, showSuccess, showError, formatDate } = useAdmin();
const confirmDialog = useConfirmDialogStore();

const isLoading = ref(true);
const articles = ref([]);
const searchQuery = ref('');
const statusFilter = ref('all');

const publishedArticles = computed(() => articles.value.filter((article) => Boolean(article?.is_published)));
const draftArticles = computed(() => articles.value.filter((article) => !article?.is_published));
const orderedArticles = computed(() =>
	articles.value.filter((article) => article?.sort_order !== null && article?.sort_order !== undefined && article?.sort_order !== '')
);

const filteredArticles = computed(() => {
	const query = searchQuery.value.trim().toLowerCase();

	return articles.value.filter((article) => {
		const matchesStatus = statusFilter.value === 'all'
			? true
			: statusFilter.value === 'published'
				? Boolean(article?.is_published)
				: !article?.is_published;

		if (!matchesStatus) return false;
		if (!query) return true;

		const haystack = [
			article?.title,
			article?.slug,
			article?.intro,
			article?.meta_description,
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();

		return haystack.includes(query);
	});
});

const guidePreview = (article) =>
	article?.intro?.trim() || article?.meta_description?.trim() || 'Apri la guida per completare introduzione, sezioni e FAQ del catalogo pubblico.';

const statusFilters = computed(() => [
	{ value: 'all', label: 'Tutte', count: articles.value.length },
	{ value: 'published', label: 'Pubblicate', count: publishedArticles.value.length },
	{ value: 'draft', label: 'Bozze', count: draftArticles.value.length },
]);

const fetchArticles = async () => {
	isLoading.value = true;
	try {
		const res = await sanctum('/api/admin/articles?type=guide');
		articles.value = res?.data || res || [];
	} catch (e) {
		articles.value = [];
		showError(e, 'Errore nel caricamento delle guide.');
	} finally {
		isLoading.value = false;
	}
};

const togglePublished = async (article) => {
	actionLoading.value = `toggle-${article.id}`;
	try {
		await sanctum(`/api/admin/articles/${article.id}`, {
			method: 'PUT',
			body: { ...article, is_published: !article.is_published },
		});
		article.is_published = !article.is_published;
		showSuccess(`Guida "${article.title}" ${article.is_published ? 'pubblicata' : 'salvata come bozza'}.`);
	} catch (e) {
		showError(e, "Errore durante l'aggiornamento.");
	} finally {
		actionLoading.value = null;
	}
};

const deleteArticle = async (article) => {
	const ok = await confirmDialog.confirm({
		title: 'Eliminare la guida?',
		message: `"${article.title}" verra' rimossa dal catalogo. L'azione non e' reversibile.`,
		confirmText: 'Elimina',
		cancelText: 'Annulla',
		tone: 'danger',
	});
	if (!ok) return;
	actionLoading.value = `delete-${article.id}`;
	try {
		await sanctum(`/api/admin/articles/${article.id}`, { method: 'DELETE' });
		showSuccess(`Guida "${article.title}" eliminata.`);
		await fetchArticles();
	} catch (e) {
		showError(e, "Errore durante l'eliminazione.");
	} finally {
		actionLoading.value = null;
	}
};

onMounted(() => {
	fetchArticles();
});
</script>

<template>
	<AccountPageSection spacing="sf-stack-section" padding="py-6 tablet:py-7 desktop:py-7">
		<AccountPageHeader
			eyebrow="Area amministrazione"
			title="Guide"
			description="Guide e tutorial pubblicati: visibilita, ordine e bozze in una console coerente con il resto dell'admin."
			:crumbs="[
				{ label: 'Account', to: '/account' },
				{ label: 'Amministrazione', to: '/account/amministrazione' },
				{ label: 'Guide' },
			]"
			back-to="/account/amministrazione"
			back-label="Torna all'amministrazione" />

		<SfActionBanner :message="actionMessage" />

		<div class="grid grid-cols-2 tablet:grid-cols-4 gap-3.5">
			<SfStatCard label="Guide" :value="articles.length" icon="mdi:book-open-outline" tone="primary" :loading="isLoading" />
			<SfStatCard label="Pubblicate" :value="publishedArticles.length" icon="mdi:check-circle-outline" tone="success" :loading="isLoading" />
			<SfStatCard label="Bozze" :value="draftArticles.length" icon="mdi:clock-outline" tone="accent" :loading="isLoading" />
			<SfStatCard label="Ordinate" :value="orderedArticles.length" icon="mdi:sort-numeric-ascending" tone="primary" :loading="isLoading" />
		</div>

		<div v-if="isLoading" class="space-y-3">
			<SfSkeleton variant="card" />
			<SfSkeleton variant="card" />
		</div>

			<SfCard v-else padding="none" shadow="sf">
				<template #header>
					<div class="flex flex-col tablet:flex-row tablet:items-start tablet:justify-between gap-4 w-full">
						<div class="max-w-[720px]">
							<p class="text-xs font-semibold uppercase tracking-wider text-brand-text-muted mb-1.5">Catalogo</p>
							<h2 class="font-display text-lg font-bold text-brand-text">Catalogo guide</h2>
							<p class="text-sm text-brand-text-secondary mt-1">Tutorial, articoli e how-to in un solo pannello editoriale.</p>
						</div>
						<SfButton to="/account/amministrazione/guide/nuovo" variant="primary" size="sm">
							<template #leading><UIcon name="mdi:plus" class="w-4 h-4" /></template>
							Nuova guida
						</SfButton>
					</div>
				</template>

				<div class="px-5 md:px-6 py-4 border-b border-brand-border bg-brand-bg-alt/60">
					<div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_auto] gap-3.5 items-start">
						<SfInput
							v-model="searchQuery"
							placeholder="Cerca per titolo, slug o descrizione..."
							leading-icon="mdi:magnify" />

						<div class="flex flex-wrap items-center gap-2">
							<button
								v-for="filter in statusFilters"
								:key="filter.value"
								type="button"
								:class="[
									'h-9 px-3.5 rounded-pill text-xs font-semibold transition-colors border',
									statusFilter === filter.value
										? 'bg-brand-primary text-white border-brand-primary'
										: 'bg-brand-card text-brand-text-secondary border-brand-border hover:bg-brand-bg-alt',
								]"
								@click="statusFilter = filter.value">
								{{ filter.label }} {{ filter.count }}
							</button>
						</div>
					</div>
				</div>

				<div v-if="!articles.length" class="px-5 md:px-6 py-2">
					<SfEmptyState
						icon="mdi:book-open-outline"
						title="Nessuna guida presente"
						description="Crea la prima guida per il sito pubblico: tutorial, how-to o articoli editoriali, gestiti tutti da qui.">
						<template #cta>
							<SfButton to="/account/amministrazione/guide/nuovo" variant="primary" size="sm">
								<template #leading><UIcon name="mdi:plus" class="w-4 h-4" /></template>
								Crea la prima guida
							</SfButton>
						</template>
					</SfEmptyState>
				</div>

				<div v-else-if="!filteredArticles.length" class="px-5 md:px-6 py-2">
					<SfEmptyState
						icon="mdi:filter-variant"
						title="Nessuna guida con i filtri correnti"
						description="Prova a cambiare stato o ricerca per ritrovare le guide del catalogo." />
				</div>

				<div v-else class="divide-y divide-brand-border">
					<div
						v-for="article in filteredArticles"
						:key="article.id"
						class="px-5 md:px-6 py-4 hover:bg-brand-bg-alt/40 transition-colors">
						<AdminContentCatalogRow
							:article="article"
							:preview-text="guidePreview(article)"
							:edit-to="`/account/amministrazione/guide/${article.id}`"
							kind="guide"
							published-label="Pubblicata"
							draft-label="Bozza"
							created-label="Creata"
							updated-label="Aggiornata"
							:format-date="formatDate"
							:is-toggling="actionLoading === `toggle-${article.id}`"
							:is-deleting="actionLoading === `delete-${article.id}`"
							@toggle="togglePublished(article)"
							@delete="deleteArticle(article)" />
					</div>
				</div>
		</SfCard>
	</AccountPageSection>
</template>
