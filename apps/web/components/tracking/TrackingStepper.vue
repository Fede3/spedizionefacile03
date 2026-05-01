<!-- COMPONENTE: TrackingStepper (tracking/TrackingStepper.vue) -->
<script setup>
const props = defineProps({
	steps: {
		type: Array,
		required: true,
	},
	currentIndex: {
		type: Number,
		default: -1,
	},
	alternateEnd: {
		type: Object,
		default: null,
	},
});

const isDone = (idx) => idx < props.currentIndex;
const isCurrent = (idx) => idx === props.currentIndex && !props.alternateEnd;
const isFuture = (idx) => idx > props.currentIndex;
</script>

<template>
	<div class="tracking-stepper">
		<!-- Stato alternativo (es. resa, rifiutata, annullata) -->
		<div
			v-if="alternateEnd"
			class="mb-[14px] inline-flex items-center gap-[8px] rounded-full px-[14px] py-[6px] text-[12px]"
			:class="alternateEnd.type === 'refused' ? 'bg-[#fdecec] text-[#b3261e] ring-[1.5px] ring-[#f1b4b4]' : 'bg-[#fff1ea] text-[#E44203] ring-[1.5px] ring-[#f5c8b1]'"
			style="font-weight:700"
			role="status"
			aria-live="polite"
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<span>{{ alternateEnd.label }}</span>
		</div>

		<!-- Stepper -->
		<div
			class="overflow-x-auto md:overflow-visible -mx-[12px] px-[12px] md:mx-0 md:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
			role="list"
			aria-label="Avanzamento spedizione"
		>
			<ol class="flex items-start gap-0 min-w-max md:min-w-0 md:w-full">
				<li
					v-for="(step, idx) in steps"
					:key="step.key"
					class="flex items-start"
					:class="idx < steps.length - 1 ? 'flex-1 min-w-[120px] md:min-w-0' : 'min-w-[120px] md:min-w-0'"
					role="listitem"
					:aria-current="isCurrent(idx) ? 'step' : undefined"
				>
					<!-- Cerchio + label -->
					<div class="flex flex-col items-center text-center w-[88px] md:w-auto md:flex-1 shrink-0">
						<div
							class="relative inline-flex items-center justify-center w-[36px] h-[36px] rounded-full transition-all duration-200"
							:class="{
								'bg-[#095866] text-white shadow-[0_2px_6px_rgba(9,88,102,0.25)]': isDone(idx),
								'bg-white text-[#095866] shadow-[inset_0_0_0_2.5px_#095866]': isCurrent(idx),
								'bg-white text-[#9aa3b1] shadow-[inset_0_0_0_1.5px_#DFE2E7]': isFuture(idx),
							}"
							:aria-label="`${step.label}: ${isDone(idx) ? 'completato' : isCurrent(idx) ? 'in corso' : 'in attesa'}`"
						>
							<!-- Done: check -->
							<svg
								v-if="isDone(idx)"
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="white"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<polyline points="20 6 9 17 4 12" />
							</svg>
							<!-- Current/Future: numero -->
							<span v-else class="text-[13px] leading-none [font-variant-numeric:tabular-nums]" style="font-weight:800">{{ idx + 1 }}</span>

							<!-- Pulse current -->
							<span
								v-if="isCurrent(idx)"
								class="absolute -inset-[4px] rounded-full ring-2 ring-[rgba(9,88,102,0.45)] pointer-events-none animate-[stepPulse_2s_ease-out_infinite] motion-reduce:animate-none motion-reduce:opacity-55"
								aria-hidden="true"/>
						</div>
						<span
							class="mt-[8px] text-[11px] md:text-[12px] leading-[1.3]"
							:class="{
								'text-[#1d2738]': isDone(idx) || isCurrent(idx),
								'text-[#7a8493]': isFuture(idx),
							}"
							style="font-weight:600"
						>
							{{ step.label }}
						</span>
					</div>

					<!-- Linea connettrice -->
					<div
						v-if="idx < steps.length - 1"
						class="h-[2px] rounded-[1px] mt-[16px] flex-1 mx-[4px] md:mx-[6px] min-w-[24px] transition-colors duration-300"
						:class="idx < currentIndex ? 'bg-[#095866]' : 'bg-[#DFE2E7]'"
						aria-hidden="true"
					/>
				</li>
			</ol>
		</div>
	</div>
</template>
