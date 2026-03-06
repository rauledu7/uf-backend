import { InitPoint, OrderDTO } from './MercadopagoInterface'

export interface ServiceMercadopagoInterface {
  getDataOrder(order_id: string): Promise<OrderDTO>
  createOrderPay(order_id: string, session_id: string): Promise<InitPoint>
  confirmPayment(paymentId: string): Promise<PaymentConfirmation>
  verifyStatusPayment(order_id: string): Promise<PaymentInfo>
}

export interface PaymentInfo {
  id_mercadopago: string | number
  order: string
  first_name: string
  last_name: string
  phone: string
  status: string
  status_detail: string
  payment_type_id: string
  payment_method_id: string
  products: itemsProducts[]
}

export interface itemsProducts {
  quantity: string | number
  id: string | number
  title: string
  unit_price: string | number
}

export interface PaymentConfirmation {
  status: string
  status_detail: string
  payment_type_id: string
  payment_method_id: string
  external_reference: string
}
