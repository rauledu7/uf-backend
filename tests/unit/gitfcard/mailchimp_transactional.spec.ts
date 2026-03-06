import MailchimpService from 'App/Services/MailchimpService'
import BigcommerceService from 'App/Services/BigcommerceService'
import { test } from '@japa/runner'
import GeneralService from 'App/Services/GeneralService'

/*
Datos para uso de los templates de prueba de los diferentes montos de la gift card
*/
const template25 = {
  to_name: 'Jesus', // Nombre de quien recibe
  to_email: 'jesusgabrieludiz@gmail.com', // Email de quien recibe
  from_name: 'Jesús', // Nombre de quien envía
  from_email: 'jesus.udiz@bettercommerce.cl', // Email de quien envía
  amount: '25.0000', // Monto del producto (normal_price)
  message: '', // Mensaje opcional
  status: 'active', // Estado predeterminado
  currency_code: 'CLP', // Código de moneda
}
// Para prueba del template de gift card de 50.000
const template50 = Object.assign({}, template25)
template50.to_email = 'jesusgabrieludiz@gmail.com'
template50.amount = '50.000'
// Para prueba del template de gift card de 75.000
const template75 = Object.assign({}, template25)
template75.to_email = 'jesusgabrieludiz@gmail.com'
template75.amount = '75.000'
// Para prueba del template de gift card de 100.000
const template100 = Object.assign({}, template25)
template100.to_email = 'jesusgabrieludiz@gmail.com'
template100.amount = '100.000'

// Funcion para porbar todos los casos de uso
const testFunction = async dataTemplate => {
  try {
    // Creación de gift card en Bigcommerce
    const giftCard = await BigcommerceService.createGiftCard(dataTemplate)

    // Verificar si la gift card fue creada correctamente
    if (giftCard && giftCard.data && giftCard.data.id) {
      // Envío de correo gift card
      const emailGiftCard = await MailchimpService.sendEmilTemplatGiftCard(giftCard)
      console.log({ emailGiftCard, giftCard })
      return { giftCard, emailGiftCard }
    } else {
      // Si no se creó la gift card, devolver un objeto vacío o un objeto con un error
      return { giftCard: null, emailGiftCard: null }
    }
  } catch (error) {
    console.error('Error en testFunction:', error)
  }
}

