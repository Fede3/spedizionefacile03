/**
 * ADMIN - Immagine Homepage
 * Upload e gestione dell'immagine decorativa della homepage.
 */
<script setup>
definePageMeta({
	middleware: ["sanctum:auth", "admin"],
});

const sanctum = useSanctumClient();
const { actionMessage, showSuccess, showError } = useAdmin();

const isLoading = ref(true);
const uploading = ref(false);
const currentImageUrl = ref(null);
const previewUrl = ref(null);
const selectedFile = ref(null);

const fetchCurrentImage = async () => {
	isLoading.value = true;
	try {
		const res = await sanctum("/api/admin/homepage-image");
		currentImageUrl.value = res?.image_url || null;
	} catch (e) { currentImageUrl.value = null; }
	finally { isLoading.value = false; }
};

const onFileSelected = (event) => {
	const file = event.target.files?.[0];
	if (!file) return;
	selectedFile.value = file;
	// Genera preview locale
	if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
	previewUrl.value = URL.createObjectURL(file);
};

const uploadImage = async () => {
	if (!selectedFile.value) return;
	uploading.value = true;
	try {
		const formData = new FormData();
		formData.append('image', selectedFile.value);
		const res = await sanctum("/api/admin/homepage-image", {
			method: "POST",
			body: formData,
		});
		currentImageUrl.value = res?.image_url || res?.data?.image_url || previewUrl.value;
		selectedFile.value = null;
		previewUrl.value = null;
		showSuccess("Immagine homepage aggiornata con successo.");
	} catch (e) { showError(e, "Errore durante il caricamento dell'immagine."); }
	finally { uploading.value = false; }
};

const removePreview = () => {
	selectedFile.value = null;
	if (previewUrl.value) {
		URL.revokeObjectURL(previewUrl.value);
		previewUrl.value = null;
	}
};

onMounted(() => { fetchCurrentImage(); });

onBeforeUnmount(() => {
	if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
});
</script>

