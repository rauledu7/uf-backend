//import Env from '@ioc:Adonis/Core/Env';
import { Report, reportDTO } from 'App/Interfaces/ReportSale/ReportInterface'

export default class InfoReport implements Report {
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
  hours: string
  constructor(data: reportDTO) {
    this.producto = data.name_product
    this.mes = data.month
    ;(this.suma_subtotal_neto = data.price_subtotal_neto), (this.suma_subtotal_bruto = data.price_ex_tax)
    this.suma_de_costo_neto = data.price_inc_tax
    this.suma_de_impuestos = data.tax
    this.suma_de_cantidad = data.quantity
    this.año = data.year
    this.ciudad = data.city
    this.cliente = data.client
    this.comuna = data.commune
    this.día = data.day
    this.fecha_de_documento = data.date_created
    this.marca = data.brand
    this.tipo_de_producto = data.type
    this.tipo_de_movimiento = data.movement_type
    this.vendedor = data.seller
    this.descuento_por_cupon = data.discount
    this.id_cupon = data.name_coupon
    this.id_order = data.order_id
    this.customer_email = data.email
    this.hours = data.hours
  }
}
