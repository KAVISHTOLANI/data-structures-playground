import { expect, test } from '@playwright/test';
import { checkMobile, snap } from './helpers';

test('operate each structure', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Push it, pop it');
  await expect(page.locator('.hero .tree')).toBeVisible();
  await page.waitForTimeout(1400);
  await snap(page, 'landing');
  await checkMobile(page, 'landing-mobile');

  await page.getByRole('link', { name: 'Grow a search tree' }).click();
  for (const k of ['45', '25']) { await page.getByLabel('Key', { exact: true }).fill(k); await page.getByRole('button', { name: 'Insert' }).click(); }
  await page.getByLabel('Key', { exact: true }).fill('45');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByTestId('message')).toContainText('Found 45');
  await page.waitForTimeout(1200);
  await snap(page, 'bst');
  await checkMobile(page);
  await page.reload();
  await page.getByLabel('Traversal order').selectOption('level');
  await page.getByRole('button', { name: 'Play traversal' }).click();
  await expect(page.getByTestId('traversal')).toContainText('45');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Heap' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('heap');
  await page.getByLabel('Value', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Insert' }).click();
  await page.waitForTimeout(900);
  await snap(page, 'heap');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Linked list' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('linked list');
  await page.getByLabel('Value', { exact: true }).fill('99');
  await page.getByRole('button', { name: 'Append' }).click();
  await expect(page.getByTestId('message')).toContainText('linked in 99');
  await snap(page, 'list');
  await checkMobile(page, 'list-mobile');
});
