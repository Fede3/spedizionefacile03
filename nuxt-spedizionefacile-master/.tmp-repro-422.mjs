import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = 'http://127.0.0.1:8787';
const outDir = 'C:/Users/Feder/Desktop/spedizionefacile/_LOG/runtime-422';
await fs.mkdir(outDir, { recursive: true });

const logs = {
  steps: [],
  requests: [],
  console: [],
  pageErrors: [],
  final: {},
};

const stamp = () => new Date().toISOString();
const pushStep = (label, extra = {}) => logs.steps.push({ at: stamp(), label, ...extra });
const interesting = (url) => [
  '/sanctum/csrf-cookie',
  '/api/custom-login',
  '/api/user',
  '/api/create-direct-order',
  '/api/orders/',
  '/api/stripe/existing-order-payment-intent',
  '/api/stripe/existing-order-payment',
  '/api/stripe/existing-order-paid',
  '/api/stripe/mark-order-completed'
].some((part) => url.includes(part));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
const page = await context.newPage();

page.on('console', (msg) => {
  logs.console.push({ at: stamp(), type: msg.type(), text: msg.text() });
});
page.on('pageerror', (err) => {
  logs.pageErrors.push({ at: stamp(), message: err.message, stack: err.stack });
});
page.on('response', async (response) => {
  const url = response.url();
  if (!interesting(url)) return;
  const request = response.request();
  let body = null;
  try {
    const text = await response.text();
    body = text.length > 4000 ? `${text.slice(0, 4000)}...<truncated>` : text;
  } catch {}
  logs.requests.push({
    at: stamp(),
    method: request.method(),
    url,
    status: response.status(),
    requestBody: request.postData() || null,
    responseBody: body,
  });
});

