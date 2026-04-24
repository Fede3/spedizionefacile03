<!-- COMPONENTE: RichTextEditor (admin/RichTextEditor.vue) -->
<!--
	NOTA (2026-04-20): Tiptap archiviato in _archive/frontend-simplification-2026-04-20/npm-packages/tiptap/.
	Sostituito con <textarea> nativo per ridurre il bundle (~300kB gz rimossi).
	L'API del componente resta invariata: v-model:modelValue + prop placeholder.
	Il contenuto pregresso in HTML viene mostrato sicuro via DOMPurify in lettura;
	in scrittura l'admin inserisce testo semplice (a capo preservati).
-->
<script setup>
import DOMPurify from 'isomorphic-dompurify';

const props = defineProps({
	modelValue: { type: String, default: '' },
	placeholder: { type: String, default: 'Scrivi il contenuto...' },
});

const emit = defineEmits(['update:modelValue']);

const localValue = ref(props.modelValue || '');
const showPreview = ref(false);

// Rileva se il contenuto in ingresso ha tag HTML (guide storiche) per mostrare un'anteprima sanificata.
const looksLikeHtml = computed(() => /<[a-z][\s\S]*>/i.test(localValue.value || ''));

const sanitizedPreview = computed(() => {
	if (!looksLikeHtml.value) return '';
	return DOMPurify.sanitize(localValue.value || '', {
		ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'a', 'img', 'blockquote', 'code', 'pre'],
		ALLOWED_ATTR: ['href', 'rel', 'target', 'src', 'alt', 'title'],
	});
});

watch(() => props.modelValue, (val) => {
	if (val !== localValue.value) localValue.value = val || '';
});

const onInput = (event) => {
	localValue.value = event.target.value;
	emit('update:modelValue', localValue.value);
};
</script>

<template>
	<div class="border border-[var(--color-brand-border)] rounded-[16px] overflow-hidden bg-white">
		<!-- Toolbar minima: solo toggle anteprima per contenuti HTML preesistenti -->
		<div class="flex items-center justify-between gap-[8px] px-[12px] py-[8px] bg-[#F5F6F9] border-b border-[var(--color-brand-border)]">
			<span class="text-[0.75rem] text-[#404040]">
				Editor semplice: testo piano. I ritorni a capo sono preservati in visualizzazione.
			</span>
			<button
				v-if="looksLikeHtml"
				type="button"
				class="text-[0.75rem] text-[var(--color-brand-primary)] underline"
				@click="showPreview = !showPreview"
			>
				{{ showPreview ? 'Modifica' : 'Anteprima HTML' }}
			</button>
		</div>

		<!-- Anteprima HTML sanificato (solo per contenuti storici) -->
		<div
			v-if="looksLikeHtml && showPreview"
			class="prose prose-sm max-w-none px-[16px] py-[12px] min-h-[200px]"
			v-html="sanitizedPreview"
		/>

		<!-- Textarea editor -->
		<textarea
			v-else
			:value="localValue"
			:placeholder="placeholder"
			class="block w-full min-h-[200px] px-[16px] py-[12px] resize-y outline-none border-0 font-mono text-[0.875rem] leading-[1.6] bg-white text-[var(--color-brand-text)]"
			rows="10"
			@input="onInput"
		/>
	</div>
</template>
