// export interface ProcessPaymentInterface {
//   successfultPayment(order_id: string, payment_method: string, type_method: string)
//   // failedPayment(order_id: string, type_method: string)
//   // pendingPayment?(paymentId: string)
// }

export interface ProcessPaymentInterfaceCO {
  successfultPayment(order_id: string, payment_method: string, type_method: string, payment_id?: string)
  failedPayment(order_id: string, type_method: string)
  pendingPayment?(paymentId: string)
}

export interface ProcessPaymentInterface {
  successfultPayment(data: PaymentConfirmation)
  // failedPayment(order_id: string, type_method: string)
  // pendingPayment?(paymentId: string)
}
export interface PaymentDetails {
  status: string
  status_detail: string
  payment_type_id: string
  payment_method_id: string
  external_reference: string
  order_id: string | number
  payment_id: string
  installments: number
  payment_method: string
  card_id: string
  card_last_four_digits: string
  cardholder: { identification: { number: string; type: string }; name: string }
  collector_id: number
  currency_id: string
  date_approved: string
  date_created: string
  transaction_amount: number
  transaction_amount_refunded: number
  installment_amount: number
  net_received_amount: number
  total_paid_amount: number
  statement_descriptor: string
  info: {
    digits: string
    quotas: number
    payment_method: string
    id: string
    operator: string
  }
}

export interface PaymentConfirmation {
  status: string // Estado general (ej. 'approved')
  information: string // Información adicional (ej. 'Pago acreditado')
  api_address: string // Dirección de la API (ej. 'https://preapi.ultimatefitness.cl')
  details: PaymentDetails // Detalles del pago
}
