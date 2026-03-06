import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import PrismicService from 'App/Services/PrismicService'

export default class BlogsController {
  public async index({}: HttpContextContract) {
    const blogs = await PrismicService.getBlogs()

    return blogs
  }

  public async create({}: HttpContextContract) {}

  public async store({}: HttpContextContract) {}

  public async show({ params }: HttpContextContract) {
    const blog = await PrismicService.getSingleBlog(params.id)

    return blog
  }

  public async edit({}: HttpContextContract) {}

  public async update({}: HttpContextContract) {}

  public async destroy({}: HttpContextContract) {}
}
