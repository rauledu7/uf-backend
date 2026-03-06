export interface DataReport {
  producto: string
  mes: string
  suma_subtotal_neto: string
  suma_subtotal_bruto: string
  suma_de_costo_neto: string
  suma_de_impuestos: string
  suma_de_cantidad: number
  año: number | string
  ciudad: string
  cliente: string
  comuna: string
  día: string | number
  fecha_de_documento: string | number
  marca: string
  tipo_de_producto: string
  tipo_de_movimiento: string
  vendedor: string
  descuento_por_cupon: string | number
  id_cupon: string | null
  id_order: number
  customer_email: string
}

export interface reportDTO {
  name_product: string
  type: string
  brand: string
  price_ex_tax: string
  price_subtotal_neto: string
  price_inc_tax: string
  tax: string
  quantity: number
  discount: number
  client: string
  commune: string
  city: string
  date_created: string
  month: string
  year: number
  day: string
  movement_type: string
  seller: string
  name_coupon: string | null
  order_id: number
  email: string
  hours: string
}

export interface Report extends DataReport {}
