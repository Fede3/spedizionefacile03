<script setup>
const steps = ["Misure", "Servizi", "Ritiro", "Pagamento"];

const route = useRoute();

const userStore = useUserStore();
</script>

<template>
	<ul class="flex justify-center gap-x-[125px] desktop-xl:my-[88px] text-[1.125rem] text-[#737373] tracking-[-0.252px] h-[53px]" id="preventivo">
		<li
			v-for="(step, index) in steps"
			:key="index"
			class="h-full leading-[53px]"
			:class="{ 'bg-[#E44203] text-white px-[32px] rounded-[38px]': route.fullPath.includes(index + 1) || (route.name === 'index' && index === 0) }">
			{{ index + 1 }}. {{ step }}
		</li>
	</ul>
</template>
