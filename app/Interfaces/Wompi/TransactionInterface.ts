export type createTransaction = {
  currency: 'COP'
  amountInCents: number
  reference: string
  publicKey: string
  signature: { integrity: string | void }
  redirectUrl?: string // Opcional
  expirationTime?: string // '2023-06-09T20:28:50.000Z', // Opcional
  taxInCents?: {
    // Opcional
    vat?: number
    consumption?: number
  }
  customerData?: {
    // Opcional
    email: string
    fullName: string
    phoneNumber: string
    phoneNumberPrefix: '+57'
    legalId: string
    legalIdType?: string
  }
  shippingAddress: {
    // Opcional
    addressLine1: string
    city: string
    phoneNumber: string
    region: string
    country: 'CO'
  }
}

export type createPaymentSource = {
  acceptance_token: string
  customer_email: string
  type: string // 'NEQUI',
  token: string
}
export enum transactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  VOIDED = 'VOIDED',
  DECLINED = 'DECLINED',
  ERROR = 'ERROR'
}

export enum typeStatus {
  PENDING = 'Transacción pendiente de pago',
  APPROVED = 'Transacción aprobada',
  VOIDED = 'Transacción anulada (sólo aplica para transacciones con tarjeta',
  DECLINED = 'Transacción rechazada',
  ERROR = 'Error interno del método de pago respectivo'
}

export type typeEventsDTO = {
  transaction_updated?: transactionStatus.APPROVED | transactionStatus.DECLINED | transactionStatus.VOIDED
  nequi_token_updated?: transactionStatus.APPROVED | transactionStatus.DECLINED
}

export type tokenizeCard = {
  number: string // Número de la tarjeta
  cvc: string // Código de seguridad de la tarjeta (3 o 4 dígitos según corresponda)
  exp_month: string // Mes de expiración (string de 2 dígitos)
  exp_year: string // Año expresado current 2 dígitos
  card_holder: string // Nombre del tarjetahabiente
}

export type transactionEventDTO = {
  event: 'transaction.updated'
  data: {
    transaction: {
      id: string
      amount_in_cents: number
      reference: string
      customer_email: string
      currency: string // "COP",
      payment_method_type: string // "NEQUI"
      redirect_url: string
      status: transactionStatus
      shipping_address: null | string
      payment_link_id: null | string
      payment_source_id: null | string
    }
  }
  environment: string //  "prod",
  signature: {
    properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents']
    checksum: string
  }
  timestamp: number
  sent_at: string
}
