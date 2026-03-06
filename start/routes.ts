/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Application from '@ioc:Adonis/Core/Application'
import Env from '@ioc:Adonis/Core/Env'
import HealthCheck from '@ioc:Adonis/Core/HealthCheck'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Logger from '@ioc:Adonis/Core/Logger'
import Route from '@ioc:Adonis/Core/Route'

Route.get('/feed.xml', async ({ response }: HttpContextContract) => {
  const xmlPath = Application.publicPath('../feed.xml')
  return response.download(xmlPath)
})

Route.group(() => {
  Route.get('/menu', 'MenusController.index')
  Route.get('/home', 'HomeController.index')
  Route.get('/featured-products', 'HomeController.featured_products')
  Route.get('/recommended-products', 'HomeController.recommended_products')
  Route.get('/product/:id/:cat_id?', 'ProductsController.show')
  Route.get('/product-principal/:id/:cat_id?', 'ProductsController.showPrincipal')
  Route.get('/merchant-center', 'ProductsController.merchantCenter')
  Route.get('/filters/:id/:parent?/:brand_id?', 'CategoriesController.filter')
  Route.get('/banner/:id/:parent?/:brand_id?', 'CategoriesController.bannerCategory')
  Route.get('/advanced/:id/:parent?/:brand_id?', 'CategoriesController.filterCategory')
  Route.get('/global-filters', 'CategoriesController.globalFilters')
  Route.get('/categories', 'CategoriesController.index')
  Route.get('/category/:id', 'CategoriesController.show')
  Route.get('/products-advanced/*', 'ProductsController.advanced')
  Route.get('/products/warningstock', 'ProductsController.getWarningStockProducts')
  Route.get('/products/:cat_id/:brand_id?/:advanced?/:min_price?/:max_price?/:order?/:page', 'ProductsController.index')
  Route.get('/products-filters/:cat_id/:brand_id?/:min_price?/:max_price?/:order?/:page', 'ProductsController.filters')
  Route.get('/out-of-stock/:cat_id/:brand_id?/:min_price?/:max_price?/:order?/:page', 'ProductsController.outOfStock')
  Route.get('/products-links/', 'ProductsController.productsLinks')
  Route.get('/related-products/:productId', 'ProductsController.relatedProducts')
  Route.post('/review/:id', 'ReviewsController.store')
  Route.get('/review/:id', 'ReviewsController.index')
  Route.get('/stores', 'StoresController.index')
  Route.get('/infoGlobal', 'GlobalsController.index')
  Route.get('/pickups', 'GlobalsController.pickup')
  Route.get('/shipping/:weight/:commune', 'GlobalsController.enviame')
  Route.get('/blogs', 'BlogsController.index')
  Route.get('/blog/:id', 'BlogsController.show')
  Route.post('/orders', 'OrdersController.store').middleware('checkToken')
  Route.post('/payment-webpay', 'PaymentsChileController.create_webpay')
  Route.post('/status-webpay', 'PaymentsChileController.status_webpay')
  Route.post('/linkify', 'PaymentsChileController.verifyPaymentLinkify')
  Route.get('/linkify', 'PaymentsChileController.getPaymentLinkify')
  Route.post('validate-linkify', 'PaymentsChileController.validateLinkify')
  Route.get('confirmation-linkify/:id', 'PaymentsChileController.confirmationLinkify')
  Route.post('/order-status', 'IntegrationsController.update_status_order')
  Route.post('/newsletter', 'IntegrationsController.newsletter')
  Route.get('/regions', 'GlobalsController.regions')
  Route.get('/communes/:region_id', 'GlobalsController.communes_by_region')
  Route.get('/armed-price/:commune_id/:sku', 'IntegrationsController.get_price_armed')
  Route.get('/status-armed/:sku', 'IntegrationsController.get_status_armed')
  Route.get('/delete-product', 'IntegrationsController.deleteProductsFromBigCommerce') //Esta es la ruta para sincronizar los productos en el mantenedor
  Route.post('update-order', 'OrdersController.updateStatusOrder') // para actualizar status de la orden de ser necesario
  Route.post('/notificationinventory', 'IntegrationsController.notificationProductStock')
  Route.get('/order/:order_id/:shipping?', 'OrdersController.show')
  Route.post('/waiting-list', 'ProductsController.waitList')
  Route.post('/send-waiting-list', 'ProductsController.sendWaitList')
  Route.post('/coupon', 'OrdersController.coupon')
  Route.get('/coupons/:id', 'CouponsController.show')
  Route.post('/sendEmail', 'IntegrationsController.generate_email')
  Route.get('deliverys-communes', 'DeliverysCommuneController.getAllCommunesInfo')
  Route.get('deliverys-communes/:id', 'DeliverysCommuneController.getCommuneById')
  Route.patch('deliverys-communes/:id', 'DeliverysCommuneController.updateCommuna')
  Route.post('/save-deliverys', 'DeliverysCommuneController.saveDataInDB')
  Route.get('/mom-day', 'HomeController.mom_day')
  // routes para sincroizas aleertas de stock
  Route.get('stock-security-alerts', 'SynchronizationController.syncAlertStock')
  // Routes para gestionar las sincronizaciones
  Route.get('/obtener-reservas', 'ProductsController.getReserves') // Esta es la ruta para obtener los productos en reserva y agregarlos a un documento excel en Drive
  Route.get('/sincronizar-productos', 'SynchronizationController.syncProducts') //Esta es la ruta para sincronizar los productos en el mantenedor
  Route.get('/sincronizar-categorias', 'SynchronizationController.syncCategories') //Esta es la ruta para sincronizar los categorias en el mantenedor
  Route.get('/sincronizar-packs-reserva', 'SynchronizationController.syncPacksTypeReserve') //Esta es la ruta para sincronizar los packs en reserva
  Route.get('/sincronizar-packs', 'SynchronizationController.syncProductsTypePacks') //Esta es la ruta para sincronizar los packs en reserva
  Route.get('/sincronizar-marcas', 'SynchronizationController.syncBrands') //Esta es la ruta para sincronizar las marcas en el mantenedor
  Route.get('/sincronizar-opciones', 'SynchronizationController.syncAllOptions') //Esta es la ruta para sincronizar las opciones en el mantenedor
  Route.get('/sincronizar-menu', 'SynchronizationController.syncMenu') //Esta es la ruta para sincronizar los categorias visibles (menu) en el mantenedor
  Route.get('/sincronizar-filtros', 'SynchronizationController.syncFiltersOfProducts')
  Route.get('/sincronizaciones', 'SynchronizationController.syncAll')

  Route.get('/coupon-email/:email', 'CouponsController.coupon_email') //Ruta para enviar cupon de descuento por email (Para SAC)
  Route.get('/popups', 'GlobalsController.popUps') // Esta es la ruta para  obtener los popups
  Route.get('/showbanner', 'GlobalsController.bannerInHome') // Esta es la ruta para  el banner en home
  Route.post('/siigo', 'GlobalsController.bulkSiigo')
  //Route.get('/popup-marketing', 'GlobalsController.popupGrowMarketing')
  Route.get('vacancies', 'WorkWithUsController.index')
  Route.post('order/:id/:complete?', 'OrdersController.ready_for_retirement')
  Route.get('/doofinder', 'DoofinderController.productsListDoofinder')
  Route.get('/doofinder-view-products', 'DoofinderController.ViewCatalogProducts') // para ver estructura del catalogo doofinder
  Route.get('/variants', 'VariantsController.index')
  Route.post('/enviame', ({ request, response }) => {
    const body = request.body()
    Logger.info(body, 'Payload Enviame')

    return response.send({ status: 200, msg: 'Solicitud completada con exito' })
  })
  Route.get('stock-by-bsale/:sku', 'ProductsController.getStockByBsale')

  Route.group(() => {
    Route.post('abandoned', 'AbandonedCartsController.create') //✅
    Route.get('abandoned/:cartId', 'AbandonedCartsController.show')
    Route.post('user/:cartId', 'AbandonedCartsController.edit')
    Route.put('abandoned/:cartId', 'AbandonedCartsController.update')
    Route.delete('abandoned/:cartId', 'AbandonedCartsController.destroy')
  }).prefix('cart')

  //giftcards routes
  Route.group(() => {
    Route.post('store', 'GiftCardsController.store')
    Route.get('/:code', 'GiftCardsController.show')
    Route.put('update', 'GiftCardsController.update')
    Route.put('update-expiry', 'GiftCardsController.updateExpireDate')
    // Route.delete('destroy/:id', 'GiftCardsController.destroy')
  }).prefix('giftcards')

  Route.group(() => {
    Route.group(() => {
      Route.get('/:id', 'OrdersController.get_orders_by_customers')
      Route.get('/downloads/:user', 'OrdersController.get_downloads_by_customer')
    })
      .prefix('/orders')
      .middleware('auth')
    Route.group(() => {
      Route.post('', 'AddressesController.store')
      Route.get('/:id', 'AddressesController.show')
      Route.delete('/:id', 'AddressesController.destroy')
      Route.put('', 'AddressesController.update')
    })
      .prefix('/addresses')
      .middleware('auth')
    Route.post('/sign-up', 'UsersController.store')
    Route.post('/login', 'UsersController.login')
    Route.post('/forgotPassword', 'UsersController.resetPassword')
    Route.put('/edit', 'UsersController.edit').middleware('auth')
    Route.post('/validate', 'UsersController.isValid').middleware('auth')
    Route.post('/logout', 'UsersController.destroy').middleware('auth')
    Route.post('/newPassword/:user?', 'UsersController.newPassword').middleware('auth')
    Route.get('/user', 'UsersController.show').middleware('auth')
    Route.post('/validateUser', 'UsersController.index')
  }).prefix('/auth')

  //ruta de bold
  Route.group(() => {
    if (Env.get('COUNTRY_CODE') === 'CO') {
      Route.post('/notifications', 'PaymentsColombiaController.notificationsBold')
    }
  }).prefix('/bold')
  // rutas de mercadopago para los diferentes paises
  Route.group(() => {
    if (Env.get('COUNTRY_CODE') === 'CO') {
      Route.post('/createpayment/:order_id', 'PaymentsColombiaController.createPayment')
      Route.get('/success-payment/:order_id', 'PaymentsColombiaController.succesPayment')
      Route.get('/pending-payment/:order_id', 'PaymentsColombiaController.pendingPayment')
      Route.get('/failure-payment/:order_id', 'PaymentsColombiaController.failurePayment')
      Route.post('/notification', 'PaymentsColombiaController.notifications')
      Route.get('/verify-payment/:order', 'PaymentsColombiaController.verifyPayment')
    }
    if (Env.get('COUNTRY_CODE') === 'PE') {
      Route.post('/createpayment/:order_id', 'PaymentsPeruController.createPayment')
      Route.get('/success-payment/:order_id', 'PaymentsPeruController.succesPayment')
      Route.get('/pending-payment/:order_id', 'PaymentsPeruController.pendingPayment')
      Route.get('/failure-payment/:order_id', 'PaymentsPeruController.failurePayment')
      Route.post('/notification', 'PaymentsPeruController.notifications')
      Route.get('/verify-payment/:order', 'PaymentsPeruController.verifyPayment')
    }
    if (Env.get('COUNTRY_CODE') === 'CL') {
      Route.post('/createpayment/:order_id', 'PaymentsChileController.createPaymentMercadopago')
      Route.get('/success-payment/:order_id', 'PaymentsChileController.succesPaymentMercadopago')
      Route.get('/pending-payment/:order_id', 'PaymentsChileController.pendingPaymentMercadopago') //
      Route.get('/failure-payment/:order_id', 'PaymentsChileController.failurePaymentMercadopago')
      Route.post('/notification', 'PaymentsChileController.notificationsMercadopago')
      Route.get('/verify-payment/:order', 'PaymentsChileController.verifyPaymentMercadopago')
    }
  }).prefix('/mercadopago')

  Route.group(() => {
    Route.get('/save-departments', 'ArmingController.saveDepartaments')
    Route.get('/save-cities', 'ArmingController.saveCities')
    Route.get('/save-products-arming', 'ArmingController.saveArmingProducts')
  })
  Route.group(() => {
    Route.get('/departments', 'GlobalsController.deparments_' + Env.get('COUNTRY_CODE'))
    Route.get('/cities/:department_id', 'GlobalsController.cities_' + Env.get('COUNTRY_CODE'))
    Route.get('/shipping/:weight/:code', 'GlobalsController.shipping_' + Env.get('COUNTRY_CODE'))
    Route.post('/contraentrega/:order_id?', 'OrdersController.fulppi_order_update')
  }).prefix('/colombia')

  if (Env.get('COUNTRY') === 'Peru') {
    Route.group(() => {
      Route.get('/departments', 'GlobalsController.deparments_' + Env.get('COUNTRY_CODE'))
      Route.get('/departements', 'GlobalsController.departements')
      Route.get('/cities/:department_id', 'GlobalsController.cities_' + Env.get('COUNTRY_CODE'))
      Route.get('/shipping/:weight/:code', 'GlobalsController.shipping_' + Env.get('COUNTRY_CODE'))
      Route.get('deliverys-communes', 'DeliverysCommuneController.getDeliveryTypePeru')
      Route.post('token-izipay', 'PaymentsPeruController.createIziPay')
      Route.post('status-izipay', 'PaymentsPeruController.statusIziPay')
      Route.post('powerpay', 'PaymentsPeruController.createPowerpay')
      Route.post('status-powerpay', 'PaymentsPeruController.statusPowerpay')
      Route.post('notification-powerpay', 'PaymentsPeruController.notificationPowerpay')
    }).prefix('/peru')
  }

  Route.group(() => {
    if (Env.get('COUNTRY_CODE') === 'CO') {
      Route.get('/createpayment/:orderId', 'WompiController.createTransaction')
      Route.post('/payments', 'WompiController.notifications')
      Route.get('/verify-payments', 'WompiController.payments')
    }
  }).prefix('/wompi')

  //Generar factura bsale y envio a urbano en Perú
  Route.group(() => {
    if (Env.get('COUNTRY_CODE') === 'PE') {
      Route.get('/bsale-peru/:order_id', 'BsaleController.createBsalePeru').middleware('checkToken')
      Route.get('/urbano-peru/:orderId', 'UrbanoController.createUrbano').middleware('checkToken')
    }
  })
  // mailchimp: envio de datos de cliente y reviews
  Route.get('/mailchimp/:orderId', 'MailchimpController.sendDataClient')
  Route.get('/mailchimp-promote-review', 'MailchimpController.promoteReview')

  // ruta para cambiar el valor de la columna express delivery times en la tabla deliverysCommunes para activar o desactivar los envíos sameday.
  Route.put('/sameday', 'DeliverysCommuneController.sameDay')

  Route.group(() => {
    Route.get('/products', 'NostosController.showCatalogProduct')
    Route.get('/index-products', 'NostosController.indexCatalog')
  }).prefix('/nosto')

  Route.group(() => {
    Route.post('create', 'CouponsController.create')
    Route.post('validate', 'CouponsController.show')
  }).prefix('coupon')

  Route.get('/fullpi-tracking/:tracking_id', 'FullpiController.getTrackingOrder')
  //para el informe comercial
  Route.get('/report-sale/:orderId', 'ReportSaleController.viewReport')
  // para generar factura bsale en chile
  Route.get('bsale-chile/:order_id', 'BsaleController.createBsaleChile').middleware('checkToken')
  Route.post('bulk-create', 'BsaleController.createBulk')
  Route.post('/getpoint', 'GetpointController.sendOrderToGetpoint')

  Route.post('/payment-giftcard/:order_id', 'PaymentsChileController.paymentGiftCard').middleware('checkToken')

  // Alegra routes colombia
  if (Env.get('COUNTRY_CODE') === 'CO') {
    Route.post('/alegra/create-invoice/:order_id?', 'AlegraController.createInvoice')
    Route.delete('/alegra/delete-invoice/:invoice_id?', 'AlegraController.deleteInvoice')
    Route.post('/alegra/cancel-invoice/:invoice_id?', 'AlegraController.cancelInvoice')
    Route.get('/alegra/invoice/:invoice_id?', 'AlegraController.getInvoice')
    Route.post('/alegra/create-notecredit/:order_id?', 'AlegraController.createNoteCredit')
  }

  // fullpi y siigo de colombia
  Route.get('/fullpi/:orderId', 'FullpiController.sendDataOrder').middleware('checkToken')
  Route.get('/siigo/:orderId', 'SiigoController.sendDataOrder').middleware('checkToken')
  Route.post('/siigo/create-invoices', 'SiigoController.createInvoiceBulk') //.middleware('checkToken')
  Route.get('redis', 'RedisController.refresh')
  Route.get('health', async ({ response }) => {
    const report = await HealthCheck.getReport()
    return report.healthy ? response.ok(report) : response.badRequest(report)
  })
  Route.group(() => {
    Route.post('create', 'CartController.create')
    Route.put('update/:cartId', 'CartController.update')
    Route.put('/:cartId/convert', 'CartController.convert')
    Route.get('/:cartId', 'CartController.get')
    Route.get('/', 'CartController.cartsByQuery')
    Route.delete('/:cartId', 'CartController.delete')
  }).prefix('/cart')
}).prefix('/api')
