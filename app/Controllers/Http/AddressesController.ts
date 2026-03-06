import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema } from '@ioc:Adonis/Core/Validator'
import axios from 'axios'
import Env from '@ioc:Adonis/Core/Env'
import BigcommerceService from 'App/Services/BigcommerceService'

export default class AddressesController {
  public async index({}: HttpContextContract) {}

  public async create({}: HttpContextContract) {}

  public async store({ request, response }: HttpContextContract) {
    const data_form = request.body()

    const validator = schema.create({
      first_name: schema.string(),
      last_name: schema.string(),
      commune: schema.string(),
      customer_id: schema.number(),
      address1: schema.string(),
      region: schema.string()
    })

    try {
      await request.validate({
        schema: validator,
        messages: {
          required: 'El {{ field }} es requerido para crear tu cuenta',
          'email.email': 'El campo debe ser email'
        }
      })
    } catch (error) {
      response.badRequest(error.messages)
    }

    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers/addresses',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: [
        {
          first_name: data_form.first_name,
          last_name: data_form.last_name,
          address1: data_form.address1,
          address2: data_form.address2,
          city: data_form.commune,
          state_or_province: data_form.region,
          country_code: Env.get('COUNTRY_CODE'),
          phone: data_form.phone,
          address_type: data_form.address_type,
          customer_id: parseInt(data_form.customer_id),
          postal_code: '8340422'
        }
      ]
    }

    const postRequest = await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        console.log(error)
        return { status: error.response.status, message: error.response.data }
      })

    return postRequest
  }
  public async show({ params }: HttpContextContract) {
    let addresses = await BigcommerceService.getAddressesByCustomer(params.id)

    return addresses
  }
  public async edit({}: HttpContextContract) {}

  public async update({ request }: HttpContextContract) {
    const data_form = request.body()
    const options = {
      method: 'PUT',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers/addresses',
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: [
        {
          id: parseInt(data_form.id),
          first_name: data_form.first_name ?? '',
          last_name: data_form.last_name ?? '',
          address1: data_form.address1 ?? '',
          address2: data_form.address2 ?? '',
          city: data_form.commune ?? '',
          state_or_province: data_form.region ?? '',
          phone: data_form.phone ?? '',
          address_type: data_form.address_type ?? ''
        }
      ]
    }

    const postRequest = await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })

    return postRequest
  }

  public async destroy({ params }: HttpContextContract) {
    const options = {
      method: 'delete',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers/addresses',
      params: { 'id:in': params.id },
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    const postRequest = await axios
      .request(options)
      .then(function () {
        return { status: 200, message: 'Registro eliminado correctamente' }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.response.data }
      })

    return postRequest
  }
}
