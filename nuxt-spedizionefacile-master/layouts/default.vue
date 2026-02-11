<template>
	<div class="w-full min-h-screen flex flex-col overflow-x-clip">
		<Header />

		<main class="flex-1 w-full max-w-full mx-auto">
			<slot />
		</main>

		<Footer />
	</div>
</template>
