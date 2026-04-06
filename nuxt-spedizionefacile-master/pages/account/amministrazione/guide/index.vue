<!--
  FILE: pages/account/amministrazione/guide/index.vue
  SCOPO: Pannello admin — lista guide con pubblicazione, ordinamento e azioni CRUD.
  API: GET /api/admin/guides — lista guide,
       PATCH /api/admin/guides/{id}/publish — pubblica/bozza,
       DELETE /api/admin/guides/{id} — elimina guida.
  ROUTE: /account/amministrazione/guide (middleware sanctum:auth + admin).

  COLLEGAMENTI:
    - pages/account/amministrazione/guide/nuovo.vue → crea nuova guida.
    - pages/account/amministrazione/guide/[id].vue → modifica guida.
    - pages/guide/index.vue → lista guide pubblica.
-->
<script setup>
definePageMeta({
	middleware: ["app-auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionLoading, actionMessage, showSuccess, showError, formatDate } = useAdmin();

const isLoading = ref(true);
const articles = ref([]);

const fetchArticles = async () => {
	isLoading.value = true;
	try {
		const res = await sanctum("/api/admin/articles?type=guide");
		articles.value = res?.data || res || [];
	} catch (e) { articles.value = []; }
	finally { isLoading.value = false; }
};

const togglePublished = async (article) => {
	actionLoading.value = `toggle-${article.id}`;
	try {
		await sanctum(`/api/admin/articles/${article.id}`, {
			method: "PUT",
			body: { ...article, is_published: !article.is_published },
		});
		article.is_published = !article.is_published;
		showSuccess(`Guida "${article.title}" ${article.is_published ? 'pubblicata' : 'nascosta'}.`);
	} catch (e) { showError(e, "Errore durante l'aggiornamento."); }
	finally { actionLoading.value = null; }
};

const deleteArticle = async (article) => {
	if (!confirm(`Sei sicuro di voler eliminare la guida "${article.title}"?`)) return;
	actionLoading.value = `delete-${article.id}`;
	try {
		await sanctum(`/api/admin/articles/${article.id}`, { method: "DELETE" });
		showSuccess(`Guida "${article.title}" eliminata.`);
		await fetchArticles();
	} catch (e) { showError(e, "Errore durante l'eliminazione."); }
	finally { actionLoading.value = null; }
};

onMounted(() => { fetchArticles(); });
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Admin"
				title="Guide"
				description="Gestisci la knowledge base del sito con una vista ordinata, pronta per creare, pubblicare e riorganizzare i contenuti guida."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Guide' },
				]"
				back-to="/account/amministrazione"
				back-label="Torna all'amministrazione">
				<template #actions>
					<NuxtLink to="/account/amministrazione/guide/nuovo" class="btn-cta btn-compact inline-flex items-center gap-[6px] text-[0.875rem]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
						Nuova guida
					</NuxtLink>
				</template>
			</AccountPageHeader>

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[20px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success' ? 'bg-[#f0fdf4] text-[#0a8a7a] border border-[#d1fae5]' : 'bg-red-50 text-red-700 border border-red-200',
				]">
				<template v-if="actionMessage.type === 'success'"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg></template>
				<template v-else><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg></template>
				{{ actionMessage.text }}
			</div>

			<!-- Loading -->
			<div v-if="isLoading" class="py-[60px] flex justify-center">
				<div class="w-[40px] h-[40px] border-3 border-[var(--color-brand-border)] border-t-[var(--color-brand-primary)] rounded-full animate-spin"></div>
			</div>

			<div v-else class="sf-section-block">
				<div class="sf-section-block__header">
					<div class="sf-page-intro">
						<h2 class="text-[1.125rem] font-bold text-[var(--color-brand-text)]">Tutte le guide</h2>
						<p class="text-[0.875rem] text-[var(--color-brand-text-secondary)]">Gestisci le guide della knowledge base con stato, ordine e azioni rapide.</p>
					</div>
				</div>

				<div class="sf-section-block__body">
					<div v-if="!articles.length" class="sf-page-intro sf-page-intro--center py-[28px]">
						<div class="w-[64px] h-[64px] mx-auto bg-[#F5F6F9] rounded-full flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[28px] h-[28px]" fill="#C8CCD0"><path d="M13,12H20V13.5H13M13,9.5H20V11H13M13,14.5H20V16H13M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M21,19H12V6H21"/></svg>
						</div>
						<h2 class="text-[1.125rem] font-bold text-[var(--color-brand-text)]">Nessuna guida presente</h2>
						<p class="text-[var(--color-brand-text-secondary)] text-[0.875rem]">Crea la prima guida per iniziare.</p>
						<NuxtLink to="/account/amministrazione/guide/nuovo" class="btn-cta btn-compact inline-flex items-center gap-[6px] text-[0.875rem]">
							<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
							Crea guida
						</NuxtLink>
					</div>

					<!-- Card-based guide list -->
					<div v-else class="grid gap-[12px]">
						<div
							v-for="article in articles"
							:key="article.id"
							class="flex items-center gap-[16px] p-[14px] rounded-[14px] border border-[var(--color-brand-border)] bg-white hover:border-[var(--color-brand-primary)] transition-colors">
							<!-- Thumbnail -->
							<div class="w-[56px] h-[56px] flex-shrink-0 rounded-[20px] bg-[#F0F4F6] flex items-center justify-center overflow-hidden">
								<img v-if="article.featured_image || article.image_url" :src="article.featured_image || article.image_url" alt="" class="w-full h-full object-cover" loading="lazy" decoding="async" />
								<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[24px] h-[24px]" fill="#C8CCD0"><path d="M13,12H20V13.5H13M13,9.5H20V11H13M13,14.5H20V16H13M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M21,19H12V6H21"/></svg>
							</div>
							<!-- Info -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-[8px] mb-[4px]">
									<h3 class="text-[0.9rem] font-semibold text-[var(--color-brand-text)] truncate">{{ article.title }}</h3>
									<span :class="['badge', article.is_published ? 'badge-success' : 'badge-draft']">
										{{ article.is_published ? 'Pubblicata' : 'Bozza' }}
									</span>
								</div>
								<div class="flex items-center gap-[10px] text-[0.8125rem] text-[var(--color-brand-text-secondary)]">
									<span class="font-mono bg-[#F0F0F0] px-[6px] py-[1px] rounded text-[0.75rem]">{{ article.slug }}</span>
									<span>{{ formatDate(article.created_at) }}</span>
									<span v-if="article.sort_order != null" class="text-[var(--color-brand-text-muted)]">Ordine: {{ article.sort_order }}</span>
								</div>
							</div>
							<!-- Actions -->
							<div class="flex items-center gap-[8px] flex-shrink-0">
								<button
									type="button"
									@click="togglePublished(article)"
									:disabled="actionLoading === `toggle-${article.id}`"
									:aria-pressed="article.is_published"
									:aria-label="article.is_published ? `Nascondi ${article.title}` : `Pubblica ${article.title}`"
									:class="['sf-toggle', article.is_published && 'is-active']">
									<span class="sf-toggle__thumb" />
								</button>
								<NuxtLink :to="`/account/amministrazione/guide/${article.id}`" class="btn-secondary btn-compact inline-flex items-center gap-[4px]">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>
									Modifica
								</NuxtLink>
								<button type="button" @click="deleteArticle(article)" :disabled="actionLoading === `delete-${article.id}`" class="btn-danger btn-compact inline-flex items-center gap-[4px]">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>
									Elimina
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
