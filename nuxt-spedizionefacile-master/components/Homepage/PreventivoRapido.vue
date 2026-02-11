<script setup>
const currentStep = ref(1);

const steps = ["Seleziona Posizione", "Seleziona Dimensioni", "Conferma"];

const newAddress = ref({
	name: "",
	address: "",
	city: "",
	postal_code: "",
	province_name: "",
});

const newAddress2 = ref({
	name: "",
	address: "",
	city: "",
	postal_code: "",
	province_name: "",
});
</script>

<template>
	<section>
		<div class="my-container desktop:px-[60px] desktop-xl:px-0">
			<div
				class="bg-white w-full rounded-[24px] desktop-xl:rounded-[32px] relative z-3 mt-[-132px] p-[24px_20px] desktop:p-[40px] tablet:p-[24px_50px] tablet:mt-[-220px] desktop:mt-[-185px] desktop-xl:mt-[-70px]">
				<div class="border-b-[1px] border-[#E6E6E6] h-[58px] desktop:h-[65px] desktop-xl:h-[76px] flex items-start justify-between">
					<span class="text-[1.5rem] desktop:text-[1.875rem] desktop-xl:text-[2rem] text-black font-medium">Preventivo Rapido</span>

					<div class="desktop-xl:items-center hidden desktop-xl:flex">
						<div
							v-for="(step, index) in steps"
							:key="index"
							class="flex items-center after:content-[''] after:h-[1px] after:bg-[url('/img/border-dashed-img.png')] after:bg-repeat-x after:min-w-[32px] last:after:hidden">
							<p
								class="h-[44px] px-[10px] leading-[44px] rounded-[49px] text-[1.125rem] tracking-[-0.432px]"
								:class="[currentStep === index + 1 ? 'bg-[#E44203] text-white' : 'bg-[#F2F2F2] text-black']">
								<span
									class="text-[0.8125rem] w-[24px] h-[24px] rounded-[24px] inline-block text-center leading-[24px] mr-[3px]"
									:class="[currentStep === index + 1 ? 'bg-white text-[#E44203]' : 'bg-[#D9D9D9] text-black']">
									{{ index + 1 }}
								</span>
								{{ step }}
							</p>

							<!-- <div class="w-[32px] h-[1px] border-b-[1px] border-[#C5C5C5] border-dashed" v-if="index !== 2"></div> -->
						</div>
					</div>
				</div>

				<form
					action=""
					class="flex items-start flex-wrap tablet:justify-center desktop-xl:justify-between tablet:gap-x-[20px] gap-y-[24px] tablet:gap-y-[20px] desktop:gap-y-[36px] desktop-xl:gap-y-0 desktop:pt-[71px] desktop-xl:pt-[60px] pt-[46px]">
					<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
						<label for="" class="label-preventivo-rapido">Ritiro in</label>
						<input type="text" name="" id="" placeholder="Nazionalità" class="input-preventivo-rapido" required />
					</div>

					<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
						<label for="" class="label-preventivo-rapido">CAP di Ritiro</label>
						<input type="text" name="" id="" placeholder="CAP" class="input-preventivo-rapido" required />
					</div>

					<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
						<label for="" class="label-preventivo-rapido">Consegna in</label>
						<input type="text" name="" id="" placeholder="Nazionalità" class="input-preventivo-rapido" required />
					</div>

					<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
						<label for="" class="label-preventivo-rapido">CAP Consegna</label>
						<input type="text" name="" id="" placeholder="CAP" class="input-preventivo-rapido" required />
					</div>

					<div class="w-full tablet:w-[30%] desktop:w-full desktop-xl:w-[200px]">
						<label for="" class="label-preventivo-rapido">Data spedizione</label>
						<input type="date" name="" id="" class="input-preventivo-rapido uppercase" required />
					</div>

					<button class="bg-[#E44203] w-full h-[60px] text-white text-[1.25rem] font-semibold text-center mt-[32px] desktop-xl:mt-[36px] rounded-[50px] desktop:mt-0 cursor-pointer tracking-[-0.48px]">
						<span class="after:bg-[url('/img/arrow-down.svg')] after:bg-no-repeat after:bg-right after:inline-block after:size-[16px] after:ml-[11px] after:align-[-1px]">Continua</span>
						<!-- <Icon name="tabler:circle-arrow-right-filled" class="ml-[11px]" /> -->
						<!-- <NuxtImg src="" aria-hidden="true" width="16" height="16" alt="" class="size-[16px]" /> -->
					</button>
				</form>
			</div>
		</div>
	</section>
</template>
