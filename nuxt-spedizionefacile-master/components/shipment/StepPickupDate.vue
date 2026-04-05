<script setup>
const props = defineProps({
	dateError: { type: String, default: null },
	daysInMonth: { type: Array, required: true },
	services: { type: Object, required: true },
});

const emit = defineEmits(['choose-date']);

const isSelectedDay = (day) => props.services.date === day.formattedDate;
const trackRef = ref(null);
const showTrackNav = computed(() => props.daysInMonth.length > 6);

const scrollTrack = (direction) => {
	trackRef.value?.scrollBy?.({
		left: direction * 288,
		behavior: 'smooth',
	});
};
</script>

<template>
	<div class="scroll-mt-[88px] w-full">
		<div v-if="dateError" data-pickup-date-alert class="mb-[12px] ux-alert ux-alert--soft" role="alert" aria-live="polite">
			<div class="flex items-start gap-[10px]">
				<svg xmlns="http://www.w3.org/2000/svg" class="ux-alert__icon mt-[1px]" viewBox="0 0 24 24">
					<path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2z" />
					<path fill="currentColor" d="M1 21h22L12 2z" />
				</svg>
				<div class="min-w-0">
					<p class="text-[0.9375rem] font-bold leading-[1.2] text-[var(--color-brand-text)]">Scegli il ritiro</p>
					<p class="mt-[4px] text-[0.875rem] leading-[1.45] text-[#52606D]">{{ dateError }}</p>
				</div>
			</div>
		</div>

		<div class="pickup-date-card flow-section-shell sf-section-block">
			<div class="pickup-date-card__header sf-section-block__header">
				<div class="pickup-date-card__title-stack">
					<h2 class="pickup-date-card__heading sf-section-title">Ritiro</h2>
					<p class="pickup-date-card__text flow-section-header__text">
						Seleziona il primo giorno utile per il passaggio del corriere, nello stesso flusso di servizi e indirizzi.
					</p>
				</div>
				<div class="pickup-date-card__header-tools">
					<span class="sf-section-chip">Calendario</span>
					<div v-if="showTrackNav" class="pickup-date-card__nav" aria-label="Scorri i giorni disponibili">
						<button type="button" class="pickup-date-card__nav-button" @click="scrollTrack(-1)">
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.2"
								stroke-linecap="round"
								stroke-linejoin="round">
								<path d="m15 18-6-6 6-6" />
							</svg>
						</button>
						<button type="button" class="pickup-date-card__nav-button" @click="scrollTrack(1)">
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.2"
								stroke-linecap="round"
								stroke-linejoin="round">
								<path d="m9 18 6-6-6-6" />
							</svg>
						</button>
					</div>
				</div>
			</div>

			<div class="pickup-date-slider-shell sf-section-block__body rounded-[14px] border border-[#E4ECEF] bg-[#F4F7F9] p-[8px]">
				<div class="pickup-date-slider-track px-[2px]">
					<div ref="trackRef" class="pickup-date-track" aria-label="Giorni disponibili per il ritiro">
						<div class="pickup-date-track__list">
							<button
								v-for="(day, dayIndex) in props.daysInMonth"
								:key="day.date.toISOString()"
								type="button"
								:id="`date-${day.formattedDate}`"
								:data-pickup-day="day.formattedDate"
								class="pickup-date-option"
								:class="{
									'is-selected': isSelectedDay(day),
									'is-available': !isSelectedDay(day),
								}"
								:aria-pressed="isSelectedDay(day) ? 'true' : 'false'"
								:aria-label="`Seleziona ${day.weekday} ${day.dayNumber} ${day.monthAbbr}`"
								@click="emit('choose-date', day)">
								<span class="pickup-date-option__weekday">
									{{ day.weekday }}
								</span>
								<div class="pickup-date-option__body">
									<span class="pickup-date-option__day">{{ day.dayNumber }}</span>
									<span class="pickup-date-option__month">{{ day.monthAbbr }}</span>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
