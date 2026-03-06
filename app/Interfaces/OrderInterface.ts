export interface BillingAddress {
  first_name: string
  last_name: string
  company: string
  street_1: string
  street_2: string
  city: string
  state: string
  zip: string
  country: string
  country_iso2: string
  phone: string
  email: string
  form_fields: any[] // Puedes especificar un tipo más específico si lo conoces
}

export interface Fees {
  url: string
  resource: string
}

export interface Consignments {
  url: string
  resource: string
}

export interface Products {
  url: string
  resource: string
}

export interface ShippingAddresses {
  url: string
  resource: string
}

export interface Coupons {
  url: string
  resource: string
}

export interface Order {
  id: number
  customer_id: number
  date_created: string // Puedes usar Date si prefieres manejarlo como objeto Date
  is_tax_inclusive_pricing: boolean
  date_modified: string // Puedes usar Date si prefieres manejarlo como objeto Date
  date_shipped: string // Puedes usar Date si prefieres manejarlo como objeto Date
  status_id: number
  status: string
  subtotal_ex_tax: string
  subtotal_inc_tax: string
  subtotal_tax: string
  base_shipping_cost: string
  shipping_cost_ex_tax: string
  shipping_cost_inc_tax: string
  shipping_cost_tax: string
  shipping_cost_tax_class_id: number
  base_handling_cost: string
  handling_cost_ex_tax: string
  handling_cost_inc_tax: string
  handling_cost_tax: string
  handling_cost_tax_class_id: number
  base_wrapping_cost: string
  wrapping_cost_ex_tax: string
  wrapping_cost_inc_tax: string
  wrapping_cost_tax: string
  wrapping_cost_tax_class_id: number
  total_ex_tax: string
  total_inc_tax: string
  total_tax: string
  items_total: number
  items_shipped: number
  payment_method: string
  payment_provider_id: string | null
  payment_status: string
  refunded_amount: string
  order_is_digital: boolean
  store_credit_amount: string
  gift_certificate_amount: string
  ip_address: string
  ip_address_v6: string
  geoip_country: string
  geoip_country_iso2: string
  currency_id: number
  currency_code: string
  currency_exchange_rate: string
  default_currency_id: number
  default_currency_code: string
  staff_notes: string
  customer_message: string
  discount_amount: string
  coupon_discount: string
  shipping_address_count: number
  is_deleted: boolean
  ebay_order_id: string
  cart_id: string | null
  billing_address: BillingAddress
  fees: Fees
  is_email_opt_in: boolean
  credit_card_type: string | null
  order_source: string
  channel_id: number
  external_source: string | null
  consignments: Consignments
  products: Products
  shipping_addresses: ShippingAddresses
  coupons: Coupons
  external_id: string | null
  external_merchant_id: string | null
  tax_provider_id: string
  customer_locale: string
  external_order_id: string
  store_default_currency_code: string
  store_default_to_transactional_exchange_rate: string
  custom_status: string
}
