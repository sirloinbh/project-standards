import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the overview page loads, reaches the API and has no accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '개요' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('서버 정상');
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations).toEqual([]);
});

test('the overview page fits a 360px wide phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(360);
});
