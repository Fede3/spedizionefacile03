# Call Sites Rimossi — Bonus / Programma Fedeltà

## 1. `components/account/AccountDashboardClient.vue`

### Prop rimossa da `defineProps`

```ts
bonusPage: { type: Object, default: null },
```

### Blocco rimosso da `<template>` (righe ~199-218)

```vue
<NuxtLink
    v-if="bonusPage"
    :to="resolveAccountPageUrl(bonusPage.url)"
    class="sf-account-root__bonus-cta sf-animate-in sf-animate-in-4">
    <div class="sf-account-root__bonus-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-[18px] w-[18px]" v-html="accountCardIcons['share-variant']" />
    </div>

    <div class="min-w-0 flex-1">
        <p class="sf-account-root__bonus-title">Invita un amico, attiva i bonus del tuo account</p>
        <p class="sf-account-root__bonus-meta">Codici promo, inviti e vantaggi restano raccolti in una CTA unica, piu coerente con il prototipo cliente.</p>
    </div>

    <span class="sf-account-root__bonus-link">
        Apri bonus
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6" />
        </svg>
    </span>
</NuxtLink>
```

Lo `<style>` con `.sf-account-root__bonus-*` viene lasciato perché innocuo ma può
essere rimosso (ricerca `bonus-` in file per trovarli).

## 2. `composables/useAccountDashboard.ts`

### Computed rimossa (riga ~77)

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bonusPage = computed(() => allVisiblePages.value.find((page: any) => page.url === '/bonus') || null);
```

### Export rimosso dall'oggetto return

```ts
bonusPage,
```

## 3. `pages/account/index.vue`

### Destructure rimossa da `useAccountDashboard()`

```ts
bonusPage,
```

### Prop rimossa dal tag `<AccountDashboardClient>`

```vue
:bonus-page="bonusPage"
```

## 4. `utils/accountNavigationGroups.ts`

### Entry rimosse

```ts
// In clientNavGroups.items (ultima entry):
{ label: 'Bonus', to: '/account/bonus', iconKey: 'tag-multiple' },

// In proNavGroups['Strumenti Pro'].items (dopo 'Partner Pro'):
{ label: 'Bonus', to: '/account/bonus', iconKey: 'tag-multiple' },
```

## 5. `utils/accountNavigation.ts`

### Entry rimossa da `createAccountSections > 'Partner Pro'.pages`

```ts
{
    title: 'Bonus',
    description: 'Inviti, wallet e vantaggi attivi.',
    url: '/bonus',
    visible: true,
    iconKey: 'tag-multiple',
    iconBg: '#FFF4EE',
    iconColor: '#E44203',
    iconBorder: 'rgba(228, 66, 3, 0.14)',
},
```

## 6. `pages/account/wallet.vue`

### Link rimosso (riga ~392)

```vue
<NuxtLink to="/account/bonus" class="btn-secondary btn-sm">
    Dettagli
</NuxtLink>
```

## 7. `tests/e2e/account.spec.ts`

### Entry rimosse

```ts
// Riga ~25 (array auth-gate):
['T6.8', '/account/bonus', 'bonus richiede autenticazione'],

// Test ~127-132:
test('T6.8.1 - bonus/referral visibile', async ({ page }) => {
    await page.goto('/account/bonus');
    // Login prima...
    const main = page.locator('main');
    await expect(main.getByRole('heading', { name: /bonus e promozioni/i })).toBeVisible();
});
```

## 8. `tests/e2e/referral.spec.ts`

### Test rimosso

```ts
test('Bonus/referral richiede autenticazione', async ({ page }) => {
    await page.goto('/account/bonus');
    // expect redirect to login...
});
```

## 9. `tests/e2e/pages/AccountPage.ts`

### Metodo rimosso

```ts
async gotoBonus(): Promise<void> {
    await this.page.goto('/account/bonus');
}
```
