export interface ProductNosto {
  url: string
  product_id: string
  name: string
  image_url: string
  price_currency_code: string
  availability: string
  rating_value?: string
  review_count?: string
  categories: string[] //  "sale","sale/summer", "sale/summer/shirts", "sale/summer/shirts/long-sleeve-shirts"
  description?: string
  price: number
  list_price?: number
  brand?: string | undefined
  tag1?: string[] | undefined // red, green, blue
  tag2?: string[] | undefined // women, promo:mens
  tag3?: string[] | undefined // foldable
  date_published?: string // "2013-­04-­23"
  variation_id?: string
  alternate_image_urls: string[]
  variations?: VariantsCurrencies
  inventory_level?: number
  supplier_cost?: number
  custom_fields?: CustomFields
  skus?: Skus[]
}

export enum Stock {
  inStock = 'InStock',
  outStock = 'OutOfStock'
}

export type VariantsCurrencies = {
  [key: string]: {
    price_currency_code: string
    price: number
    availability: Stock
    list_price: number
  }
}

export type CustomFields = {
  [key: string]: any
}

export type Skus = {
  id: string
  name: string
  price: number
  list_price: number
  url: string
  image_url: string
  availability: Stock
  inventory_level: number
  custom_fields: CustomFields
}

export type OptionsValues = {
  [key: string]: string | number | boolean
}
