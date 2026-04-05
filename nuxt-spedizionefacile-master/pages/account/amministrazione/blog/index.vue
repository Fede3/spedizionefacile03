<!--
  FILE: pages/account/amministrazione/blog/index.vue
  SCOPO: Pannello admin — lista articoli blog con pubblicazione, ordinamento e azioni CRUD.
  API: GET /api/admin/articles?type=blog — lista articoli blog,
       PUT /api/admin/articles/{id} — aggiorna (pubblica/bozza),
       DELETE /api/admin/articles/{id} — elimina articolo.
  ROUTE: /account/amministrazione/blog (middleware sanctum:auth + admin).

  COLLEGAMENTI:
    - pages/account/amministrazione/blog/nuovo.vue → crea nuovo articolo blog.
    - pages/account/amministrazione/blog/[id].vue → modifica articolo blog.
-->
<script setup>
definePageMeta({
	middleware: ['app-auth', 'admin'],
});

const sanctum = useSanctumClient();
const { actionLoading, actionMessage, showSuccess, showError, formatDate } = useAdmin();

const isLoading = ref(true);
const articles = ref([]);

const fetchArticles = async () => {
	isLoading.value = true;
	try {
		const res = await sanctum('/api/admin/articles?type=blog');
		articles.value = res?.data || res || [];
	} catch {
		articles.value = [];
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
		showSuccess(`Articolo "${article.title}" ${article.is_published ? 'pubblicato' : 'nascosto'}.`);
	} catch (e) {
		showError(e, "Errore durante l'aggiornamento.");
	} finally {
		actionLoading.value = null;
	}
};

const deleteArticle = async (article) => {
	if (!confirm(`Sei sicuro di voler eliminare l'articolo "${article.title}"?`)) return;
	actionLoading.value = `delete-${article.id}`;
	try {
		await sanctum(`/api/admin/articles/${article.id}`, { method: 'DELETE' });
		showSuccess(`Articolo "${article.title}" eliminato.`);
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
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Admin"
				title="Gestione Blog"
				description="Crea, pubblica e riordina gli articoli del blog con una console unica, senza uscire dal pannello amministrativo."
				:crumbs="[{ label: 'Account', to: '/account' }, { label: 'Amministrazione', to: '/account/amministrazione' }, { label: 'Blog' }]"
				back-to="/account/amministrazione"
				back-label="Torna all'amministrazione">
				<template #actions>
					<NuxtLink to="/account/amministrazione/blog/nuovo" class="btn-cta btn-compact inline-flex items-center gap-[6px] text-[0.875rem]">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor">
							<path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
						</svg>
						Nuovo articolo
					</NuxtLink>
				</template>
			</AccountPageHeader>

			<div
				v-if="actionMessage"
				:class="['mb-[20px] ux-alert', actionMessage.type === 'success' ? 'ux-alert--success' : 'ux-alert--critical']">
				<svg
					v-if="actionMessage.type === 'success'"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					class="ux-alert__icon"
					fill="currentColor">
					<path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" />
				</svg>
				<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="ux-alert__icon" fill="currentColor">
					<path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
				</svg>
				<span>{{ actionMessage.text }}</span>
			</div>

			<!-- Loading -->
			<div v-if="isLoading" class="py-[60px] flex justify-center">
				<div class="w-[40px] h-[40px] border-3 border-[var(--color-brand-border)] border-t-[var(--color-brand-primary)] rounded-full animate-spin" />
			</div>

			<div v-else class="sf-section-block">
				<div class="sf-section-block__header">
					<div class="sf-page-intro">
						<h2 class="text-[1.125rem] font-bold text-[var(--color-brand-text)]">Tutti gli articoli del blog</h2>
						<p class="text-[0.875rem] text-[#607184]">Pubblica, nascondi e aggiorna gli articoli con una vista più pulita e rapida.</p>
					</div>
				</div>

				<div class="sf-section-block__body">
					<div v-if="!articles.length" class="sf-page-intro sf-page-intro--center py-[28px]">
						<div class="w-[64px] h-[64px] mx-auto bg-[#F8F9FB] rounded-full flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[28px] h-[28px]" fill="#C8CCD0">
								<path
									d="M20,11H4V8H20M20,15.5H4V12.5H20M20,20H4V17H20M21,3H3A1,1 0 0,0 2,4V20A2,2 0 0,0 4,22H20A2,2 0 0,0 22,20V4A1,1 0 0,0 21,3Z" />
							</svg>
						</div>
						<h2 class="text-[1.125rem] font-bold text-[var(--color-brand-text)]">Nessun articolo presente</h2>
						<p class="text-[#607184] text-[0.875rem]">Crea il primo articolo per iniziare.</p>
						<NuxtLink
							to="/account/amministrazione/blog/nuovo"
							class="btn-cta btn-compact inline-flex items-center gap-[6px] text-[0.875rem]">
							<svg
								width="17"
								height="17"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round">
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							Crea articolo
						</NuxtLink>
					</div>

					<div v-else class="overflow-x-auto">
						<table class="w-full text-[0.875rem]">
							<thead>
								<tr class="border-b border-[var(--color-brand-border)] text-left text-[#607184]">
									<th class="pb-[12px] pr-[16px] font-medium">Titolo</th>
									<th class="pb-[12px] pr-[16px] font-medium">Slug</th>
									<th class="pb-[12px] px-[12px] font-medium text-center">Stato</th>
									<th class="pb-[12px] px-[12px] font-medium text-center">Ordine</th>
									<th class="pb-[12px] pr-[16px] font-medium">Data</th>
									<th class="pb-[12px] font-medium text-right">Azioni</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="(article, idx) in articles"
									:key="article.id"
									:class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
									<td class="py-[14px] pr-[16px] font-medium text-[var(--color-brand-text)] align-top">
										<div class="max-w-[260px]">
											<div class="font-semibold leading-[1.35]">{{ article.title }}</div>
										</div>
									</td>
									<td class="py-[14px] pr-[16px] align-top">
										<span class="font-mono text-[0.8125rem] bg-[#F0F0F0] px-[8px] py-[2px] rounded text-[#607184]">{{ article.slug }}</span>
									</td>
									<td class="py-[14px] px-[12px] text-center align-top">
										<button
											type="button"
											:disabled="actionLoading === `toggle-${article.id}`"
											:aria-pressed="article.is_published"
											:aria-label="article.is_published ? `Nascondi ${article.title}` : `Pubblica ${article.title}`"
											:class="['sf-toggle', article.is_published && 'is-active']"
											@click="togglePublished(article)">
											<span class="sf-toggle__thumb" />
										</button>
									</td>
									<td class="py-[14px] px-[12px] text-center text-[#404040] align-top">{{ article.sort_order ?? '-' }}</td>
									<td class="py-[14px] pr-[16px] text-[#607184] text-[0.8125rem] align-top">{{ formatDate(article.created_at) }}</td>
									<td class="py-[14px] text-right align-top">
										<div class="flex justify-end gap-[8px]">
											<NuxtLink :to="`/account/amministrazione/blog/${article.id}`" class="sf-inline-edit-button">
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor">
													<path
														d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
												</svg>
												Modifica
											</NuxtLink>
											<button
												:disabled="actionLoading === `delete-${article.id}`"
												class="btn-danger btn-compact inline-flex items-center gap-[4px]"
												@click="deleteArticle(article)">
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor">
													<path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
												</svg>
												Elimina
											</button>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>
