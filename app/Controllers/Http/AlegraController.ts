import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import AlegraService from 'App/Services/Alegra/AlegraService'
import OrdersController from './OrdersController'
import BigcommerceService from 'App/Services/BigcommerceService'

export default class AlegraController {
  constructor(
    protected readonly alegraService = new AlegraService(),
    private readonly orderController = new OrdersController()
  ) {}
  public async createInvoice({ response, request }: HttpContextContract) {
    const order_id = request.param('order_id')
    if (order_id === undefined) {
      return response.status(400).json({ status: 400, error: 'Bad request', message: 'order_id is required' })
    }
    const createInvoice = await this.alegraService.createDocs(order_id)
    return response.status(200).json(createInvoice)
  }
  public async createNoteCredit({ response, request }: HttpContextContract) {
    const order_id = request.param('order_id')
    const arrayIdOrders = request.body() || []
    if (order_id === undefined && arrayIdOrders.length <= 0) {
      return response
        .status(400)
        .json({ status: 400, error: 'Bad request', message: 'order_id is required or send a list of order id numbers' })
    }
    if (arrayIdOrders.length > 0 && order_id === undefined) {
      const result: any = []

      for (const order_id of arrayIdOrders as number[]) {
        const createNoteCredit = await this.alegraService.createCreditNotes(order_id)
        result.push({ order_id, message: createNoteCredit })
      }
      return response.status(200).json(result)
    }
    const createNoteCredit = await this.alegraService.createCreditNotes(order_id)
    return response.status(200).json(createNoteCredit)
  }
  public async deleteInvoice({ response, request }: HttpContextContract) {
    const invoice_id = request.param('invoice_id')
    if (invoice_id === undefined) {
      return response.status(400).json({ status: 400, error: 'Bad request', message: 'invoice_id is required' })
    }
    const deleteInvoice = await this.alegraService.deleteInvoice(invoice_id)
    return response.status(200).json(deleteInvoice)
  }
  public async cancelInvoice({ response, request }: HttpContextContract) {
    const invoice_id = request.param('invoice_id')
    if (invoice_id === undefined) {
      return response.status(400).json({ status: 400, error: 'Bad request', message: 'invoice_id is required' })
    }
    const cancelInvoice = await this.alegraService.cancelInvoice(invoice_id)
    return response.status(200).json(cancelInvoice)
  }
  public async getInvoice({ request, response }: HttpContextContract) {
    const { invoice_id = null } = request.param('invoice_id') || {}
    const { order_id = null } = request.qs() || {}
    if (order_id) {
      const invoice = await this.alegraService.getPaymentInvoice(order_id)
      return response.status(200).json(invoice)
    }
    if (!invoice_id) {
      return response.status(400).json({ status: 400, error: 'Bad request', message: 'invoice_id is required' })
    }
    const getInvoice = await this.alegraService.getInvoice(invoice_id)
    return response.status(200).json(getInvoice)
  }
  public async createInvoiceContraEntrega({ response, request }: HttpContextContract) {
    const order_id = request.param('order_id')

    try {
      if (order_id === undefined) {
        return response.status(400).json({ status: 400, error: 'Bad request', message: 'order_id is required' })
      }
      const createInvoice = await this.alegraService.createDocs(order_id)
      const status = 10
      let validateStatusOrder = await BigcommerceService.getOrderById(order_id)
      if (validateStatusOrder.status_id == 9) {
        await this.orderController.update_order(order_id, status, 'Pagado en contra entrega')
      }

      return response.status(200).json(createInvoice)
    } catch (error) {
      console.log(
        `Error durante la creación de factura y actualización de estado de pedido ${order_id} contraentrega`,
        error
      )
      return response.status(500).json({ status: 500, error: 'Error desconocido', message: error.message })
    }
  }
}
