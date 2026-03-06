import { DiscountObject, productsDiscount } from 'App/Interfaces/Discounts/discountInterface'

export default class DiscountService {
  static handleDiscountTypes(dataDiscount: DiscountObject) {
    if (dataDiscount.couponName.includes('promo50')) {
      return this.discountByPromo50(dataDiscount)
    }
    return dataDiscount.products
  }

  private static discountByPromo50(dataDiscount: DiscountObject): productsDiscount[] {
    const { products, discountAmount, valueIVA } = dataDiscount

    // Validar que haya productos
    if (products.length === 0) {
      throw new Error('No hay productos para aplicar el descuento.')
    }

    // Encontrar el producto de menor valor
    const minValueProduct = this.findMinValueProduct(products)

    // Calcular el subtotal del producto de menor valor
    const productSubtotal = minValueProduct.netUnitValue * (1 + valueIVA) * minValueProduct.quantity

    // Calcular el porcentaje de descuento basado en el descuento total y el subtotal del producto de menor valor
    const discountPercentage = (discountAmount / productSubtotal) * 100

    // Aplicar el descuento al producto de menor valor
    this.applyDiscountToProduct(minValueProduct, discountPercentage)

    // Establecer el descuento de los demás productos en cero
    this.resetDiscountsForOtherProducts(products, minValueProduct)

    return products // Devolver la lista de productos modificada
  }

  // Función para encontrar el producto de menor valor
  static findMinValueProduct(products: productsDiscount[]): productsDiscount {
    return products.reduce((minProduct, currentProduct) => {
      return currentProduct.netUnitValue < minProduct.netUnitValue ? currentProduct : minProduct
    })
  }
  // Función para aplicar el descuento a un producto
  static applyDiscountToProduct(product: productsDiscount, discountPercentage: number): void {
    product.discount = Math.min(discountPercentage, 100)
  }
  // Función para calcular el porcentaje de descuento
  static calculateDiscountPercentage(subTotal: number, discount: number): number {
    return (discount / subTotal) * 100
  }

  // Función para restablecer los descuentos de otros productos
  static resetDiscountsForOtherProducts(products: productsDiscount[], minValueProduct: productsDiscount): void {
    for (const product of products) {
      if (product !== minValueProduct) {
        product.discount = 0
      }
    }
  }
}
