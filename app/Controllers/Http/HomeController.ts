import Env from '@ioc:Adonis/Core/Env'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import HomeService from 'App/Services/HomeService'
import PrismicService from 'App/Services/PrismicService'
import ProductService from 'App/Services/ProductService'
// import BigcommerceService from 'App/Services/BigcommerceService'
// import * as prismic from '@prismicio/client'
// import fetch from 'node-fetch'
import cache from 'App/Services/CacheService'

export default class HomeController {
  protected readonly cacheHome = `${Env.get('VARIABLE_BRAND')}-${Env.get('COUNTRY_CODE')}-home`
  protected readonly cacheFeaturedProducts = `${Env.get('VARIABLE_BRAND')}-${Env.get('COUNTRY_CODE')}-featured`
  protected readonly cacheRecomendedProducts = `${Env.get('VARIABLE_BRAND')}-${Env.get('COUNTRY_CODE')}-recomended`
  protected readonly nodeEnv = Env.get('NODE_ENV') !== 'development'

  public async index({}: HttpContextContract) {
    if (this.nodeEnv && (await cache.has(this.cacheHome))) {
      return await cache.get(this.cacheHome)
    }
    // const endpoint = prismic.getEndpoint(Env.get('ENDPOINT_PRISMIC'))
    // const client = prismic.createClient(endpoint, { accessToken: Env.get('PRISMIC_ACCESS_TOKEN'), fetch })
    const document = await PrismicService.getDocument(Env.get('ENDPOINT_PRISMIC'), 'home')
    const hero = HomeService.getHero(document.data)
    const featured = HomeService.getFeatured(document.data)
    const principal_categories = HomeService.getPrincipalCategories(document.data)
    const categories = await HomeService.getCategories(document.data)
    // const featuredProducts =  await BigcommerceService.getFeaturedProducts()
    const banner = HomeService.getBanner(document.data)
    const reviews = HomeService.getReviews(document.data)
    // const recommendedProducts =  await BigcommerceService.getRecommendedProducts()
    const initiatives = HomeService.getInitiatives(document.data)
    // const brands = await BigcommerceService.getBrands()
    const blogs_prismic = await PrismicService.getDocument(Env.get('ENDPOINT_PRISMIC'), 'blogs')
    const blogs = await PrismicService.getBlogs('', blogs_prismic.data)
    let blogs_shorts = blogs.slice(0, 5)
    const instagram = HomeService.getInstagram(document.data)
    const remaining_time = HomeService.getSoloX(document.data)
    const values_categories = Env.get('COUNTRY_CODE') == 'CL' ? HomeService.getValuesCategories(document.data) : []
    let arrayHome = {
      slider: hero,
      featured: featured,
      principal_categories: principal_categories,
      categories: categories,
      banner: banner,
      reviews: reviews,
      initiatives: initiatives,
      blogs: blogs_shorts,
      instagram: instagram,
      remaining_time,
      values_categories: values_categories
    }
    if (this.nodeEnv) {
      await cache.set(this.cacheHome, arrayHome)
    }
    return arrayHome
  }

  public async featured_products({}: HttpContextContract) {
    if (this.nodeEnv && (await cache.has(this.cacheFeaturedProducts))) {
      return await cache.get(`${Env.get('VARIABLE_BRAND')}-${Env.get('COUNTRY_CODE')}-featured`)
    }
    const featuredProducts = await ProductService.getFeaturedProducts()
    if (this.nodeEnv) {
      await cache.set(this.cacheFeaturedProducts, featuredProducts)
    }
    return featuredProducts
  }

  public async recommended_products({}: HttpContextContract) {
    if (this.nodeEnv && (await cache.has(this.cacheRecomendedProducts))) {
      return await cache.get(this.cacheRecomendedProducts)
    }
    let recommended_products = await ProductService.getRecommendedProducts()
    if (this.nodeEnv) {
      await cache.set(this.cacheRecomendedProducts, recommended_products)
    }
    return recommended_products
  }

  public async mom_day({}: HttpContextContract) {
    // const endpoint = prismic.getRepositoryEndpoint(Env.get('ENDPOINT_PRISMIC'))
    // const client = prismic.createClient(endpoint, {
    //   accessToken: Env.get('PRISMIC_ACCESS_TOKEN'),
    //   fetch,
    // })
    const document = await PrismicService.getDocument(Env.get('ENDPOINT_PRISMIC'), 'mom_day')
    const mom_day = await HomeService.getMomDay(document.data)

    return mom_day
  }
}
