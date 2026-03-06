/* --------interface para las preferences de Mercadopago -------------------------------------------------------*/
export interface PreferencesDTO {
  items: ItemProduct[]
  payer: Payer
  back_urls: BackUrl
  auto_return: string
  payment_methods?: PaymentMethod
  notification_url?: string
  external_reference: string
  statement_descriptor: string //"statement_descriptor": "MINEGOCIO",
  shipments: Envios
  expires: true
  expiration_date_from?: String
  expiration_date_to?: string
  binary_mode?: boolean
}

export interface InitPoint {
  go_to_pay: string
}

export type ItemProduct = {
  id: string
  title: string
  // currency_id: string,
  unit_price: number
  quantity: number
}
export type Payer = {
  name: string
  surname: string
  email: string
  phone: PhonePayer
  identification: IdentificationPayer
  address: Address
}

export type PhonePayer = {
  area_code: string
  number: number
}
export type IdentificationPayer = {
  number: string
  type: string
}
export type Address = {
  street_name: string
}
export type BackUrl = {
  failure: string
  success: string
  pending?: string
}
export type Envios = {
  cost: number
  mode: string
  receiver_address?: receiverAddress
}
export type PaymentMethod = {
  excluded_payment_methods?: methodPay[] | null
  excluded_payment_types?: methodPay[] | null
  installments?: number
}
export type receiverAddress = {
  zip_code?: string
  street_name?: string
  street_number?: string
  floor?: string
  apartment?: string
  city_name?: null | undefined | string
  state_name?: null | undefined | string
  country_name?: null | undefined | string
}
/*-------------Interface DTO para el metodo getDataOrder en MercadopagoService  --------------------------------------------------------------------------------*/
export interface OrderDTO {
  name: string
  surname: string
  company: string
  email: string
  phone: string
  identification: string
  state: string
  city: string
  street: string
  productInfo: ProductInfo[]
  shipping_amount: string
}

export interface ProductInfo {
  id: string
  title: string
  currency_id: string
  unit_price: number
  quantity: number
}

type methodPay = {
  id: string
}
