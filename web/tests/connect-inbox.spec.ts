import { test, expect } from '@playwright/test';

test('flujo de conexión y bandeja', async ({ page }) => {
  await page.route('**/me/accounts', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          pageId: '123',
          pageName: 'Mi Página',
          igUserId: '1789',
          igUsername: 'mimarca',
          isMessageAccessEnabled: true,
        },
      ]),
    });
  });

  await page.route('**/accounts/connect', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ connected: [{ id: 'acc1', igUserId: '1789' }], warnings: [] }),
    });
  });

  await page.goto('/connect');
  await page.getByRole('button', { name: 'Actualizar lista' }).click();
  await expect(page.getByText('@mimarca')).toBeVisible();
  await page.getByRole('button', { name: 'Conectar seleccionadas' }).click();
  await expect(page.getByText('Conectadas 1 cuentas.')).toBeVisible();

  await page.route('**/accounts', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'acc1', igUserId: '1789', igUsername: 'mimarca', pageId: '123', pageName: 'Mi Página' },
      ]),
    });
  });

  await page.route('**/conversations*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'conv1',
            accountId: 'acc1',
            peerIgUserId: 'user123',
            peerIgUsername: 'cliente',
            lastMessageAt: new Date().toISOString(),
            lastMessageSnippet: 'Hola',
            unreadCount: 1,
          },
        ],
        nextPage: null,
      }),
    });
  });

  await page.route('**/messages*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { id: 'm1', direction: 'in', text: 'Hola', igMessageId: 'mid1', createdAt: new Date().toISOString() },
        ],
        nextPage: null,
      }),
    });
  });

  let sendCount = 0;
  await page.route('**/messages/send', async (route, request) => {
    sendCount += 1;
    const body = await request.postDataJSON();
    expect(body).toMatchObject({ igUserId: '1789', peerIgUserId: 'user123' });
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ status: 'queued' }),
    });
  });

  await page.getByRole('link', { name: 'Ir al inbox' }).click();
  await expect(page).toHaveURL('/inbox');
  await expect(page.getByText('cliente')).toBeVisible();
  await page.getByText('cliente').click();
  await page.getByPlaceholder('Escribí una respuesta…').fill('Respuesta');
  await page.getByRole('button', { name: 'Enviar' }).click();
  expect(sendCount).toBe(1);
});
