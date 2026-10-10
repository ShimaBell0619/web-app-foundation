import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

let errors = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
});
test.afterEach(() => { expect(errors, 'ブラウザエラーがない').toEqual([]); });

for (const width of [320, 390, 1440]) {
  test(`${width}pxで入力・更新・リセット・表示を確認`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Webアプリのスターター', exact: true })).toBeVisible();
    const input = page.getByRole('spinbutton', { name: '数値', exact: true });
    const update = page.getByRole('button', { name: '更新', exact: true });
    const reset = page.getByRole('button', { name: 'リセット', exact: true });
    const status = page.getByRole('status');
    await expect(status).toHaveText('2倍の値：6');
    if (width === 390) {
      await page.keyboard.press('Tab');
      await expect(input).toBeFocused();
      await input.fill('12345678');
      await page.keyboard.press('Tab');
      await expect(update).toBeFocused();
      await expect(update).toHaveCSS('outline-style', 'solid');
      await expect(update).toHaveCSS('outline-width', '3px');
      await page.keyboard.press('Enter');
      // Reactの描画完了を条件で待つ。即値比較や固定sleepに依存しない。
      await expect(status).toHaveText('2倍の値：24691356');
      await page.keyboard.press('Tab');
      await expect(reset).toBeFocused();
      await page.keyboard.press('Space');
    } else {
      await input.fill('12345678');
      await update.click();
      await expect(status).toHaveText('2倍の値：24691356');
      await reset.click();
    }
    await expect(input).toHaveValue('3');
    await expect(status).toHaveText('2倍の値：6');
    await expect(update).toBeInViewport();
    await expect(reset).toBeInViewport();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath(`viewport-${width}.png`), fullPage: true });
    writeFileSync(info.outputPath('evidence.json'), JSON.stringify({ width, checkoutSha: process.env.GITHUB_SHA || 'ローカル（実行記録を参照）', runId: process.env.GITHUB_RUN_ID || null }, null, 2));
  });
}
