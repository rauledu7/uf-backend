import Env from '@ioc:Adonis/Core/Env'
import { test } from '@japa/runner'
import ProcesOrder from 'App/Mailers/ProcesOrder'
import EmailService from 'App/Services/EmailService'

test.group('Emails purchase confirmation', () => {
  // 🎯 CASO 1: Producto con reserva + giftcard
  test('should send email for product with reserve + giftcard', async ({ assert }) => {
    const order_id = 276493
    const bsale = '18c96dc728c1'
    const body_email = await EmailService.payloadEmail(order_id, bsale)
    console.log(body_email)
    const email = await new ProcesOrder(body_email).send()

    // Validaciones del payload
    assert.property(body_email, 'is_retiro', 'Debe tener propiedad is_retiro')
    assert.property(body_email, 'order', 'Debe tener propiedad order')
    assert.property(body_email, 'client', 'Debe tener propiedad client')
    assert.property(body_email, 'shipping', 'Debe tener propiedad shipping')
    assert.property(body_email, 'products', 'Debe tener propiedad products')

    // Validaciones del email
    assert.isEmpty(email.rejected, 'Email fue rechazado')
    assert.equal(email.envelope.from, Env.get('CONTACT_EMAIL'), 'El remitente no es el esperado')
  }).pin()

  // 🎯 CASO 2: Solo giftcard
  test('should send email for giftcard only purchase', async ({ assert }) => {
    const order_id = 193551
    const bsale = 'a1cd28cc31cc'
    const body_email = await EmailService.payloadEmail(order_id, bsale)

    // Validaciones específicas para giftcard
    assert.isFalse(body_email.is_retiro, 'Giftcard no debe ser retiro')
    assert.property(body_email.shipping, 'delivery', 'Debe tener mensaje de delivery')
    assert.include(body_email.shipping.delivery, 'gift card', 'Debe mencionar gift card')

    const email = await new ProcesOrder(body_email).send()
    assert.deepEqual(email.accepted, ['jesus.udiz@bettercommerce.cl'], 'Email no enviado a la dirección correcta')
    assert.isEmpty(email.rejected, 'Email fue rechazado')
    assert.equal(email.envelope.from, Env.get('CONTACT_EMAIL'), 'El remitente no es el esperado')
  })

  // 🎯 CASO 3: Productos con reserva + retiro en tienda
  test('should send email for products with reserve + store pickup', async ({ assert }) => {
    const order_id = 177376
    const bsale = 'a1cd28cc31cc'
    const body_email = await EmailService.payloadEmail(order_id, bsale)

    // Validaciones específicas para retiro con reserva
    assert.isTrue(body_email.is_retiro, 'Debe ser retiro en tienda')
    assert.property(body_email, 'store', 'Debe tener información de la tienda')
    assert.property(body_email.store, 'title', 'Tienda debe tener título')
    assert.property(body_email.store, 'address', 'Tienda debe tener dirección')
    assert.property(body_email.store, 'days', 'Tienda debe tener días de preparación')

    const email = await new ProcesOrder(body_email).send()
    assert.deepEqual(email.accepted, ['jesus.udiz@bettercommerce.cl'], 'Email no enviado a la dirección correcta')
    assert.isEmpty(email.rejected, 'Email fue rechazado')
    assert.equal(email.envelope.from, 'contacto@firstcare.cl', 'El remitente no es el esperado')
  })

  // 🎯 CASO 4: Envío express
  test('should send email for express shipping', async ({ assert }) => {
    const order_id = 177620
    const bsale = 'a1cd28cc31cc'
    const body_email = await EmailService.payloadEmail(order_id, bsale)

    // Validaciones específicas para envío express
    assert.isFalse(body_email.is_retiro, 'No debe ser retiro')
    assert.property(body_email.shipping, 'method', 'Debe tener método de envío')
    assert.include(body_email.shipping.method.toLowerCase(), 'express', 'Debe ser envío express')
    assert.property(body_email.shipping, 'delivery', 'Debe tener mensaje de delivery')

    const email = await new ProcesOrder(body_email).send()
    assert.deepEqual(email.accepted, ['jesus.udiz@bettercommerce.cl'], 'Email no enviado a la dirección correcta')
    assert.isEmpty(email.rejected, 'Email fue rechazado')
    assert.equal(email.envelope.from, 'contacto@firstcare.cl', 'El remitente no es el esperado')
  })

  // 🎯 CASO 5: Same day delivery
  test('should send email for same day delivery', async ({ assert }) => {
    const order_id = 177622
    const bsale = 'a1cd28cc31cc'
    const body_email = await EmailService.payloadEmail(order_id, bsale)

    // Validaciones específicas para same day
    assert.isFalse(body_email.is_retiro, 'No debe ser retiro')
    assert.property(body_email.shipping, 'method', 'Debe tener método de envío')
    assert.property(body_email.shipping, 'delivery', 'Debe tener mensaje de delivery')

    const email = await new ProcesOrder(body_email).send()
    assert.deepEqual(email.accepted, ['jesus.udiz@bettercommerce.cl'], 'Email no enviado a la dirección correcta')
    assert.isEmpty(email.rejected, 'Email fue rechazado')
    assert.equal(email.envelope.from, 'contacto@firstcare.cl', 'El remitente no es el esperado')
  })

  // 🎯 CASO 6: Envío simple + same day
  test('should send email for simple shipping with same day', async ({ assert }) => {
    const order_id = 177951
    const bsale = 'a1cd28cc31cc'
    const body_email = await EmailService.payloadEmail(order_id, bsale)

    // Validaciones específicas para envío simple
    assert.isFalse(body_email.is_retiro, 'No debe ser retiro')
    assert.property(body_email.shipping, 'method', 'Debe tener método de envío')
    assert.property(body_email.shipping, 'delivery', 'Debe tener mensaje de delivery')

    const email = await new ProcesOrder(body_email).send()
    assert.deepEqual(email.accepted, ['jesus.udiz@bettercommerce.cl'], 'Email no enviado a la dirección correcta')
    assert.isEmpty(email.rejected, 'Email fue rechazado')
    assert.equal(email.envelope.from, 'contacto@firstcare.cl', 'El remitente no es el esperado')
  })

  // 🎯 CASO 7: Retiro simple (sin reserva)
  test('should send email for simple store pickup (no reserve)', async ({ assert }) => {
    const order_id = 177954
    const bsale = 'a1cd28cc31cc'
    const body_email = await EmailService.payloadEmail(order_id, bsale)

    // Validaciones específicas para retiro simple
    assert.isTrue(body_email.is_retiro, 'Debe ser retiro en tienda')
    assert.property(body_email, 'store', 'Debe tener información de la tienda')
    assert.property(body_email.store, 'title', 'Tienda debe tener título')
    assert.property(body_email.store, 'address', 'Tienda debe tener dirección')

    const email = await new ProcesOrder(body_email).send()
    assert.deepEqual(email.accepted, ['jesus.udiz@bettercommerce.cl'], 'Email no enviado a la dirección correcta')
    assert.isEmpty(email.rejected, 'Email fue rechazado')
    assert.equal(email.envelope.from, 'contacto@firstcare.cl', 'El remitente no es el esperado')
  })

  // 🎯 CASO 8: Envío estándar (nuevo)
  test('should send email for standard shipping', async ({ assert }) => {
    const order_id = 271429 // Usar el ID del ejemplo que me diste
    const bsale = 'test_token'
    const body_email = await EmailService.payloadEmail(order_id, bsale)

    // Validaciones específicas para envío estándar
    assert.isFalse(body_email.is_retiro, 'No debe ser retiro')
    assert.property(body_email.shipping, 'method', 'Debe tener método de envío')
    assert.property(body_email.shipping, 'delivery', 'Debe tener mensaje de delivery')
    assert.property(body_email.shipping, 'cost', 'Debe tener costo de envío')

    // Validar estructura completa del payload
    assert.property(body_email, 'order', 'Debe tener información de la orden')
    assert.property(body_email.order, 'nro_pedido', 'Orden debe tener número de pedido')
    assert.property(body_email.order, 'total', 'Orden debe tener total')
    assert.property(body_email.order, 'date', 'Orden debe tener fecha')

    assert.property(body_email, 'client', 'Debe tener información del cliente')
    assert.property(body_email.client, 'name', 'Cliente debe tener nombre')
    assert.property(body_email.client, 'email', 'Cliente debe tener email')
    assert.property(body_email.client, 'phone', 'Cliente debe tener teléfono')

    assert.property(body_email, 'products', 'Debe tener productos')
    assert.isArray(body_email.products, 'Products debe ser un array')

    if (body_email.products.length > 0) {
      const product = body_email.products[0]
      assert.property(product, 'title', 'Producto debe tener título')
      assert.property(product, 'sku', 'Producto debe tener SKU')
      assert.property(product, 'price', 'Producto debe tener precio')
      assert.property(product, 'quantity', 'Producto debe tener cantidad')
      assert.property(product, 'delivery', 'Producto debe tener delivery')
    }
  })

  // 🎯 CASO 9: Productos con reserva + envío estándar (nuevo)
  test('should send email for products with reserve + standard shipping', async ({ assert }) => {
    const order_id = 242330 // Ajustar con un ID real que tenga reserva + envío
    const bsale = 'test_token'
    const body_email = await EmailService.payloadEmail(order_id, bsale)

    // Validaciones específicas para reserva + envío
    assert.isFalse(body_email.is_retiro, 'No debe ser retiro')
    assert.property(body_email.order, 'someReserve', 'Debe indicar si hay reservas')
    assert.property(body_email.order, 'allReserve', 'Debe indicar si todos son reserva')

    // Validar que los productos con reserva tengan delivery específico
    if (body_email.products.length > 0) {
      body_email.products.forEach(product => {
        if (product.reserve && product.reserve !== '') {
          assert.property(product, 'delivery', 'Producto con reserva debe tener delivery')
          assert.include(product.delivery.toLowerCase(), 'reserva', 'Delivery debe mencionar reserva')
        }
      })
    }
  })

  // 🎯 CASO 10: Validación de estructura general (nuevo)
  test('should validate general payload structure for all cases', async ({ assert }) => {
    const testCases = [
      { order_id: 242329, description: 'Reserva + Giftcard' },
      { order_id: 193551, description: 'Solo Giftcard' },
      { order_id: 177376, description: 'Reserva + Retiro' },
      { order_id: 177620, description: 'Envío Express' },
      { order_id: 177622, description: 'Same Day' },
      { order_id: 177951, description: 'Envío Simple' },
      { order_id: 177954, description: 'Retiro Simple' }
    ]

    for (const testCase of testCases) {
      try {
        const body_email = await EmailService.payloadEmail(testCase.order_id, 'test_token')

        // Validaciones de estructura general
        assert.property(body_email, 'is_retiro', `${testCase.description}: Debe tener is_retiro`)
        assert.property(body_email, 'order', `${testCase.description}: Debe tener order`)
        assert.property(body_email, 'client', `${testCase.description}: Debe tener client`)
        assert.property(body_email, 'shipping', `${testCase.description}: Debe tener shipping`)
        assert.property(body_email, 'products', `${testCase.description}: Debe tener products`)

        // Validaciones de tipos
        assert.isBoolean(body_email.is_retiro, `${testCase.description}: is_retiro debe ser boolean`)
        assert.isObject(body_email.order, `${testCase.description}: order debe ser objeto`)
        assert.isObject(body_email.client, `${testCase.description}: client debe ser objeto`)
        assert.isObject(body_email.shipping, `${testCase.description}: shipping debe ser objeto`)
        assert.isArray(body_email.products, `${testCase.description}: products debe ser array`)
      } catch (error) {
        assert.fail(`${testCase.description}: Error al procesar - ${error.message}`)
      }
    }
  })
})
