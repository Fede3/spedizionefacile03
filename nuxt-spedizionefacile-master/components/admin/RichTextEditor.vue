<!--
	COMPONENTE: RichTextEditor (admin/RichTextEditor.vue)
	SCOPO: Editor WYSIWYG basato su TipTap per creare contenuti formattati (guide, servizi, promo).

	DOVE SI USA: pages/account/amministrazione/guide/nuovo.vue, guide/[id].vue
	PROPS: modelValue (String, HTML), placeholder (String)
	EMITS: update:modelValue (String, HTML)

	DIPENDENZE: @tiptap/vue-3, @tiptap/starter-kit, @tiptap/extension-link,
	            @tiptap/extension-image, @tiptap/extension-color,
	            @tiptap/extension-text-style, @tiptap/extension-underline
-->
<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';

const props = defineProps({
	modelValue: { type: String, default: '' },
	placeholder: { type: String, default: 'Scrivi il contenuto...' },
});

const emit = defineEmits(['update:modelValue']);

const sanctumClient = useSanctumClient();
const imageUploading = ref(false);

const editor = useEditor({
	content: props.modelValue,
	extensions: [
		StarterKit,
		Underline,
		TextStyle,
		Color,
		Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
		Image.configure({ inline: false, allowBase64: false }),
	],
	onUpdate({ editor: ed }) {
		emit('update:modelValue', ed.getHTML());
	},
	editorProps: {
		attributes: {
			class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-[16px] py-[12px]',
		},
	},
});

// Sincronizza props -> editor
watch(() => props.modelValue, (val) => {
	if (editor.value && val !== editor.value.getHTML()) {
		editor.value.commands.setContent(val, false);
	}
});

onBeforeUnmount(() => {
	editor.value?.destroy();
});

// --- TOOLBAR ACTIONS ---
const setLink = () => {
	const url = window.prompt('Inserisci URL del link:', 'https://');
	if (!url) return;
	editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
};

const removeLink = () => {
	editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
};

const addImage = async () => {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = 'image/jpeg,image/png,image/webp';
	input.onchange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			alert('L\'immagine deve essere inferiore a 2 MB.');
			return;
		}
		imageUploading.value = true;
		try {
			const formData = new FormData();
			formData.append('image', file);
			const result = await sanctumClient('/api/admin/upload-image', {
				method: 'POST',
				body: formData,
			});
			const url = result?.url || result?.data?.url;
			if (url) {
				editor.value.chain().focus().setImage({ src: url }).run();
			}
		} catch (err) {
			alert('Errore durante il caricamento dell\'immagine.');
			console.error(err);
		} finally {
			imageUploading.value = false;
		}
	};
	input.click();
};

const setColor = (event) => {
	const color = event.target.value;
	editor.value.chain().focus().setColor(color).run();
};
</script>

<template>
	<div class="border border-[#D0D0D0] rounded-[12px] overflow-hidden bg-white">
		<!-- Toolbar -->
		<div v-if="editor" class="flex flex-wrap items-center gap-[2px] px-[8px] py-[6px] bg-[#F8F9FB] border-b border-[#E9EBEC]">
			<!-- Bold -->
			<button type="button" class="toolbar-btn" :class="{ active: editor.isActive('bold') }" title="Grassetto" @click="editor.chain().focus().toggleBold().run()">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
			</button>
			<!-- Italic -->
			<button type="button" class="toolbar-btn" :class="{ active: editor.isActive('italic') }" title="Corsivo" @click="editor.chain().focus().toggleItalic().run()">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
			</button>
			<!-- Underline -->
			<button type="button" class="toolbar-btn" :class="{ active: editor.isActive('underline') }" title="Sottolineato" @click="editor.chain().focus().toggleUnderline().run()">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
			</button>

			<div class="w-[1px] h-[20px] bg-[#D0D0D0] mx-[4px]"/>

			<!-- H2 -->
			<button type="button" class="toolbar-btn" :class="{ active: editor.isActive('heading', { level: 2 }) }" title="Titolo" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
				<span class="text-[0.75rem] font-bold">H2</span>
			</button>
			<!-- H3 -->
			<button type="button" class="toolbar-btn" :class="{ active: editor.isActive('heading', { level: 3 }) }" title="Sottotitolo" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
				<span class="text-[0.6875rem] font-bold">H3</span>
			</button>

			<div class="w-[1px] h-[20px] bg-[#D0D0D0] mx-[4px]"/>

			<!-- Bullet list -->
			<button type="button" class="toolbar-btn" :class="{ active: editor.isActive('bulletList') }" title="Elenco puntato" @click="editor.chain().focus().toggleBulletList().run()">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
			</button>
			<!-- Ordered list -->
			<button type="button" class="toolbar-btn" :class="{ active: editor.isActive('orderedList') }" title="Elenco numerato" @click="editor.chain().focus().toggleOrderedList().run()">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
			</button>

			<div class="w-[1px] h-[20px] bg-[#D0D0D0] mx-[4px]"/>

			<!-- Link -->
			<button type="button" class="toolbar-btn" :class="{ active: editor.isActive('link') }" title="Inserisci link" @click="editor.isActive('link') ? removeLink() : setLink()">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
			</button>
			<!-- Image -->
			<button type="button" class="toolbar-btn" :disabled="imageUploading" title="Inserisci immagine" @click="addImage">
				<svg v-if="!imageUploading" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
				<span v-else class="inline-block w-[14px] h-[14px] border-2 border-[#095866] border-t-transparent rounded-full animate-spin"/>
			</button>

			<div class="w-[1px] h-[20px] bg-[#D0D0D0] mx-[4px]"/>

			<!-- Color picker -->
			<label class="toolbar-btn relative" title="Colore testo">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11 2L5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z"/></svg>
				<input type="color" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full" @input="setColor">
			</label>
		</div>

		<!-- Editor content -->
		<EditorContent v-if="editor" :editor="editor" />
	</div>
</template>

<style scoped>
.toolbar-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border-radius: 6px;
	color: #404040;
	cursor: pointer;
	transition: background-color 0.15s, color 0.15s;
}
.toolbar-btn:hover {
	background-color: #E9EBEC;
}
.toolbar-btn.active {
	background-color: #095866;
	color: white;
}
.toolbar-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
</style>
