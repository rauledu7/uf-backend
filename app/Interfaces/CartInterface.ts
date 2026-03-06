export interface CarInterface {
  customer_id?: number
  email: string
  line_items: {
    quantity: number
    product_id: number
    variant_id?: number
    list_price?: number
    name?: string
  }[]
  channel_id?: number
  currency?: {
    code: string
  }
  locale?: string
}
