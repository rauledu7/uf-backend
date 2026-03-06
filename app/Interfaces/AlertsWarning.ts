interface AlertsWarning {
  order_id: string | number
  brand: string // Nombre de la marca
  date: string // Fecha en formato de cadena
  customerName: string // Nombre del cliente
  email: string // Correo electrónico del cliente
  total: string // Total de la orden (puede ser un número en formato de cadena)
  brandImage: string // URL de la imagen de la marca
  products: string // URL de la imagen del producto
  templateNumber: number // Número de plantilla
  message: string
}

export type AlertStock = Partial<Pick<AlertsWarning, 'templateNumber' | 'products' | 'brandImage' | 'message'>>
export type OrderAlertWarning = Partial<Omit<AlertsWarning, 'productImage'>>

export interface CustomAlert extends AlertStock, OrderAlertWarning {}

export type ProductStockSecurity = {
  title: string
  sku: string
  stock: number
  image: string
}
