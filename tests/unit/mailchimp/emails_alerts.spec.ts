import { test } from '@japa/runner'
import GeneralService from 'App/Services/GeneralService'

test('se debe enviar email de alertas de compras con descuentos sospechosos', async ({ assert }) => {
  // Llamar a la función de prueba
  const order = {
    id: 210576,
    total_inc_tax: '93520.0000',
    subtotal_inc_tax: '176950.0000',
    discount_amount: '171000',
    billing_address: {
      first_name: 'jesus',
      last_name: 'udiz',
    },
    ip_address: 'prueba',
    items_total: 1,
  }
  const email = await GeneralService.verifyFraudulentTransaction(order)
  assert.isNotNull(email, 'La respuesta no debe ser null')
  assert.isDefined(email, 'La respuesta no debe ser undefined')
  assert.isArray(email, 'email debe ser un array')
})
test('se debe enviar email de alertas de compras con monto sospechoso', async ({ assert }) => {
  // Llamar a la función de prueba
  const order = {
    id: 210576,
    total_inc_tax: '2000',
    subtotal_inc_tax: '2000',
    discount_amount: '0',
    billing_address: {
      first_name: 'jesus',
      last_name: 'udiz',
    },
    ip_address: 'prueba',
    items_total: 1,
  }

  const email = await GeneralService.verifyFraudulentTransaction(order)
  console.log(email)
  //assert.isNotNull(email, 'La respuesta no debe ser null')
  assert.isDefined(email, 'La respuesta no debe ser undefined')
  assert.isArray(email, 'email debe ser un array')
})
test('Se debe enviar email de alertas de compras con descuento sin cupón', async ({ assert }) => {
  // Llamar a la función de prueba
  const order = {
    id: 210576,
    total_inc_tax: '93520.0000',
    subtotal_inc_tax: '176950.0000',
    discount_amount: '88475.0000',
    billing_address: {
      first_name: 'jesus',
      last_name: 'udiz',
    },
    ip_address: '',
    items_total: 1,
  }
  const email = await GeneralService.verifyFraudulentTransaction(order)
  assert.isNotNull(email, 'La respuesta no debe ser null')
  assert.isDefined(email, 'La respuesta no debe ser undefined')
  assert.isArray(email, 'email debe ser un array')
})
