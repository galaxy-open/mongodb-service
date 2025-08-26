import { test } from '@japa/runner'

test.group('Home page', () => {
  test('see Your Logo on top left corner', async ({ visit }) => {
    const page = await visit('/')
    await page.assertTextContains('strong', 'Your Logo')
  })
})
