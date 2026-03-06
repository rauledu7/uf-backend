export interface DiscountObject {
  subTotalAmount: number
  products: productsDiscount[]
  discountAmount: number
  couponName: string
  valueIVA: number
}
export interface productsDiscount {
  code?: string
  netUnitValue: number
  quantity: number
  taxId: string
  comment: string
  discount?: number
}