<template>
	<section class="min-h-[600px] py-[40px] desktop:py-[60px] desktop-xl:py-[80px]">
		<div class="my-container max-w-[1400px]">
			<!-- Breadcrumb -->
			<div class="mb-[24px] text-[0.875rem] text-[#737373]">
				<NuxtLink to="/account" class="hover:underline text-[#095866] font-medium">Il tuo account</NuxtLink>
				<span class="mx-[8px] text-[#C8CCD0]">/</span>
				<span class="font-semibold text-[#252B42]">Immagine Homepage</span>
			</div>

			<NuxtLink to="/account" class="inline-flex items-center gap-[6px] text-[0.8125rem] text-[#095866] hover:underline font-medium mb-[20px]">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px]" fill="currentColor"><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>
				Torna all'account
			</NuxtLink>

			<h1 class="text-[1.75rem] font-bold text-[#252B42] mb-[24px]">Immagine Homepage</h1>

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

			<template v-else>
				<div class="grid grid-cols-1 desktop:grid-cols-2 gap-[24px]">
					<!-- Immagine attuale -->
					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px] flex items-center gap-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-[#095866]" fill="currentColor"><path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/></svg> Immagine attuale
						</h2>
						<div v-if="currentImageUrl" class="rounded-[12px] border border-[#E9EBEC] overflow-hidden">
							<!-- Ottimizzazione: lazy loading + decoding async -->
							<img :src="currentImageUrl" alt="Immagine homepage attuale" loading="lazy" decoding="async" class="w-full max-h-[400px] object-cover" />
						</div>
						<div v-else class="flex flex-col items-center justify-center py-[60px] text-[#737373] rounded-[12px] border border-dashed border-[#C8CCD0] bg-[#FAFBFC]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[48px] h-[48px] text-[#C8CCD0] mb-[12px]" fill="currentColor"><path d="M21,17.2L6.8,3H19A2,2 0 0,1 21,5V17.2M20.7,22L19.7,21H5A2,2 0 0,1 3,19V5C3,4.7 3.1,4.4 3.2,4.2L2,3L3.3,1.7L22,20.4L20.7,22M16.8,18L12.9,14.1L11,16.5L8.5,13.5L5,18H16.8Z"/></svg>
							<p class="text-[0.875rem]">Nessuna immagine configurata</p>
						</div>
					</div>

					<!-- Upload nuova -->
					<div class="bg-white rounded-[20px] p-[24px] desktop:p-[32px] shadow-sm border border-[#E9EBEC]">
						<h2 class="text-[1.125rem] font-bold text-[#252B42] mb-[20px] flex items-center gap-[8px]">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[20px] h-[20px] text-indigo-600" fill="currentColor"><path d="M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z"/></svg> Carica nuova immagine
						</h2>

						<!-- Preview -->
						<div v-if="previewUrl" class="mb-[20px]">
							<p class="text-[0.75rem] text-[#737373] uppercase tracking-[0.5px] font-medium mb-[8px]">Anteprima</p>
							<div class="relative rounded-[12px] border border-[#E9EBEC] overflow-hidden">
								<!-- Ottimizzazione: lazy loading + decoding async -->
								<img :src="previewUrl" alt="Anteprima nuova immagine" loading="lazy" decoding="async" class="w-full max-h-[300px] object-cover" />
								<button @click="removePreview" class="absolute top-[8px] right-[8px] w-[32px] h-[32px] bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow cursor-pointer">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] text-[#404040]" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
								</button>
							</div>
							<p class="mt-[8px] text-[0.75rem] text-[#737373]">
								File: {{ selectedFile?.name }} ({{ (selectedFile?.size / 1024).toFixed(1) }} KB)
							</p>
						</div>

						<!-- Upload area -->
						<div v-if="!previewUrl" class="mb-[20px]">
							<label class="flex flex-col items-center justify-center py-[48px] rounded-[12px] border-2 border-dashed border-[#C8CCD0] hover:border-[#095866] bg-[#FAFBFC] hover:bg-[#f0f7f8] cursor-pointer transition-colors">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[48px] h-[48px] text-[#C8CCD0] mb-[12px]" fill="currentColor"><path d="M14,13V17H10V13H7L12,8L17,13M19.35,10.03C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.03C2.34,8.36 0,10.9 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 24,15C24,12.36 21.95,10.22 19.35,10.03Z"/></svg>
								<p class="text-[0.875rem] font-medium text-[#404040]">Clicca per selezionare un'immagine</p>
								<p class="text-[0.75rem] text-[#737373] mt-[4px]">JPG, PNG, WebP. Max 5MB.</p>
								<input type="file" accept="image/jpeg,image/png,image/webp" @change="onFileSelected" class="hidden" />
							</label>
						</div>

						<!-- Upload button -->
						<button
							v-if="selectedFile"
							@click="uploadImage"
							:disabled="uploading"
							class="w-full px-[20px] py-[12px] bg-[#095866] hover:bg-[#074a56] text-white rounded-[10px] text-[0.875rem] font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-[8px]">
							<svg v-if="uploading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px] animate-spin" fill="currentColor"><path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/></svg>
							<svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="currentColor"><path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/></svg>
							{{ uploading ? "Caricamento in corso..." : "Salva immagine" }}
						</button>

						<!-- Info -->
						<div class="mt-[20px] rounded-[10px] p-[16px] bg-[#F8F9FB] border border-[#E9EBEC]">
							<h3 class="text-[0.8125rem] font-bold text-[#252B42] mb-[8px] flex items-center gap-[6px]">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-[16px] h-[16px] text-[#095866]" fill="currentColor"><path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg> Suggerimenti
							</h3>
							<ul class="text-[0.75rem] text-[#737373] space-y-[4px] list-disc list-inside">
								<li>Dimensioni consigliate: 1200x800 pixel o superiore</li>
								<li>Formati supportati: JPG, PNG, WebP</li>
								<li>Peso massimo: 5 MB</li>
								<li>L'immagine viene mostrata nella sezione hero della homepage</li>
							</ul>
						</div>
					</div>
				</div>
			</template>
		</div>
	</section>
</template>
