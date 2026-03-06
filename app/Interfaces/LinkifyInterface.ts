export interface PaymentInfo {
  invoice_type: 'remote'
  invoice_id: string
  merchant: string
  amount: number
  description: string
  rut: string
  date: string
  email: string
  endpoint: string
}

export interface ValidationResponse {
  uuid: string
  invoice_id: string
  amount: number
  description: string
  rut: string
  date: string
  email: string
  status: StatusTransfer
}

export type StatusTransfer =
  | 'waiting transfer'
  | 'select transfers'
  | 'waiting notification'
  | 'failed notification'
  | 'completed'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'anulled'
  | 'waiting connection'
