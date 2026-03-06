export interface Address {
  address: string | null
  department: string | null
  city: string | null
}

export interface IdentificationObject {
  type: string
  number: string
}

export interface Client {
  id: string
  name: string
  identification: string
  phonePrimary: string | null
  phoneSecondary: string | null
  fax: string | null
  mobile: string | null
  email: string
  regime: string
  address: Address
  kindOfPerson: string
  identificationObject: IdentificationObject
}

export interface NumberTemplate {
  id: string
  prefix: string
  number: string
  text: string
  documentType: string
  fullNumber: string
  formattedNumber: string
  isElectronic: boolean
}

export interface Warehouse {
  id: string
  name: string
}

export interface Seller {
  id: string
  name: string
  identification: string
  observations: string
}

export interface PriceList {
  id: string
  name: string
}

export interface TaxCategory {
  id: string
  idParent: string
  name: string
  text: string
  code: string | null
  description: string
  type: string
  readOnly: boolean
  nature: string
  blocked: string
  status: string
  categoryRule: {
    id: string
    name: string
    key: string
  }
  use: string
  showThirdPartyBalance: boolean
}

export interface Tax {
  id: string
  name: string
  percentage: string
  description: string
  status: string
  deductible: string
  type: string
  categoryFavorable: TaxCategory
  categoryToBePaid: TaxCategory
  rate: string | null
  amount: number
}

export interface Item {
  name: string
  description: string | null
  price: number
  discount: number
  reference: string | null
  quantity: number
  id: string
  productKey: string | null
  unit: string
  tax: Tax[]
  total: number
}

export interface Payment {
  id: string
  prefix: string | null
  number: string
  date: string
  amount: number
  paymentMethod: string
  observations: string | null
  anotation: string | null
  status: string
}

export interface Stamp {
  legalStatus: string
  cufe: string
  barCodeContent: string
  date: string
  warnings: string[]
}

export interface PrintingTemplate {
  id: string
  name: string
  pageSize: string
  supportedPdfEngine: string | null
}

export interface Invoice {
  id: string
  date: string
  dueDate: string
  datetime: string
  observations: string | null
  anotation: string | null
  termsConditions: string
  status: string
  client: Client
  numberTemplate: NumberTemplate
  subtotal: number
  discount: number
  tax: number
  total: number
  totalPaid: number
  balance: number
  decimalPrecision: string
  warehouse: Warehouse
  term: string
  type: string
  operationType: string
  paymentForm: string
  paymentMethod: string
  purchaseOrderNumber: string
  seller: Seller
  priceList: PriceList
  stamp: Stamp
  payments: Payment[]
  items: Item[]
  costCenter: string | null
  printingTemplate: PrintingTemplate
}
