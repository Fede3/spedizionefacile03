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
	middleware: ["sanctum:auth", "admin"],
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
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Guide</span>
			</div>

			<NuxtLink to="/account" class="inline-flex items-center gap-[6px] text-[0.8125rem] text-[#095866] hover:underline font-medium mb-[20px]">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
				Torna all'account
			</NuxtLink>

			<div class="flex items-center justify-between mb-[24px]">
				<h1 class="text-[1.75rem] font-bold text-[#252B42]">Guide</h1>
				<NuxtLink to="/account/amministrazione/guide/nuovo" class="px-[16px] py-[10px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.875rem] font-medium transition-colors inline-flex items-center gap-[6px]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg> Nuova guida
				</NuxtLink>
			</div>

			<!-- Action message -->
			<div
				v-if="actionMessage"
				:class="[
					'mb-[20px] px-[16px] py-[12px] rounded-[12px] text-[0.875rem] font-medium flex items-center gap-[8px]',
					actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
				]">
				<template v-if="actionMessage.type === 'success'"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"/></svg></template>
				<template v-else><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] shrink-0" fill="currentColor"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg></template>
				{{ actionMessage.text }}
			</div>

			<!-- Loading -->
			<div v-if="isLoading" class="py-[60px] flex justify-center">
				<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"></div>
			</div>

			<div v-else class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
				<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px]">Tutte le guide</h2>

				<div v-if="!articles.length" class="text-center py-[48px] text-[#737373]">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[40px] h-[40px] text-[#C8CCD0] mx-auto mb-[12px]" fill="currentColor"><path d="M13,12H20V13.5H13M13,9.5H20V11H13M13,14.5H20V16H13M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M21,19H12V6H21"/></svg>
					<p>Nessuna guida presente.</p>
					<NuxtLink to="/account/amministrazione/guide/nuovo" class="inline-block mt-[12px] text-[#095866] hover:underline font-medium text-[0.875rem]">Crea la prima guida</NuxtLink>
				</div>

				<div v-else class="overflow-x-auto">
					<table class="w-full text-[0.875rem]">
						<thead>
							<tr class="border-b border-[#E9EBEC] text-left text-[#737373]">
								<th class="pb-[12px] font-medium">Titolo</th>
								<th class="pb-[12px] font-medium">Slug</th>
								<th class="pb-[12px] font-medium text-center">Pubblicata</th>
								<th class="pb-[12px] font-medium text-center">Ordine</th>
								<th class="pb-[12px] font-medium">Data</th>
								<th class="pb-[12px] font-medium text-right">Azioni</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="(article, idx) in articles" :key="article.id" :class="['border-b border-[#F0F0F0] last:border-0', idx % 2 === 1 ? 'bg-[#FAFBFC]' : '']">
								<td class="py-[14px] font-medium text-[#252B42]">{{ article.title }}</td>
								<td class="py-[14px]"><span class="font-mono text-[0.8125rem] bg-[#F0F0F0] px-[8px] py-[2px] rounded text-[#737373]">{{ article.slug }}</span></td>
								<td class="py-[14px] text-center">
									<button
										@click="togglePublished(article)"
										:disabled="actionLoading === `toggle-${article.id}`"
										:class="['w-[44px] h-[24px] rounded-full relative transition-colors cursor-pointer', article.is_published ? 'bg-emerald-500' : 'bg-[#C8CCD0]']">
										<span :class="['absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow transition-transform', article.is_published ? 'left-[22px]' : 'left-[2px]']"></span>
									</button>
								</td>
								<td class="py-[14px] text-center text-[#404040]">{{ article.sort_order ?? '-' }}</td>
								<td class="py-[14px] text-[#737373] text-[0.8125rem]">{{ formatDate(article.created_at) }}</td>
								<td class="py-[14px] text-right">
									<div class="flex justify-end gap-[6px]">
										<NuxtLink :to="`/account/amministrazione/guide/${article.id}`" class="px-[10px] py-[6px] rounded-[8px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] text-[0.75rem] cursor-pointer font-medium inline-flex items-center gap-[4px]">
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg> Modifica
										</NuxtLink>
										<button @click="deleteArticle(article)" :disabled="actionLoading === `delete-${article.id}`" class="px-[10px] py-[6px] rounded-[8px] bg-red-50 hover:bg-red-100 text-red-600 text-[0.75rem] cursor-pointer font-medium inline-flex items-center gap-[4px]">
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg> Elimina
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</section>
</template>
