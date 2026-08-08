import { chromium } from 'patchright';

export async function withPatchrightPage(fn) {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      locale: 'pt-BR',
      viewport: { width: 1366, height: 768 },
    });

    const page = await context.newPage();

    return await fn(page);
  } finally {
    await browser.close();
  }
}
