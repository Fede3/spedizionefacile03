<script setup>
defineProps({
	eyebrow: { type: String, default: '' },
	title: { type: String, default: '' },
	titleId: { type: String, default: '' },
	subtitle: { type: String, default: '' },
	align: { type: String, default: 'center' },
});
</script>

<template>
	<header class="section-head" :class="{ 'section-head--left': align === 'left' }">
		<p v-if="eyebrow" class="section-head__eyebrow">{{ eyebrow }}</p>
		<h2 v-if="title" :id="titleId" class="section-head__title">{{ title }}</h2>
		<p v-if="subtitle" class="section-head__sub">{{ subtitle }}</p>
	</header>
</template>

<style scoped>
.section-head {
	max-width: 720px;
	margin: 0 auto 18px;
	text-align: center;
}
@media (min-width: 768px) { .section-head { margin: 0 auto 36px; } }

.section-head--left { margin-inline: 0; text-align: left; }
.section-head__eyebrow {
	margin: 0 0 4px;
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #E44203;
}
@media (min-width: 768px) { .section-head__eyebrow { margin: 0 0 8px; font-size: 13px; } }

.section-head__title {
	margin: 0;
	font-size: 22px;
	line-height: 1.2;
	font-weight: 700;
	color: #0d3a44;
	letter-spacing: -0.01em;
}
@media (min-width: 768px) { .section-head__title { font-size: 34px; } }

.section-head__sub {
	margin: 6px 0 0;
	font-size: 13px;
	line-height: 1.45;
	color: #475559;
}
@media (min-width: 768px) { .section-head__sub { margin: 12px 0 0; font-size: 16px; line-height: 1.55; } }
</style>
