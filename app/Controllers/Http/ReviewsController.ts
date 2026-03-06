import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import axios from 'axios'
import Env from '@ioc:Adonis/Core/Env'
import BigcommerceService from 'App/Services/BigcommerceService'
import ImagesReview from 'App/Models/ImagesReview'
import MailchimpService from 'App/Services/MailchimpService'

export default class ReviewsController {
  public async index({ params }: HttpContextContract) {
    const id = params.id

    const reviews = BigcommerceService.getReviewsByProduct(id)

    return reviews
  }

  public async create({}: HttpContextContract) {}

  public async store({ request }: HttpContextContract) {
    let params = request.params()
    let data_form = request.body()
    const id = params.id
    const date = new Date()

    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/catalog/products/' + id + '/reviews',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        title: data_form.title,
        text: data_form.text,
        status: data_form.status,
        rating: data_form.rating,
        email: data_form.email,
        name: data_form.name,
        date_reviewed: date
      }
    }

    const postRequest = await axios
      .request(options)
      .then(function (response) {
        console.log(response.data)
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        console.log(error)
        return {
          status: error.response.status,
          message: error.message
        }
      })
    await ImagesReview.firstOrCreate({
      product_id: id,
      name: data_form.name,
      title: data_form.title,
      images_url: data_form?.url_image || null
    })

    if (data_form && data_form.email && !data_form.url_image) {
      //  await MailchimpService.addTag(data_form.email, Env.get('REVIEW_MAILCHIMP'))
      await MailchimpService.addTag(data_form.email, Env.get('REVIEW_MAILCHIMP_WITHOUT_PHOTO'))
    }
    if (data_form && data_form.email && data_form.url_image !== null) {
      await MailchimpService.addTag(data_form.email, Env.get('REVIEW_MAILCHIMP_PHOTO'))
    }

    return postRequest
  }
}
