import { test } from '@japa/runner'
import AlegraService from 'App/Services/Alegra/AlegraService'
import BigcommerceService from 'App/Services/BigcommerceService'

const alegraService = new AlegraService()
const order_id = 8278

/**
 * {
    id: '109',
    name: 'Jesus Udiz Bettercommerce Cl Udiz',
    identification: '1223455667',
    phonePrimary: null,
    phoneSecondary: null,
    mobile: null,
    email: 'jesus.udiz@bettercommerce.cl',
    status: 'active',
}
 */
test.group('Prueba de servicio de Alegra', () => {
  test('Debe devolver el formato adecuado para la creación de cliente en la API de alegra', async ({ assert }) => {
    const dataOrder = await BigcommerceService.getOrderById(order_id)
    const client1 = await alegraService.formateDataClient(dataOrder, 'Registro Civil')

    assert.deepEqual(client1, {
      name: 'Jesus Udiz Bettercommerce Cl Udiz', // Cambia esto por el nombre esperado
      nameObject: { firstName: 'Jesus Udiz Bettercommerce Cl', lastName: 'Udiz' }, // Cambia esto por los nombres esperados
      identifications: '1223455667', // Cambia esto por el zip esperado
      identificationObject: { type: 'RC', div: undefined, number: '1223455667' }, // Cambia esto por el zip esperado
      email: 'jesus.udiz@bettercommerce.cl', // Cambia esto por el email esperado
      type: 'client',
      status: 'active',
    })
    const client2 = await alegraService.formateDataClient(dataOrder, 'Tarjeta de Identidad')
    assert.deepEqual(client2.identificationObject.type, 'TI', 'El tipo de documento debe ser TI')

    const client3 = await alegraService.formateDataClient(dataOrder, 'Cedula de Ciudadanía')
    assert.deepEqual(client3.identificationObject.type, 'CC', 'El tipo de documento debe ser CC')
    const client4 = await alegraService.formateDataClient(dataOrder, 'Tarjeta de Extranjería')
    assert.deepEqual(client4.identificationObject.type, 'TE', 'El tipo de documento debe ser TE')

    const client5 = await alegraService.formateDataClient(dataOrder, 'NIT')
    assert.equal(client5.identificationObject.type, 'NIT', 'El tipo de documento debe ser NIT')
    assert.exists(client5.identificationObject.div, 'El div no debe ser undefined para NIT')
    assert.isNumber(client5.identificationObject.div, 'El div debe ser un número')

    const client6 = await alegraService.formateDataClient(dataOrder, 'Pasaporte')
    assert.deepEqual(client6.identificationObject.type, 'PP', 'El tipo de documento debe ser PP')

    const client7 = await alegraService.formateDataClient(dataOrder, 'Documento de Identificación Extranjero')
    assert.deepEqual(client7.identificationObject.type, 'DIE', 'El tipo de documento debe ser DIE')

    const client8 = await alegraService.formateDataClient(dataOrder, '')
    assert.deepEqual(client8.identificationObject.type, 'FOREIGN_NIT', 'El tipo de documento debe ser FOREIGN_NIT para un tipo vacío')
  })
  test('Se valida registro de usuario en la API de Alegra', async ({ assert }) => {
    // El metodo recibe un parametro representado por un objeto con los datos de retorno del siguiente metodo

    const dataOrder = await BigcommerceService.getOrderById(order_id)
    const formatedData = await alegraService.formateDataClient(dataOrder, 'pasaporte')
    console.log(formatedData)
    const getClient = await alegraService.createClientAPIAlegra(formatedData)
    console.log(getClient)
    assert.equal(getClient.message.id, '109')
    assert.equal(getClient.status, 200)
    /**
  {
  status: 400,
  message: {
    message: 'Ya existe un contacto con la identificación 1223455667',
    code: 2006,
    contactId: '109',
    contactName: 'Jesus Udiz Bettercommerce Cl Udiz',
    contactIdentification: '1223455667',
    contactIdentificationObject: { dv: null, type: 'PP', number: '1223455667' }
  }
     */
  })
  test('Validar detalles de productos para la creaión de la factura con descuento', async ({ assert }) => {
    const products = await BigcommerceService.getProductsByOrder('8309') // id de pedido con descuento
    console.log(products)
    const productsInfoAlegra = await alegraService.getDetailsProductsForAlegra(products, '5000.0000')
    console.log(productsInfoAlegra)
    assert.notEmpty(productsInfoAlegra)
    assert.lengthOf(productsInfoAlegra, 2)
    assert.exists(productsInfoAlegra[0].id)
    assert.exists(productsInfoAlegra[0].price)
    assert.exists(productsInfoAlegra[0].name)
    assert.exists(productsInfoAlegra[0].quantity)
    assert.exists(productsInfoAlegra[0].discount)
    assert.exists(productsInfoAlegra[0].tax)
  })

  test('Validar detalles de productos para la creaión de la factura sin descuento', async ({ assert }) => {
    const products = await BigcommerceService.getProductsByOrder('8307') // id de pedido sin descuento
    console.log(products)
    const productsInfoAlegra = await alegraService.getDetailsProductsForAlegra(products, '5000.0000')
    console.log(productsInfoAlegra)
    assert.notEmpty(productsInfoAlegra)
    assert.lengthOf(productsInfoAlegra, 2)
    assert.exists(productsInfoAlegra[0].id)
    assert.exists(productsInfoAlegra[0].price)
    assert.exists(productsInfoAlegra[0].name)
    assert.exists(productsInfoAlegra[0].quantity)
    assert.exists(productsInfoAlegra[0].discount)
    assert.exists(productsInfoAlegra[0].tax)
  })
  test('Validar detalles de productos para la creaión de la factura con servicio de armado', async ({ assert }) => {
    const products = await BigcommerceService.getProductsByOrder('8315')
    console.log(products)
    const productsInfoAlegra = await alegraService.getDetailsProductsForAlegra(products, '5000.0000')
    console.log(productsInfoAlegra)
    assert.notEmpty(productsInfoAlegra)
    assert.lengthOf(productsInfoAlegra, 3)
    assert.exists(productsInfoAlegra[0].id)
    assert.exists(productsInfoAlegra[0].price)
    assert.exists(productsInfoAlegra[0].name)
    assert.exists(productsInfoAlegra[0].quantity)
    assert.exists(productsInfoAlegra[0].discount)
    assert.exists(productsInfoAlegra[0].tax)
  })

  test('Validar creación de factura para una compra normal', async ({ assert }) => {
    const createInvoice = await alegraService.createDocs(8307)
    console.log(createInvoice)

    // Afirmar que el estado de la respuesta es 200
    assert.equal(createInvoice.status, 200, 'El estado de la respuesta debe ser 200')

    // Afirmar que el mensaje es un objeto
    assert.isObject(createInvoice.message, 'El mensaje debe ser un objeto')

    // Afirmar que el mensaje tiene un ID
    assert.exists(createInvoice.message.id, 'El ID de la factura debe existir')

    // Afirmar que el mensaje tiene las fechas
    assert.exists(createInvoice.message.date, 'La fecha debe existir')
    assert.exists(createInvoice.message.dueDate, 'La fecha de vencimiento debe existir')
    assert.exists(createInvoice.message.datetime, 'La fecha y hora deben existir')

    // Afirmar que el mensaje tiene observaciones y anotaciones
    assert.exists(createInvoice.message.observations, 'Las observaciones deben existir')
    assert.exists(createInvoice.message.anotation, 'La anotación debe existir')

    // Afirmar que el mensaje tiene términos y condiciones
    assert.exists(createInvoice.message.termsConditions, 'Los términos y condiciones deben existir')

    // Afirmar que el mensaje tiene un estado
    assert.exists(createInvoice.message.status, 'El estado de la factura debe existir')

    // Afirmar que el mensaje tiene información del cliente
    assert.exists(createInvoice.message.client, 'La información del cliente debe existir')
    assert.exists(createInvoice.message.client.id, 'El ID del cliente debe existir')
    assert.exists(createInvoice.message.client.name, 'El nombre del cliente debe existir')
    assert.exists(createInvoice.message.client.identification, 'La identificación del cliente debe existir')
    assert.exists(createInvoice.message.client.email, 'El email del cliente debe existir')

    // Afirmar que el mensaje tiene detalles financieros
    assert.exists(createInvoice.message.subtotal, 'El subtotal debe existir')
    assert.exists(createInvoice.message.discount, 'El descuento debe existir')
    assert.exists(createInvoice.message.tax, 'El impuesto debe existir')
    assert.exists(createInvoice.message.total, 'El total debe existir')
    assert.exists(createInvoice.message.totalPaid, 'El total pagado debe existir')
    assert.exists(createInvoice.message.balance, 'El saldo debe existir')

    // Afirmar que el mensaje tiene forma y método de pago
    assert.exists(createInvoice.message.paymentForm, 'La forma de pago debe existir')
    assert.exists(createInvoice.message.paymentMethod, 'El método de pago debe existir')

    // Afirmar que el mensaje tiene información del vendedor
    assert.exists(createInvoice.message.seller, 'La información del vendedor debe existir')
    assert.exists(createInvoice.message.seller.id, 'El ID del vendedor debe existir')
    assert.exists(createInvoice.message.seller.name, 'El nombre del vendedor debe existir')

    // Afirmar que el mensaje tiene plantilla de impresión
    assert.exists(createInvoice.message.printingTemplate, 'La plantilla de impresión debe existir')
    assert.exists(createInvoice.message.printingTemplate.id, 'El ID de la plantilla de impresión debe existir')
    assert.exists(createInvoice.message.printingTemplate.name, 'El nombre de la plantilla de impresión debe existir')

    // Afirmar que los arrays de items y pagos existen y no están vacíos
    assert.isArray(createInvoice.message.items, 'Los items deben ser un array')
    assert.isArray(createInvoice.message.payments, 'Los pagos deben ser un array')
    assert.isAbove(createInvoice.message.items.length, 0, 'Debe haber al menos un item')
    assert.isAbove(createInvoice.message.payments.length, 0, 'Debe haber al menos un pago')
  })

  test('Validar creación de factura para una compra con descuento', async ({ assert }) => {
    // const createInvoice = await alegraService.createDocs(8315, 'pasaporte')
    // const createInvoice = await alegraService.createDocs(8324, 'pasaporte')
    const createInvoice = await alegraService.createDocs(8326)
    console.log(createInvoice)

    // Afirmar que el estado de la respuesta es 200
    assert.equal(createInvoice.status, 200, 'El estado de la respuesta debe ser 200')

    // Afirmar que el mensaje es un objeto
    assert.isObject(createInvoice.message, 'El mensaje debe ser un objeto')

    // Afirmar que el mensaje tiene un ID
    assert.exists(createInvoice.message.id, 'El ID de la factura debe existir')

    // Afirmar que el mensaje tiene las fechas
    assert.exists(createInvoice.message.date, 'La fecha debe existir')
    assert.exists(createInvoice.message.dueDate, 'La fecha de vencimiento debe existir')
    assert.exists(createInvoice.message.datetime, 'La fecha y hora deben existir')

    // Afirmar que el mensaje tiene observaciones y anotaciones
    assert.exists(createInvoice.message.observations, 'Las observaciones deben existir')
    assert.exists(createInvoice.message.anotation, 'La anotación debe existir')

    // Afirmar que el mensaje tiene términos y condiciones
    assert.exists(createInvoice.message.termsConditions, 'Los términos y condiciones deben existir')

    // Afirmar que el mensaje tiene un estado
    assert.exists(createInvoice.message.status, 'El estado de la factura debe existir')

    // Afirmar que el mensaje tiene información del cliente
    assert.exists(createInvoice.message.client, 'La información del cliente debe existir')
    assert.exists(createInvoice.message.client.id, 'El ID del cliente debe existir')
    assert.exists(createInvoice.message.client.name, 'El nombre del cliente debe existir')
    assert.exists(createInvoice.message.client.identification, 'La identificación del cliente debe existir')
    assert.exists(createInvoice.message.client.email, 'El email del cliente debe existir')

    // Afirmar que el mensaje tiene detalles financieros
    assert.exists(createInvoice.message.subtotal, 'El subtotal debe existir')
    assert.exists(createInvoice.message.discount, 'El descuento debe existir')
    assert.exists(createInvoice.message.tax, 'El impuesto debe existir')
    assert.exists(createInvoice.message.total, 'El total debe existir')
    assert.exists(createInvoice.message.totalPaid, 'El total pagado debe existir')
    assert.exists(createInvoice.message.balance, 'El saldo debe existir')

    // Afirmar que el mensaje tiene forma y método de pago
    assert.exists(createInvoice.message.paymentForm, 'La forma de pago debe existir')
    assert.exists(createInvoice.message.paymentMethod, 'El método de pago debe existir')

    // Afirmar que el mensaje tiene información del vendedor
    assert.exists(createInvoice.message.seller, 'La información del vendedor debe existir')
    assert.exists(createInvoice.message.seller.id, 'El ID del vendedor debe existir')
    assert.exists(createInvoice.message.seller.name, 'El nombre del vendedor debe existir')

    // Afirmar que el mensaje tiene plantilla de impresión
    assert.exists(createInvoice.message.printingTemplate, 'La plantilla de impresión debe existir')
    assert.exists(createInvoice.message.printingTemplate.id, 'El ID de la plantilla de impresión debe existir')
    assert.exists(createInvoice.message.printingTemplate.name, 'El nombre de la plantilla de impresión debe existir')

    // Afirmar que los arrays de items y pagos existen y no están vacíos
    assert.isArray(createInvoice.message.items, 'Los items deben ser un array')
    assert.isArray(createInvoice.message.payments, 'Los pagos deben ser un array')
    assert.isAbove(createInvoice.message.items.length, 0, 'Debe haber al menos un item')
    assert.isAbove(createInvoice.message.payments.length, 0, 'Debe haber al menos un pago')
  })
  test('creación  de factura con servicio de armado', async ({ assert }) => {
    const createInvoice = await alegraService.createDocs(8332)
    console.log(createInvoice)

    // Afirmar que el estado de la respuesta es 200
    assert.equal(createInvoice.status, 200, 'El estado de la respuesta debe ser 200')

    // Afirmar que el mensaje es un objeto
    assert.isObject(createInvoice.message, 'El mensaje debe ser un objeto')

    // Afirmar que el mensaje tiene un ID
    assert.exists(createInvoice.message.id, 'El ID de la factura debe existir')

    // Afirmar que el mensaje tiene las fechas
    assert.exists(createInvoice.message.date, 'La fecha debe existir')
    assert.exists(createInvoice.message.dueDate, 'La fecha de vencimiento debe existir')
    assert.exists(createInvoice.message.datetime, 'La fecha y hora deben existir')

    // Afirmar que el mensaje tiene observaciones y anotaciones
    assert.exists(createInvoice.message.seller.observations, 'Las observaciones deben existir')

    // Afirmar que el mensaje tiene términos y condiciones
    assert.exists(createInvoice.message.termsConditions, 'Los términos y condiciones deben existir')

    // Afirmar que el mensaje tiene un estado
    assert.exists(createInvoice.message.status, 'El estado de la factura debe existir')

    // Afirmar que el mensaje tiene información del cliente
    assert.exists(createInvoice.message.client, 'La información del cliente debe existir')
    assert.exists(createInvoice.message.client.id, 'El ID del cliente debe existir')
    assert.exists(createInvoice.message.client.name, 'El nombre del cliente debe existir')
    assert.exists(createInvoice.message.client.identification, 'La identificación del cliente debe existir')
    assert.exists(createInvoice.message.client.email, 'El email del cliente debe existir')

    // Afirmar que el mensaje tiene detalles financieros
    assert.exists(createInvoice.message.subtotal, 'El subtotal debe existir')
    assert.exists(createInvoice.message.discount, 'El descuento debe existir')
    assert.exists(createInvoice.message.tax, 'El impuesto debe existir')
    assert.exists(createInvoice.message.total, 'El total debe existir')
    assert.exists(createInvoice.message.totalPaid, 'El total pagado debe existir')
    assert.exists(createInvoice.message.balance, 'El saldo debe existir')

    // Afirmar que el mensaje tiene forma y método de pago
    assert.exists(createInvoice.message.paymentForm, 'La forma de pago debe existir')
    assert.exists(createInvoice.message.paymentMethod, 'El método de pago debe existir')

    // Afirmar que el mensaje tiene información del vendedor
    assert.exists(createInvoice.message.seller, 'La información del vendedor debe existir')
    assert.exists(createInvoice.message.seller.id, 'El ID del vendedor debe existir')
    assert.exists(createInvoice.message.seller.name, 'El nombre del vendedor debe existir')

    // Afirmar que el mensaje tiene plantilla de impresión
    assert.exists(createInvoice.message.printingTemplate, 'La plantilla de impresión debe existir')
    assert.exists(createInvoice.message.printingTemplate.id, 'El ID de la plantilla de impresión debe existir')
    assert.exists(createInvoice.message.printingTemplate.name, 'El nombre de la plantilla de impresión debe existir')

    // Afirmar que los arrays de items y pagos existen y no están vacíos
    // assert.isArray(createInvoice.message.items, 'Los items deben ser un array')
    // assert.isArray(createInvoice.message.payments, 'Los pagos deben ser un array')
    // assert.isAbove(createInvoice.message.items.length, 0, 'Debe haber al menos un item')
    // assert.isAbove(createInvoice.message.payments.length, 0, 'Debe haber al menos un pago')
  })
  test('creación de nota de credito', async ({ assert }) => {
    const createCreditNotes = await alegraService.createCreditNotes(8326)
    console.log(createCreditNotes)
  })
  test('validar eliminación de factura', async ({ assert }) => {
    const deleteInvoice = await alegraService.deleteInvoice('338')
    console.log(deleteInvoice)
  })
  test('validar anulación de factura', async ({ assert }) => {
    const cancelInvoice1 = await alegraService.cancelInvoice('337')
    console.log(cancelInvoice1)
    const cancelInvoice2 = await alegraService.cancelInvoice('336')
    console.log(cancelInvoice2)
    const cancelInvoice3 = await alegraService.cancelInvoice('335')
    console.log(cancelInvoice3)
    const cancelInvoice4 = await alegraService.cancelInvoice('338')
    console.log(cancelInvoice4)
  })
})
