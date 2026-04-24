<script setup>
definePageMeta({
	middleware: ["app-auth", "admin"],
});

useSeoMeta({
	title: 'Admin - Nuova Guida | SpediamoFacile',
	robots: 'noindex, nofollow',
});

const sanctum = useSanctumClient();
const router = useRouter();
const { actionMessage, showSuccess, showError } = useAdmin();

const saving = ref(false);
const form = ref({
	title: '',
	slug: '',
	meta_description: '',
	intro: '',
	sections: [{ heading: '', text: '' }],
	is_published: false,
	type: 'guide',
});

const generateSlug = () => {
	form.value.slug = form.value.title
		.toLowerCase()
		.replace(/[Á Á¡Á¢Á£Á¤Á¥]/g, 'a')
		.replace(/[èéÁªÁ«]/g, 'e')
		.replace(/[ìÁ­Á®Á¯]/g, 'i')
		.replace(/[òÁ³Á´ÁµÁ¶]/g, 'o')
		.replace(/[ùÁºÁ»Á¼]/g, 'u')
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

const saveGuide = async () => {
	saving.value = true;
	try {
		await sanctum("/api/admin/articles", { method: "POST", body: form.value });
		showSuccess("Guida creata con successo.");
		setTimeout(() => { router.push('/account/amministrazione/guide'); }, 800);
	} catch (e) { showError(e, "Errore durante la creazione della guida."); }
	finally { saving.value = false; }
};
</script>

<template>
	<section class="sf-account-shell min-h-[600px] py-[24px] tablet:py-[28px] desktop:py-[28px]">
		<div class="my-container">
			<AccountPageHeader
				eyebrow="Area amministrazione"
				title="Nuova guida"
				description="Crea una guida con sezioni dinamiche, salva in bozza o pubblica."
				:crumbs="[
					{ label: 'Account', to: '/account' },
					{ label: 'Amministrazione', to: '/account/amministrazione' },
					{ label: 'Guide', to: '/account/amministrazione/guide' },
					{ label: 'Nuova guida' },
				]"
				back-to="/account/amministrazione/guide"
				back-label="Torna alle guide" />

			<AdminActionBanner :message="actionMessage?.text || ''" :tone="actionMessage?.type || ''" />

			<div class="space-y-[16px]">
				<!-- Info base -->
				<div class="sf-surface-card rounded-[16px] p-[18px] desktop:p-[20px]">
					<h2 class="text-[1rem] font-bold text-[var(--color-brand-text)] mb-[16px] flex items-center gap-[8px]">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[var(--color-brand-primary)]" fill="currentColor"><path d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/></svg> Informazioni base
					</h2>
					<div class="space-y-[14px] max-w-[700px]">
						<div>
							<label class="block text-[0.75rem] font-medium text-[var(--color-brand-text)] mb-[5px]">Titolo</label>
							<input v-model="form.title" @input="generateSlug" type="text" class="form-input" placeholder="Titolo della guida" />
						</div>
						<div>
							<label class="block text-[0.75rem] font-medium text-[var(--color-brand-text)] mb-[5px]">Slug (URL)</label>
							<input v-model="form.slug" type="text" class="form-input font-mono" placeholder="titolo-della-guida" />
						</div>
						<div>
							<label class="block text-[0.75rem] font-medium text-[var(--color-brand-text)] mb-[5px]">Meta description</label>
							<textarea v-model="form.meta_description" rows="2" class="form-input resize-none" placeholder="Descrizione per i motori di ricerca"></textarea>
						</div>
						<div>
							<label class="block text-[0.75rem] font-medium text-[var(--color-brand-text)] mb-[5px]">Introduzione</label>
							<textarea v-model="form.intro" rows="3" class="form-input resize-none" placeholder="Paragrafo introduttivo della guida"></textarea>
						</div>
						<div class="flex items-center gap-[10px]">
							<button type="button" role="switch" :aria-checked="form.is_published ? 'true' : 'false'" aria-label="Pubblica o salva come bozza" @click="form.is_published = !form.is_published" :class="['sf-toggle', form.is_published && 'is-active']">
								<span class="sf-toggle__thumb"></span>
							</button>
							<span class="text-[0.8125rem] text-[var(--color-brand-text)]">{{ form.is_published ? 'Pubblicata' : 'Bozza (non visibile)' }}</span>
						</div>
					</div>
				</div>

				<!-- Sezioni -->
				<div class="sf-surface-card rounded-[16px] p-[18px] desktop:p-[20px]">
					<div class="flex items-center justify-between mb-[16px]">
						<h2 class="text-[1rem] font-bold text-[var(--color-brand-text)] flex items-center gap-[8px]">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[var(--color-brand-primary)]" fill="currentColor"><path d="M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z"/></svg> Sezioni
						</h2>
						<button type="button" @click="addSection" class="btn-secondary btn-compact inline-flex items-center gap-[4px]">
							<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg> Aggiungi
						</button>
					</div>

					<div class="space-y-[12px]">
						<div v-for="(section, idx) in form.sections" :key="idx" class="p-[14px] rounded-[12px] bg-[#F7FAFC]">
							<div class="flex items-center justify-between mb-[10px]">
								<span class="text-[0.75rem] font-semibold text-[var(--color-brand-text)]">Sezione {{ idx + 1 }}</span>
								<button type="button" v-if="form.sections.length > 1" @click="removeSection(idx)" class="btn-danger btn-compact inline-flex items-center justify-center !px-0 !py-0 !w-[28px] !h-[28px]">
									<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[14px] h-[14px]" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
								</button>
							</div>
							<div class="space-y-[8px]">
								<input v-model="section.heading" type="text" class="form-input" placeholder="Titolo sezione" />
								<textarea v-model="section.text" rows="4" class="form-input resize-none" placeholder="Contenuto della sezione"></textarea>
							</div>
						</div>
					</div>
				</div>

				<!-- Save -->
				<div class="flex justify-end">
					<button type="button" @click="saveGuide" :disabled="saving" class="btn-primary btn-compact inline-flex items-center gap-[6px] disabled:opacity-50">
						<svg aria-hidden="true" v-if="saving" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
						<svg aria-hidden="true" v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
						{{ saving ? "Salvataggio..." : "Crea guida" }}
					</button>
				</div>
			</div>
		</div>
	</section>
</template>

