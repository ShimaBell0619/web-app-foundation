import { expect, test } from '@playwright/test';

// Copy this file into a consumer and adapt REVIEW_PATH plus product-specific
// selectors/assertions. It is an example, not a Foundation runtime test suite.
const REVIEW_PATH = process.env.UI_REVIEW_PATH ?? '/';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'narrow', width: 320, height: 800 },
];

for (const viewport of viewports) {
  test(`${viewport.name}: renders without unintended horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(REVIEW_PATH);

    const widths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));

    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  });
}

test('keyboard navigation reaches a visible focus target', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(REVIEW_PATH);

  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
  await expect(focused).toBeFocused();

  // Visible focus styling can legitimately use outline, shadow, border,
  // background, or another product-specific treatment. Add an assertion for
  // the consumer's approved DESIGN.md rule instead of enforcing one style here.
});

test('review-significant statuses include text, not color alone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(REVIEW_PATH);

  // Add data-review-status only to statuses whose meaning is important to the
  // reviewed flow. Remove or replace this example when the product has a more
  // appropriate semantic assertion.
  const statuses = page.locator('[data-review-status]');
  const count = await statuses.count();

  for (let index = 0; index < count; index += 1) {
    await expect(statuses.nth(index)).not.toHaveText(/^\s*$/);
  }
});