async function screenshot(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

async function maybeAcceptCookies() {
  const btn = page.getByRole('button', { name: /Accetta tutti/i });
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function loginCustomer() {
  pushStep('login:start');
  await page.goto(`${baseURL}/?auth_modal=login&redirect=/preventivo`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await maybeAcceptCookies();
  const email = page.locator('#auth-modal-email');
  if (await email.isVisible().catch(() => false)) {
    await email.fill('cliente@spediamofacile.it');
    await page.locator('#auth-modal-password').fill('Cliente2026!');
    await page.locator('#auth-modal-password').locator('xpath=ancestor::form').getByRole('button', { name: /^Accedi$/ }).click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  }
  pushStep('login:done', { url: page.url() });
}

async function fillLocationField(selector, value) {
  const input = page.locator(selector);
  await input.waitFor({ state: 'visible', timeout: 20000 });
  await input.fill(value);
  await page.waitForTimeout(1200);
  const suggestions = page.locator('ul[role="listbox"] li[role="option"]');
  const hasSuggestions = await suggestions.first().isVisible({ timeout: 2000 }).catch(() => false);
  if (hasSuggestions) {
    await suggestions.first().click();
  } else {
    await input.press('ArrowDown').catch(() => {});
    await input.press('Enter').catch(() => {});
  }
  await input.blur();
  await page.waitForTimeout(300);
}

async function startFromHomeQuickQuote() {
  pushStep('home:start');
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await maybeAcceptCookies();
  await fillLocationField('#origin_city', 'Roma');
  await fillLocationField('#destination_city', 'Milano');
  await page.getByRole('button', { name: /^Pacco$/ }).first().click();
  await page.waitForTimeout(300);
  await page.locator('#weight_0').fill('5');
  await page.locator('#first_size_0').fill('30');
  await page.locator('#second_size_0').fill('20');
  await page.locator('#third_size_0').fill('15');
  await screenshot('01-home-ready.png');
  const cta = page.getByRole('button', { name: /Calcola il prezzo|Calcola e scegli servizio|Vai ai servizi|Continua/i }).first();
  await cta.click();
  await page.waitForURL(/\/la-tua-spedizione\/2/, { timeout: 30000 });
  pushStep('home:advanced', { url: page.url() });
  await screenshot('02-after-home-cta.png');
}

async function completeServicesStep() {
  pushStep('services:start', { url: page.url() });
  await page.locator('#content_description').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#content_description').fill('Documenti e accessori');
  const pickupDay = page.locator('[data-pickup-day]').first();
  if (await pickupDay.isVisible().catch(() => false)) {
    await pickupDay.click();
  }
  await page.getByRole('button', { name: /^Conferma servizi$/i }).click();
  await page.waitForTimeout(1200);
  await screenshot('03-after-services-confirm.png');
  pushStep('services:done', { url: page.url() });
}

async function completeAddressesStep() {
  pushStep('addresses:start', { url: page.url() });
  const originCard = page.locator('.address-entry-card').first();
  const destCard = page.locator('.address-entry-card').nth(1);
  await originCard.locator('#first_name').fill('Mario');
  await originCard.locator('#last_name').fill('Rossi');
  await originCard.locator('#telephone').fill('3331234567');
  await originCard.locator('#address').fill('Via Appia');
  await originCard.locator('#address_number').fill('12');
  await originCard.locator('#city').fill('Roma');
  await originCard.locator('#province').fill('RM');
  await originCard.locator('#postal_code').fill('00118');
  await originCard.locator('#email').fill('mario.rossi@example.com');

  await destCard.locator('#dest_first_name').fill('Giulia');
  await destCard.locator('#dest_last_name').fill('Bianchi');
  await destCard.locator('#dest_telephone').fill('3339876543');
  await destCard.locator('#dest_address').fill('Via Torino');
  await destCard.locator('#dest_address_number').fill('7');
  await destCard.locator('#dest_city').fill('Milano');
  await destCard.locator('#dest_province').fill('MI');
  await destCard.locator('#dest_postal_code').fill('20121');
  await destCard.locator('#dest_email').fill('giulia.bianchi@example.com');
  await destCard.locator('#dest_postal_code').blur();
  await page.waitForTimeout(400);
  await screenshot('04-addresses-filled.png');
  await page.getByRole('button', { name: /^Conferma indirizzi$/i }).click();
  await page.waitForTimeout(2500);
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  pushStep('addresses:done', { url: page.url() });
  await screenshot('05-after-addresses-confirm.png');
}

async function fetchOrder(orderId) {
  return await page.evaluate(async (oid) => {
    const res = await fetch(`/api/orders/${oid}`, { headers: { Accept: 'application/json' }, credentials: 'include' });
    const text = await res.text();
    return { status: res.status, text };
  }, orderId);
}

async function triggerPaymentIntent() {
  pushStep('payment:start', { url: page.url() });
  const currentUrl = new URL(page.url());
  const orderId = currentUrl.searchParams.get('order_id');
  logs.final.orderIdFromUrl = orderId;
  if (orderId) {
    logs.final.orderFetchBefore = await fetchOrder(orderId);
  }
  await maybeAcceptCookies();
  const terms = page.locator('input[type="checkbox"]').first();
  if (await terms.isVisible().catch(() => false)) {
    const checked = await terms.isChecked().catch(() => false);
    if (!checked) {
      await terms.check({ force: true }).catch(async () => { await terms.click({ force: true }).catch(() => {}); });
    }
  }

  const cardBox = page.getByText(/^Carta$/).first();
  if (await cardBox.isVisible().catch(() => false)) {
    await cardBox.click({ force: true }).catch(() => {});
  }

  const frames = page.locator('iframe');
  const frameCount = await frames.count();
  logs.final.iframeCountAtPayment = frameCount;
  for (let i = 0; i < frameCount; i++) {
    const handle = await frames.nth(i).elementHandle();
    const frame = await handle?.contentFrame();
    if (!frame) continue;
    const cardNumber = frame.locator('input[name="cardnumber"]');
    if (await cardNumber.count()) {
      await cardNumber.fill('4242424242424242').catch(() => {});
      await frame.locator('input[name="exp-date"]').fill('1234').catch(() => {});
      await frame.locator('input[name="cvc"]').fill('123').catch(() => {});
      break;
    }
  }
  await page.waitForTimeout(1000);
  await screenshot('06-payment-before-submit.png');
  const payButton = page.getByRole('button', { name: /Paga|Conferma ordine/i }).last();
  await payButton.click({ force: true }).catch(async () => {
    await page.locator('button').filter({ hasText: /Paga|Conferma ordine/i }).last().click({ force: true });
  });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  if (orderId) {
    logs.final.orderFetchAfter = await fetchOrder(orderId);
  }
  await screenshot('07-payment-after-submit.png');
  pushStep('payment:after-submit', { url: page.url() });
}

async function runHomeFlow() {
  await loginCustomer();
  await startFromHomeQuickQuote();
  await completeServicesStep();
  await completeAddressesStep();
  await triggerPaymentIntent();
}

try {
  await runHomeFlow();
} catch (error) {
  logs.final.error = { message: String(error?.message || error), stack: error?.stack || null, url: page.url() };
  await screenshot('99-error.png').catch(() => {});
} finally {
  logs.final.url = page.url();
  await fs.writeFile(path.join(outDir, 'runtime-log.json'), JSON.stringify(logs, null, 2));
  await context.storageState({ path: path.join(outDir, 'customer-runtime-state.json') }).catch(() => {});
  await browser.close();
}
