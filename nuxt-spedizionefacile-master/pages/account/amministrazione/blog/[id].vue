<!--
  FILE: pages/account/amministrazione/blog/[id].vue
  SCOPO: Pannello admin — modifica articolo blog esistente con sezioni dinamiche e upload immagine.
  API: GET /api/admin/articles/{id} — carica articolo,
       PUT /api/admin/articles/{id} — salva modifiche,
       POST /api/admin/articles/{id}/upload-image — upload immagine.
  ROUTE: /account/amministrazione/blog/{id} (middleware sanctum:auth + admin).

  COLLEGAMENTI:
    - pages/account/amministrazione/blog/index.vue — torna alla lista blog.
-->
<script setup>
definePageMeta({
	middleware: ["app-auth", "admin"],
});

const route = useRoute();
const sanctum = useSanctumClient();
const { actionMessage, showSuccess, showError } = useAdmin();

const isLoading = ref(true);
const saving = ref(false);
const uploading = ref(false);
const form = ref({
	title: '',
	slug: '',
	meta_description: '',
	intro: '',
	sections: [{ heading: '', text: '' }],
	is_published: false,
	type: 'blog',
	image_url: null,
});

const fetchArticle = async () => {
	isLoading.value = true;
	try {
		const res = await sanctum(`/api/admin/articles/${route.params.id}`);
		const data = res?.data || res;
		form.value = {
			title: data.title || '',
			slug: data.slug || '',
			meta_description: data.meta_description || '',
			intro: data.intro || '',
			sections: data.sections?.length ? data.sections : [{ heading: '', text: '' }],
			is_published: !!data.is_published,
			type: data.type || 'blog',
			image_url: data.featured_image || data.image_url || null,
		};
	} catch (e) { showError(e, "Errore nel caricamento dell'articolo."); }
	finally { isLoading.value = false; }
};

const generateSlug = () => {
	form.value.slug = form.value.title
		.toLowerCase()
		.replace(/[àáâãäå]/g, 'a')
		.replace(/[èéêë]/g, 'e')
		.replace(/[ìíîï]/g, 'i')
		.replace(/[òóôõö]/g, 'o')
		.replace(/[ùúûü]/g, 'u')
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
};

const addSection = () => {
	form.value.sections.push({ heading: '', text: '' });
};

const removeSection = (idx) => {
	if (form.value.sections.length > 1) {
		form.value.sections.splice(idx, 1);
	}
};

const normalizeSections = (sections) => {
	if (!Array.isArray(sections)) return [];
	return sections
		.map((section) => ({
			heading: typeof section?.heading === "string" ? section.heading.trim() : "",
			text: typeof section?.text === "string" ? section.text.trim() : "",
		}))
		.filter((section) => section.heading.length || section.text.length);
};

const saveArticle = async () => {
	saving.value = true;
	try {
		const sections = normalizeSections(form.value.sections);
		const payload = {
			...form.value,
			sections: sections.length ? sections : null,
			featured_image: form.value.image_url || null,
		};
		await sanctum(`/api/admin/articles/${route.params.id}`, { method: "PUT", body: payload });
		showSuccess("Articolo aggiornato con successo.");
	} catch (e) { showError(e, "Errore durante il salvataggio."); }
	finally { saving.value = false; }
};

const uploadImage = async (event) => {
	const file = event.target.files?.[0];
	if (!file) return;
	uploading.value = true;
	try {
		const formData = new FormData();
		formData.append('image', file);
		const res = await sanctum(`/api/admin/articles/${route.params.id}/upload-image`, {
			method: "POST",
			body: formData,
		});
		form.value.image_url = res?.url || res?.image_url || res?.data?.url || res?.data?.image_url;
		showSuccess("Immagine caricata con successo.");
	} catch (e) { showError(e, "Errore durante il caricamento dell'immagine."); }
	finally { uploading.value = false; }
};

