import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('./')
})

async function openPopup(page: Page, openTestId: string): Promise<Page> {
  const popupPromise = page.waitForEvent('popup')
  await page.getByTestId(openTestId).click()
  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded')
  return popup
}

test('counter: events and state work across windows', async ({ page }) => {
  const popup = await openPopup(page, 'open-counter')

  await expect(popup.getByTestId('popup-count')).toHaveText('0')
  await popup.getByTestId('increment').click()
  await popup.getByTestId('increment').click()

  // The click in the popup updated state owned by the main window.
  await expect(popup.getByTestId('popup-count')).toHaveText('2')
  await expect(page.getByTestId('parent-count')).toHaveText('2')

  // Styles were copied — the button is not an unstyled default.
  const radius = await popup
    .getByTestId('increment')
    .evaluate((el) => getComputedStyle(el).borderRadius)
  expect(radius).toBe('6px')

  await page.getByTestId('close-counter').click()
  await expect.poll(() => popup.isClosed()).toBe(true)
})

test('data table: detaches into popup, TanStack Query context works, main hides table', async ({
  page,
}) => {
  await expect(page.getByTestId('people-table')).toBeVisible()

  const popup = await openPopup(page, 'open-table')

  // Main window hides the inline table and shows the note.
  await expect(page.getByTestId('table-detached-note')).toBeVisible()
  await expect(page.getByTestId('people-table')).toHaveCount(0)

  // The table renders in the popup with data from useQuery.
  await expect(popup.getByTestId('people-table')).toBeVisible()
  await expect(popup.getByTestId('people-table').locator('tbody tr')).toHaveCount(6)

  // Sorting (interaction inside the popup).
  await popup.locator('th', { hasText: 'Name' }).click() // toggle to descending
  await expect(popup.locator('tbody tr').first()).toContainText('Vera Holm')

  // Refetch goes through the QueryClientProvider mounted in the main window.
  await popup.getByRole('button', { name: /Refetch/ }).click()
  await expect(popup.getByRole('button', { name: /Refetch/ })).toBeEnabled()

  // Bring it back: popup closes, inline table returns.
  await page.getByTestId('bring-back').click()
  await expect(page.getByTestId('people-table')).toBeVisible()
  await expect.poll(() => popup.isClosed()).toBe(true)
})

test('closing the popup window itself restores the main window table', async ({ page }) => {
  const popup = await openPopup(page, 'open-table')
  await expect(page.getByTestId('table-detached-note')).toBeVisible()

  await popup.close()

  await expect(page.getByTestId('people-table')).toBeVisible()
  await expect(page.getByTestId('table-detached-note')).toHaveCount(0)
})

test('panels: popped-out results follow filters edited in the main window', async ({ page }) => {
  // Inline to start: the results table renders in the right panel.
  await expect(page.getByTestId('results-table')).toBeVisible()
  await expect(page.getByTestId('results-count')).toHaveText('12 of 12 people')

  const popup = await openPopup(page, 'open-results')

  // The right panel collapses to the control strip; the table now lives in the popup.
  await expect(page.getByTestId('panel-strip')).toBeVisible()
  await expect(page.getByTestId('results-table')).toHaveCount(0)
  await expect(popup.getByTestId('results-table')).toBeVisible()
  await expect(popup.getByTestId('results-table').locator('tbody tr')).toHaveCount(12)

  // Filter from the MAIN window — the popped-out table updates live.
  await page.getByTestId('filter-search').fill('lund')
  await expect(popup.getByTestId('results-count')).toHaveText('2 of 12 people') // Vera Holm (Lund) + Oscar Lundgren
  await page.getByTestId('filter-search').fill('')
  await page.getByTestId('filter-role').selectOption('Engineer')
  await page.getByTestId('filter-active').check()
  await expect(popup.getByTestId('results-count')).toHaveText('5 of 12 people')

  // Bring it back via the strip: popup closes, panel expands with the table inline.
  await page.getByTestId('panel-bring-back').click()
  await expect.poll(() => popup.isClosed()).toBe(true)
  await expect(page.getByTestId('panel-strip')).toHaveCount(0)
  await expect(page.getByTestId('results-table')).toBeVisible()
  await expect(page.getByTestId('results-count')).toHaveText('5 of 12 people')
})

test('dark mode toggled in the main window propagates to the popup', async ({ page }) => {
  const popup = await openPopup(page, 'open-counter')

  await page.getByRole('button', { name: 'Dark mode' }).click()
  await expect
    .poll(() => popup.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(true)

  const bg = await popup.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBe('rgb(20, 24, 31)') // --bg in dark mode
})
