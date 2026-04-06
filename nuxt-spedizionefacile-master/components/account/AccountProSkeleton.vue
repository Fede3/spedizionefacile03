<!-- Skeleton loader per la pagina Account Pro -->
<template>
	<div class="my-container space-y-[18px] tablet:space-y-[22px]">
		<div class="rounded-[20px] border border-[#E3EBF0] bg-white px-[18px] py-[18px] shadow-[0_12px_30px_rgba(9,88,102,0.06)] tablet:px-[20px] tablet:py-[24px] desktop:px-[24px] desktop:py-[24px]">
			<div class="flex flex-col gap-[10px]">
				<div class="h-[12px] w-[140px] rounded-full bg-[#EEF3F7] animate-pulse"></div>
				<div class="h-[32px] w-[220px] rounded-[20px] bg-[#EEF3F7] animate-pulse"></div>
				<div class="h-[16px] w-full max-w-[560px] rounded-[20px] bg-[#F2F5F8] animate-pulse"></div>
			</div>
		</div>
		<div class="grid grid-cols-1 desktop:grid-cols-[minmax(0,1fr)_320px] gap-[16px] desktop:gap-[16px]">
			<div class="rounded-[20px] border border-[var(--color-brand-border)] bg-white p-[18px] tablet:p-[20px] desktop:p-[28px]">
				<div class="space-y-[12px]">
					<div class="h-[22px] w-[180px] rounded-[20px] bg-[#EEF3F7] animate-pulse"></div>
					<div class="h-[16px] w-full rounded-[20px] bg-[#F2F5F8] animate-pulse"></div>
					<div class="h-[16px] w-[82%] rounded-[20px] bg-[#F2F5F8] animate-pulse"></div>
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-[10px] pt-[8px]">
						<div v-for="index in 3" :key="`skel-${index}`" class="h-[88px] rounded-[20px] bg-[#F7FAFC] border border-[var(--color-brand-border)] animate-pulse"></div>
					</div>
				</div>
			</div>
			<div class="rounded-[20px] border border-[var(--color-brand-border)] bg-white p-[18px] tablet:p-[20px] desktop:p-[28px]">
				<div class="space-y-[12px]">
					<div class="h-[22px] w-[160px] rounded-[20px] bg-[#EEF3F7] animate-pulse"></div>
					<div class="h-[16px] w-[90%] rounded-[20px] bg-[#F2F5F8] animate-pulse"></div>
					<div class="h-[52px] rounded-[20px] bg-[#F7FAFC] border border-[var(--color-brand-border)] animate-pulse"></div>
					<div class="h-[52px] rounded-[20px] bg-[#F7FAFC] border border-[var(--color-brand-border)] animate-pulse"></div>
					<div class="h-[52px] rounded-[20px] bg-[#F7FAFC] border border-[var(--color-brand-border)] animate-pulse"></div>
				</div>
			</div>
		</div>
	</div>
</template>