test.group('Prueba de envio de correo transacional', () => {
  test('An email must be sent to the customer who purchased the gift card.', async ({ assert }) => {
    const resultTest = await testFunction(template25)
    console.log(resultTest)
    // Validar que resultTest no sea null o undefined
    assert.isNotNull(resultTest, 'La respuesta no debe ser null')
    assert.isDefined(resultTest, 'La respuesta no debe ser undefined')
    assert.isObject(resultTest, 'La respuesta debe ser un objeto')

    if (resultTest !== undefined && resultTest.giftCard) {
      // Validar que el estado de la respuesta sea 201
      assert.equal(resultTest.giftCard.status, 201, 'El estado de la respuesta debe ser 201')

      // Validar la estructura de los datos de giftCard
      assert.isObject(resultTest.giftCard.data, 'La propiedad data debe ser un objeto')
      assert.property(resultTest.giftCard.data, 'id', 'La propiedad id debe existir')
      assert.property(resultTest.giftCard.data, 'to_name', 'La propiedad to_name debe existir')
      assert.property(resultTest.giftCard.data, 'to_email', 'La propiedad to_email debe existir')
      assert.property(resultTest.giftCard.data, 'amount', 'La propiedad amount debe existir')
      assert.property(resultTest.giftCard.data, 'balance', 'La propiedad balance debe existir')
      assert.property(resultTest.giftCard.data, 'status', 'La propiedad status debe existir')
      assert.property(resultTest.giftCard.data, 'purchase_date', 'La propiedad purchase_date debe existir')
      assert.property(resultTest.giftCard.data, 'currency_code', 'La propiedad currency_code debe existir')

      // Validar los valores específicos
      assert.equal(resultTest.giftCard.data.to_name, 'Jesus', 'El nombre del destinatario debe ser "Jesus"')
      assert.equal(
        resultTest.giftCard.data.to_email,
        'jesusgabrieludiz@gmail.com',
        'El email del destinatario debe ser "jesusgabrieludiz@gmail.com"'
      )
      assert.equal(resultTest.giftCard.data.amount, '25.0000', 'El monto debe ser "25.0000"')
      assert.equal(resultTest.giftCard.data.balance, '25.0000', 'El balance debe ser "25.0000"')
      assert.equal(resultTest.giftCard.data.status, 'active', 'El estado debe ser "active"')

      // Validar los valores específicos
      assert.equal(resultTest.giftCard.data.to_name, 'Jesus', 'El nombre del destinatario debe ser "Jesus"')
      assert.equal(
        resultTest.giftCard.data.from_email,
        'jesus.udiz@bettercommerce.cl',
        'El email del destinatario debe ser "jesus.udiz@bettercommerce.cl"'
      )
      assert.equal(resultTest.giftCard.data.amount, '25.0000', 'El monto debe ser "25.0000"')
      assert.equal(resultTest.giftCard.data.balance, '25.0000', 'El balance debe ser "25.0000"')
      assert.equal(resultTest.giftCard.data.status, 'active', 'El estado debe ser "active"')

      // Validar el envío de correos
      assert.equal(
        resultTest.emailGiftCard[0].email,
        'jesus.udiz@bettercommerce.cl',
        'El email del destinatario debe ser "jesus.udiz@bettercommerce.cl"'
      )
      assert.equal(resultTest.emailGiftCard[0].status, 'sent', 'El estado del envío debe ser "sent"')
    }
  })
  test('When giving a gift card, it must be sent 2 emails. One for the buyer and one for whom it was given as a gift.', async ({
    assert,
  }) => {
    // Llamar a la función de prueba
    const resultTest = await testFunction(template50)
    if (resultTest !== undefined && resultTest.giftCard) {
      // Validar que resultTest no sea null o undefined
      assert.isNotNull(resultTest, 'La respuesta no debe ser null')
      assert.isDefined(resultTest, 'La respuesta no debe ser undefined')
      // Validar que el monto sea 50.000
      assert.equal(resultTest.giftCard.data.amount, '50.0000', 'El monto debe ser "50.0000"')
      // Validar que el balance sea 50.000
      assert.equal(resultTest.giftCard.data.balance, '50.0000', 'El balance debe ser "50.0000"')
      // Validar que se envíen dos correos
      assert.isDefined(resultTest.emailGiftCard, 'emailGiftCard debe estar definido')
      assert.isArray(resultTest.emailGiftCard, 'emailGiftCard debe ser un array')
      assert.lengthOf(resultTest.emailGiftCard, 2, 'emailGiftCard debe tener exactamente 2 elementos')
      // validar que se envie el mail a un correo gmail
      // assert.equal(resultTest.emailGiftCard[0].status, 'sent', 'El correo para el comprador debe haber sido enviado')
      assert.equal(resultTest.emailGiftCard[1].status, 'sent', 'El correo para el destinatario debe haber sido enviado')
      assert.equal(
        resultTest.emailGiftCard[0].email,
        'jesusgabrieludiz@gmail.com',
        'El correo del comprador debe ser "jesusgabrieludiz@gmail.com"'
      )
      assert.equal(
        resultTest.emailGiftCard[1].email,
        'jesus.udiz@bettercommerce.cl',
        'El correo del comprador debe ser "jesus.udiz@bettercommerce.cl"'
      )
    }
  })
  test('When giving a gift card, it must be sent 2 emails. One for the buyer and one for whom it was given as a gift.', async ({
    assert,
  }) => {
    // Llamar a la función de prueba
    const resultTest = await testFunction(template50)
    if (resultTest !== undefined && resultTest.giftCard) {
      // Validar que resultTest no sea null o undefined
      assert.isNotNull(resultTest, 'La respuesta no debe ser null')
      assert.isDefined(resultTest, 'La respuesta no debe ser undefined')
      // Validar que el monto sea 50.000
      assert.equal(resultTest.giftCard.data.amount, '50.0000', 'El monto debe ser "50.0000"')
      // Validar que el balance sea 50.000
      assert.equal(resultTest.giftCard.data.balance, '50.0000', 'El balance debe ser "50.0000"')
      // Validar que se envíen dos correos
      assert.isDefined(resultTest.emailGiftCard, 'emailGiftCard debe estar definido')
      assert.isArray(resultTest.emailGiftCard, 'emailGiftCard debe ser un array')
      assert.lengthOf(resultTest.emailGiftCard, 2, 'emailGiftCard debe tener exactamente 2 elementos')
      // validar que se envie el mail a un correo gmail
      // assert.equal(resultTest.emailGiftCard[0].status, 'sent', 'El correo para el comprador debe haber sido enviado')
      assert.equal(resultTest.emailGiftCard[1].status, 'sent', 'El correo para el destinatario debe haber sido enviado')
      assert.equal(
        resultTest.emailGiftCard[0].email,
        'jesusgabrieludiz@gmail.com',
        'El correo del comprador debe ser "jesusgabrieludiz@gmail.com"'
      )
      assert.equal(
        resultTest.emailGiftCard[1].email,
        'jesus.udiz@bettercommerce.cl',
        'El correo del comprador debe ser "jesus.udiz@bettercommerce.cl"'
      )
    }
  })
  test('75,000 mail must be sent', async ({ assert }) => {
    // Llamar a la función de prueba
    const resultTest = await testFunction(template75)
    if (resultTest !== undefined && resultTest.giftCard) {
      // Validar que resultTest no sea null o undefined
      assert.isNotNull(resultTest, 'La respuesta no debe ser null')
      assert.isDefined(resultTest, 'La respuesta no debe ser undefined')
      // Validar que el monto sea 50.000
      assert.equal(resultTest.giftCard.data.amount, '75.0000', 'El monto debe ser "75.0000"')
      // Validar que el balance sea 50.000
      assert.equal(resultTest.giftCard.data.balance, '75.0000', 'El balance debe ser "75.0000"')
      // Validar que se envíen dos correos
      assert.isDefined(resultTest.emailGiftCard, 'emailGiftCard debe estar definido')
      assert.isArray(resultTest.emailGiftCard, 'emailGiftCard debe ser un array')
      assert.lengthOf(resultTest.emailGiftCard, 2, 'emailGiftCard debe tener exactamente 2 elementos')
    }
  })
  test('100,000 mail must be sent', async ({ assert }) => {
    // Llamar a la función de prueba
    const resultTest = await testFunction(template100)
    if (resultTest !== undefined && resultTest.giftCard) {
      // Validar que resultTest no sea null o undefined
      assert.isNotNull(resultTest, 'La respuesta no debe ser null')
      assert.isDefined(resultTest, 'La respuesta no debe ser undefined')
      // Validar que el monto sea 50.000
      assert.equal(resultTest.giftCard.data.amount, '100.0000', 'El monto debe ser "100.0000"')
      // Validar que el balance sea 50.000
      assert.equal(resultTest.giftCard.data.balance, '100.0000', 'El balance debe ser "100.0000"')
      // Validar que se envíen dos correos
      assert.isDefined(resultTest.emailGiftCard, 'emailGiftCard debe estar definido')
      assert.isArray(resultTest.emailGiftCard, 'emailGiftCard debe ser un array')
      assert.lengthOf(resultTest.emailGiftCard, 2, 'emailGiftCard debe tener exactamente 2 elementos')
    }
  })
  test('se debe enviar email de alertas de compras con descuentos sospechosos', async ({ assert }) => {
    // Llamar a la función de prueba
    const order = {
      id: 210576,
      total_inc_tax: 20000,
      discount_amount: 15000,
      billing_address: {
        first_name: 'jesus',
        last_name: 'udiz',
      },
      ip_address: 'PRUEBA',
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
      total_inc_tax: 2000,
      discount_amount: 0,
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
  test('Se debe enviar email de alertas de compras con descuento sin cupón', async ({ assert }) => {
    // Llamar a la función de prueba
    const order = {
      id: 210576,
      total_inc_tax: 20000,
      discount_amount: 100,
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
})
