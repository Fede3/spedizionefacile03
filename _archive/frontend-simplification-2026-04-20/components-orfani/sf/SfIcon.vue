<script setup lang="ts">
import { computed } from 'vue';

type Size = 'micro' | 'small' | 'medium' | 'large' | 'xlarge';

interface Props {
	name?: string;
	size?: Size;
	ariaLabel?: string;
	color?: string;
}

const props = withDefaults(defineProps<Props>(), {
	name: '',
	size: 'small',
	ariaLabel: '',
	color: '',
});

const classes = computed(() => ['sf-icon', `sf-icon--${props.size}`]);
const style = computed(() => (props.color ? { color: props.color } : undefined));
const decorative = computed(() => !props.ariaLabel);
</script>

<template>
	<span
		:class="classes"
		:style="style"
		:aria-hidden="decorative || undefined"
		:aria-label="ariaLabel || undefined"
		:role="!decorative ? 'img' : undefined"
	>
		<slot>
			<UIcon v-if="name" :name="name" class="sf-icon__svg" />
		</slot>
	</span>
</template>

<style scoped>
.sf-icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sf-icon__svg, .sf-icon :deep(svg) { width: 100%; height: 100%; }
.sf-icon--micro { width: var(--icon-micro); height: var(--icon-micro); }
.sf-icon--small { width: var(--icon-small); height: var(--icon-small); }
.sf-icon--medium { width: var(--icon-medium); height: var(--icon-medium); }
.sf-icon--large { width: var(--icon-large); height: var(--icon-large); }
.sf-icon--xlarge { width: var(--icon-xlarge); height: var(--icon-xlarge); }
</style>
