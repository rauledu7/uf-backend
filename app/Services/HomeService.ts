import * as prismicH from '@prismicio/helpers'
import Category from 'App/Models/Category'
import moment from 'moment'

class HomeService {
  static getHero(data) {
    let arrayHero: any[] = []

    Promise.all(
      data.slider.map(function (elem, index) {
        let button = { url: elem.url.url, label: elem.button_text }
        let title = elem.title.length > 0 ? elem.title[0].text : ''
        let description = elem.description.length > 0 ? elem.description[0].text : ''
        let returnObjeto = {
          id: index,
          image: elem.image.url,
          image_mobile: elem.image.Mobile.url,
          title: title,
          description: description,
          button: button
        }
        arrayHero.push(returnObjeto)
      })
    )

    return arrayHero
  }

  static getFeatured(data) {
    let description = prismicH.asHTML(data.featured_description)
    let arrayFeatured = {
      title: data.featured_title[0].text,
      description: description,
      image: data.featured_image.url,
      video: data.featured_video
    }

    return arrayFeatured
  }

  static getPrincipalCategories(data) {
    let arrayCategories: any[] = []
    Promise.all(
      data.principal_categories.map(function (elem, index) {
        let returnObjeto = {
          id: index,
          image: elem?.image?.url ?? '',
          title: elem?.title?.[0]?.text ?? '',
          subtitle: elem?.subtitle?.[0]?.text ?? '',
          url: elem?.url ?? '',
        }
        arrayCategories.push(returnObjeto)
      })
    )

    return arrayCategories
  }

  static getValuesCategories(data) {
    let arrayCategories: any[] = []

    Promise.all(
      data.values_categories.map(function (elem, index) {
        let returnObjeto = {
          id: index,
          image: elem.image.url,
          title: elem.title ? elem.title[0].text : '',
          url: elem.url
        }
        arrayCategories.push(returnObjeto)
      })
    )

    return arrayCategories
  }

  static getBanner(data) {
    let description = prismicH.asHTML(data.why_description)
    let button = { url: data.why_url.url, label: data.why_text_button }
    let arrayBanner = {
      title: data.why_title[0].text,
      description: description,
      image: data.why_image.url,
      image_mobile: data.why_image.Mobile.url,
      button: button
    }

    return arrayBanner
  }

  static getReviews(data) {
    let arrayReviews: any[] = []

    Promise.all(
      data.home_reviews.map(function (elem, index) {
        let text = prismicH.asHTML(elem.text)
        let returnObjeto = {
          id: index,
          image: elem.image.url,
          title: elem.title[0].text,
          subtitle: elem.subtitle,
          description: text,
          valoration: elem.valoration
        }
        arrayReviews.push(returnObjeto)
      })
    )

    return arrayReviews
  }

  static getInitiatives(data) {
    let arrayInitiatives: any[] = []

    Promise.all(
      data.home_initiatives.map(function (elem, index) {
        let title = elem.title.length > 0 ? elem.title[0].text : ''
        let text = prismicH.asHTML(elem.description)
        let returnObjeto = { id: index, image: elem.image.url, title: title, description: text }
        arrayInitiatives.push(returnObjeto)
      })
    )

    return arrayInitiatives
  }

  static getBrands(data) {
    let arrayBrands: any[] = []

    Promise.all(
      data.home_brands.map(function (elem, index) {
        let returnObjeto = { id: index, image: elem.image.url, url: elem.url.url }
        arrayBrands.push(returnObjeto)
      })
    )

    return arrayBrands
  }

  static async getBlogs(client, data) {
    moment.locale('es')
    let arrayBlogs: any[] = []
    await Promise.all(
      data.home_blogs.map(async function (elem, index) {
        const blog = await client.getByUID('blogs', elem.blog.uid)
        let date = blog.first_publication_date
        let returnObjeto = {
          id: index,
          title: blog.data.title[0].text,
          image: blog.data.blog_thumb.url,
          date: moment(date).format('DD MMM'),
          tags: blog.data.tags,
          url: blog.uid
        }
        arrayBlogs.push(returnObjeto)
      })
    )

    return arrayBlogs
  }

  static getInstagram(data) {
    let arrayInstagram: any[] = []
    Promise.all(
      data.gallery.map(function (elem, index) {
        let returnObjeto = { id: index, image: elem.image.url, url: elem.url.url }
        arrayInstagram.push(returnObjeto)
      })
    )
    return arrayInstagram
  }

  static getSoloX(data) {
    const response_cards = data.card_solo_por.map((elem, index) => ({
      id: index,
      date: elem.date,
      image: elem.image.url,
      url: elem.url?.url,
      text: elem.text[0]?.text
    }))
    return { active: data.active_solo_por, cards: response_cards }
  }

  static getMomDay(data) {
    const response_cards = data.mom_card.map((elem, index) => ({
      id: index,
      image: elem.mom_image.url,
      title: elem.title_card[0].text,
      url: elem.url?.url
    }))
    return { title: data.title[0].text, cards: response_cards }
  }

  static async getCategories(data) {
    let categories_data = data?.categories_ids ? data?.categories_ids.split(',').map(Number) : []
    if (categories_data.length > 0) {
      return []
    }
    const categories_database = await Category.query().whereIn('category_id', categories_data).exec()

    const formattedCategories = categories_database.map(category => ({
      id: category.category_id,
      image: category.image || '/',
      title: category.title,
      url: category.url,
      parent_id: category.parent_id
    }))

    return formattedCategories
  }
}

export default HomeService