onMounted(() => { fetchArticle(); });
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Admin"
				title="Modifica articolo blog"
				description="Aggiorna titolo, contenuti, immagine e stato di pubblicazione dell'articolo senza uscire dal flusso editor."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Blog', to: '/account/amministrazione/blog' },
					{ label: 'Modifica' },
				]"
				back-to="/account/amministrazione/blog"
				back-label="Torna al blog" />

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
				<div class="w-[40px] h-[40px] border-3 border-[#E9EBEC] border-t-[#095866] rounded-full animate-spin"/>
			</div>

			<template v-else>
				<div class="space-y-[20px]">
					<!-- Info base -->
					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px] flex items-center gap-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#095866]" fill="currentColor"><path d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/></svg> Informazioni base
						</h2>
						<div class="space-y-[16px] max-w-[700px]">
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Titolo</label>
								<input v-model="form.title" type="text" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[50px] text-[0.875rem] focus:border-[#095866] focus:outline-none" placeholder="Titolo dell'articolo" @input="generateSlug" >
							</div>
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Slug (URL)</label>
								<input v-model="form.slug" type="text" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[50px] text-[0.875rem] font-mono focus:border-[#095866] focus:outline-none" placeholder="titolo-dell-articolo" >
							</div>
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Meta description (SEO)</label>
								<textarea v-model="form.meta_description" rows="2" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[50px] text-[0.875rem] focus:border-[#095866] focus:outline-none resize-none" placeholder="Descrizione per i motori di ricerca"/>
							</div>
							<div>
								<label class="block text-[0.8125rem] font-medium text-[#404040] mb-[6px]">Introduzione / Anteprima</label>
								<textarea v-model="form.intro" rows="3" class="w-full px-[14px] py-[10px] bg-[#F8F9FB] border border-[#E9EBEC] rounded-[50px] text-[0.875rem] focus:border-[#095866] focus:outline-none resize-none" placeholder="Testo introduttivo mostrato nella lista del blog e in cima all'articolo"/>
							</div>

							<div class="flex items-center gap-[12px]">
								<button
									:class="['w-[44px] h-[24px] rounded-full relative transition-colors cursor-pointer', form.is_published ? 'bg-emerald-500' : 'bg-[#C8CCD0]']"
									@click="form.is_published = !form.is_published">
									<span :class="['absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow transition-transform', form.is_published ? 'left-[22px]' : 'left-[2px]']"/>
								</button>
								<span class="text-[0.875rem] text-[#404040]">{{ form.is_published ? 'Pubblicato' : 'Bozza (non visibile)' }}</span>
							</div>
						</div>
					</div>

					<!-- Immagine -->
					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px] flex items-center gap-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-purple-600" fill="currentColor"><path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/></svg> Immagine di copertina
						</h2>
						<div class="max-w-[700px]">
							<div v-if="form.image_url" class="mb-[16px]">
								<img :src="form.image_url" alt="Immagine articolo" loading="lazy" decoding="async" class="max-w-full max-h-[200px] rounded-[12px] border border-[#E9EBEC] object-cover" >
							</div>
							<label class="inline-flex items-center gap-[8px] px-[16px] py-[10px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] rounded-[50px] text-[0.875rem] font-medium cursor-pointer transition-colors">
								<svg v-if="uploading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
								<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z"/></svg>
								{{ uploading ? 'Caricamento...' : 'Carica immagine' }}
								<input type="file" accept="image/*" class="hidden" :disabled="uploading" @change="uploadImage" >
							</label>
						</div>
					</div>

					<!-- Sezioni -->
					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<div class="flex items-center justify-between mb-[20px]">
							<h2 class="text-[1.125rem] font-bold text-[#252B42] flex items-center gap-[8px]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-indigo-600" fill="currentColor"><path d="M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z"/></svg> Sezioni contenuto
							</h2>
							<button class="px-[12px] py-[6px] bg-[#F0F0F0] hover:bg-[#E0E0E0] text-[#404040] rounded-[12px] text-[0.8125rem] font-medium cursor-pointer inline-flex items-center gap-[4px]" @click="addSection">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg> Aggiungi sezione
							</button>
						</div>

						<div class="space-y-[16px]">
							<div v-for="(section, idx) in form.sections" :key="idx" class="p-[16px] rounded-[14px] border border-[#E9EBEC] bg-[#FAFBFC]">
								<div class="flex items-center justify-between mb-[12px]">
									<span class="text-[0.8125rem] font-semibold text-[#252B42]">Sezione {{ idx + 1 }}</span>
									<button v-if="form.sections.length > 1" class="w-[28px] h-[28px] flex items-center justify-center rounded-full hover:bg-red-50 text-red-400 hover:text-red-600 cursor-pointer transition-colors" @click="removeSection(idx)">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
									</button>
								</div>
								<div class="space-y-[10px]">
									<input v-model="section.heading" type="text" class="w-full px-[12px] py-[8px] bg-white border border-[#E9EBEC] rounded-[12px] text-[0.875rem] focus:border-[#095866] focus:outline-none" placeholder="Titolo sezione" >
									<AdminRichTextEditor v-model="section.text" placeholder="Contenuto della sezione" />
								</div>
							</div>
						</div>
					</div>

					<!-- Save -->
					<div class="flex justify-end">
						<button :disabled="saving" class="px-[24px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[50px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-[8px]" @click="saveArticle">
							<svg v-if="saving" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
							<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
							{{ saving ? "Salvataggio..." : "Salva modifiche" }}
						</button>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
