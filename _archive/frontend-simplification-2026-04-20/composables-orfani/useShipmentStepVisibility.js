// useShipmentStepVisibility — Intersection observer + scroll listeners per
// rilevare se il blocco stepsRef (progress visuale) è ancora visibile.
// Quando non lo è, il summary laterale mostra i mini-step.
import type { Ref } from 'vue';

interface StepVisibilityDeps {
	stepsRef: Ref<HTMLElement | null>;
	status: Ref<string>;
}

/**
 * Traccia la visibilità dello stepsRef. Espone stepsVisible e init/teardown.
 * Il consumer chiama initStepsVisibilityObserver dopo onMounted.
 */
export const useShipmentStepVisibility = ({ stepsRef, status }: StepVisibilityDeps) => {
	const stepsVisible = ref<boolean>(true);
	let stepsObserver: IntersectionObserver | null = null;
	let stepsVisibilityRaf: number | null = null;

	const updateStepsVisibility = (): void => {
		if (!process.client || !stepsRef.value) return;
		const rect = stepsRef.value.getBoundingClientRect();
		const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
		const visibleTop = Math.max(rect.top, 0);
		const visibleBottom = Math.min(rect.bottom, viewportHeight);
		const visibleHeight = Math.max(0, visibleBottom - visibleTop);
		const visibleRatio = rect.height > 0 ? visibleHeight / rect.height : 0;
		const isClearlyVisible = rect.bottom > 0 && rect.top < viewportHeight && visibleRatio >= 0.55;
		stepsVisible.value = isClearlyVisible;
	};

	const scheduleStepsVisibilityUpdate = (): void => {
		if (!process.client) return;
		if (stepsVisibilityRaf) cancelAnimationFrame(stepsVisibilityRaf);
		stepsVisibilityRaf = requestAnimationFrame(() => {
			updateStepsVisibility();
			stepsVisibilityRaf = null;
		});
	};

	const teardownStepsVisibilityObserver = (): void => {
		if (!process.client) return;
		window.removeEventListener('scroll', scheduleStepsVisibilityUpdate);
		window.removeEventListener('resize', scheduleStepsVisibilityUpdate);
		if (stepsVisibilityRaf) {
			cancelAnimationFrame(stepsVisibilityRaf);
			stepsVisibilityRaf = null;
		}
		if (stepsObserver) {
			stepsObserver.disconnect();
			stepsObserver = null;
		}
	};

	const initStepsVisibilityObserver = (): void => {
		if (!process.client || !stepsRef.value) return;
		teardownStepsVisibilityObserver();

		if ('IntersectionObserver' in window) {
			stepsObserver = new IntersectionObserver(
				() => {
					scheduleStepsVisibilityUpdate();
				},
				{
					root: null,
					threshold: [0, 0.2, 0.4, 0.55, 0.75, 1],
					rootMargin: '0px',
				},
			);
			stepsObserver.observe(stepsRef.value);
		}

		window.addEventListener('scroll', scheduleStepsVisibilityUpdate, { passive: true });
		window.addEventListener('resize', scheduleStepsVisibilityUpdate);
		scheduleStepsVisibilityUpdate();
	};

	watch(
		() => stepsRef.value,
		(el) => {
			if (!process.client || !el) return;
			nextTick(() => initStepsVisibilityObserver());
		},
		{ flush: 'post' },
	);

	watch(
		() => status.value,
		(newStatus) => {
			if (!process.client || newStatus === 'pending') return;
			nextTick(() => initStepsVisibilityObserver());
		},
	);

	onMounted(() => {
		nextTick(() => initStepsVisibilityObserver());
	});

	onBeforeUnmount(() => {
		teardownStepsVisibilityObserver();
	});

	return {
		stepsVisible,
		scheduleStepsVisibilityUpdate,
		initStepsVisibilityObserver,
		teardownStepsVisibilityObserver,
	};
};

/** Animazioni accordion height:0 <-> height:auto. Usate nelle transizioni summary. */
export const useAccordionHeightTransitions = () => {
	const onAccordionEnter = (el: HTMLElement): void => {
		el.style.height = '0';
		el.style.overflow = 'hidden';
	};

	const onAccordionAfterEnter = (el: HTMLElement): void => {
		el.style.height = 'auto';
		el.style.overflow = 'visible';
	};

	const onAccordionLeave = (el: HTMLElement): void => {
		el.style.height = `${el.scrollHeight}px`;
		el.style.overflow = 'hidden';
		requestAnimationFrame(() => {
			el.style.height = '0';
		});
	};

	return { onAccordionEnter, onAccordionAfterEnter, onAccordionLeave };
};
