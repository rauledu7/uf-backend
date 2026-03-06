import { test } from '@japa/runner'
import AlertWarningService from 'App/Services/AlertWarningService'

test.group('Prueba de alertas de stock de seguridad', () => {
  test('se deben enviar correos con los productos fuera de stock y los que han alcanzado el stock de seguridad', async ({ assert }) => {
    const alert = await AlertWarningService.checkStockSecurityAlert()
    console.log(alert)
  })
})
