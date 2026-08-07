import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { generatePeople } from '../docs/src/examples/people'

const PEOPLE_12 = generatePeople(12)
const PEOPLE_400 = generatePeople(400)

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

test('data grid detaches into popup with TanStack Query and Mantine context intact', async ({
  page,
}) => {
  const grid = page.getByTestId('people-grid')
  await expect(grid).toBeVisible()
  await expect(grid.getByText(PEOPLE_12[0].name)).toBeVisible()

  const popup = await openPopup(page, 'open-table')

  // Main window hides the grid and shows the note.
  await expect(page.getByTestId('table-detached-note')).toBeVisible()
  await expect(page.getByTestId('people-grid')).toHaveCount(0)

  // The TMDataGrid renders in the popup with data from useQuery.
  await expect(popup.getByTestId('people-grid')).toBeVisible()
  await expect(popup.getByText(PEOPLE_12[0].name)).toBeVisible()
  await expect(popup.getByText(PEOPLE_12[11].name)).toBeVisible()

  // Refetch goes through the QueryClientProvider mounted in the main window.
  await popup.getByRole('button', { name: /Refetch/ }).click()
  await expect(popup.getByRole('button', { name: /Refetch/ })).toBeEnabled()

  // Bring it back: popup closes, inline grid returns.
  await page.getByTestId('bring-back').click()
  await expect(page.getByTestId('people-grid')).toBeVisible()
  await expect.poll(() => popup.isClosed()).toBe(true)
})

test('closing the popup window itself restores the main window grid', async ({ page }) => {
  const popup = await openPopup(page, 'open-table')
  await expect(page.getByTestId('table-detached-note')).toBeVisible()

  await popup.close()

  await expect(page.getByTestId('people-grid')).toBeVisible()
  await expect(page.getByTestId('table-detached-note')).toHaveCount(0)
})

test('panels: popped-out grid follows filters edited in the main window', async ({ page }) => {
  // Inline to start: the results grid renders in the right panel.
  const host = page.getByTestId('results-host')
  await expect(host).toBeVisible()
  await expect(host.getByText('400 / 400')).toBeVisible()
  await expect(host.getByText(PEOPLE_400[0].name)).toBeVisible()

  const popup = await openPopup(page, 'open-results')

  // The right panel collapses to the control strip; the grid now lives in the popup.
  await expect(page.getByTestId('panel-strip')).toBeVisible()
  await expect(page.getByTestId('results-host')).toHaveCount(0)
  await expect(popup.getByText('400 / 400')).toBeVisible()
  await expect(popup.getByText(PEOPLE_400[0].name)).toBeVisible()

  // Filter from the MAIN window — the popped-out grid updates live.
  const needle = 'lindqvist'
  const byName = PEOPLE_400.filter((p) => p.name.toLowerCase().includes(needle)).length
  expect(byName).toBeGreaterThan(0)
  await page.getByTestId('filter-search').fill(needle)
  await expect(popup.getByText(`${byName} / ${byName}`)).toBeVisible()

  await page.getByTestId('filter-search').fill('')
  const engineersActive = PEOPLE_400.filter(
    (p) => p.role === 'Engineer' && p.status === 'active',
  ).length
  await page.getByTestId('filter-role').selectOption('Engineer')
  await page.getByTestId('filter-active').check()
  await expect(popup.getByText(`${engineersActive} / ${engineersActive}`)).toBeVisible()

  // Bring it back via the strip: popup closes, panel expands with the grid inline.
  await page.getByTestId('panel-bring-back').click()
  await expect.poll(() => popup.isClosed()).toBe(true)
  await expect(page.getByTestId('panel-strip')).toHaveCount(0)
  await expect(
    page.getByTestId('results-host').getByText(`${engineersActive} / ${engineersActive}`),
  ).toBeVisible()
})

test('mantine popovers opened from the popped-out grid stay in the popup window', async ({
  page,
}) => {
  const popup = await openPopup(page, 'open-results')
  await expect(popup.getByText(PEOPLE_400[0].name)).toBeVisible()

  // The column manager popover portals — thanks to the SameWindowPortals
  // wrapper it must land in the POPUP document, not the main window's body.
  await popup.getByRole('button', { name: 'Manage columns' }).click()
  await expect(popup.getByText('Show/Hide All')).toBeVisible()
  await expect(page.getByText('Show/Hide All')).toHaveCount(0)
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
