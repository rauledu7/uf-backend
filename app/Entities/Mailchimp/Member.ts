import { NewMember, SuscribeUser } from 'App/Interfaces/Mailchimp/NewMember'

export default class Member implements NewMember {
  public firstName: string
  public lastName: string
  public email: string
  public city: string
  public address: string
  public phone: string
  public date: string
  public brand: string
  public coupon: string
  public venta: string
  public value: number | string
  public order: string | number
  public discount: string | number
  public country: string

  constructor(data: SuscribeUser) {
    this.firstName = data.firstName
    this.lastName = data.lastName
    this.email = data.email
    this.city = data.city
    this.address = data.address
    this.phone = data.phone
    this.date = data.date
    this.brand = data.brand
    this.coupon = data.coupon
    this.venta = data.venta
    this.value = data.value
    this.order = data.order
    this.discount = data.discount
    this.country = data.country
  }
}
