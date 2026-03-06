import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Env from '@ioc:Adonis/Core/Env'
import User from 'App/Models/User'
import axios from 'axios'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import BigcommerceService from 'App/Services/BigcommerceService'
import GeneralService from 'App/Services/GeneralService'
import RecoveryPassword from 'App/Mailers/RecoveryPassword'

export default class UsersController {
  public async index({ request }: HttpContextContract) {
    const { email } = request.body()

    const options = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers',
      params: {
        'email:in': email
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    const getRequest = await axios
      .request(options)
      .then(function (response: any) {
        const total = response.data.meta.pagination.total
        if (total > 0) {
          return { status: 200, message: 'Email registrado' }
        }

        return { status: 204, message: 'Email no registrado' }
      })
      .catch(function (error) {
        return { status: error.response.status, message: 'Algo ha salido mal' }
      })

    return getRequest
  }

  public async create(id: number, email: string, password: string) {
    const user = await User.firstOrCreate({ email }, { id, email, password })
    return user
  }

  public async store({ request, response }: HttpContextContract) {
    const data_form = request.body()
    const email = data_form.email.toLowerCase()

    const validator = schema.create({
      last_name: schema.string(),
      first_name: schema.string(),
      email: schema.string({}, [rules.email()]),
      password: schema.string([rules.confirmed('password_confirmation'), rules.minLength(7)])
    })

    try {
      await request.validate({
        schema: validator,
        messages: {
          required: 'El {{ field }} es requerido para crear tu cuenta',
          'password_confirmation.confirmed': 'Contraseñas no coinciden',
          'password.minLength': 'La contraseña debe tener mas de 7 caracteres',
          'email.email': 'El campo debe ser email'
        }
      })
    } catch (error) {
      response.badRequest(error.messages)
    }

    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: [
        {
          email: email,
          first_name: data_form.first_name,
          last_name: data_form.last_name,
          company: Env.get('NAME_EMAIL'),
          customer_group_id: parseInt(Env.get('CUSTOMER_GROUP_ID')),
          addresses: [],
          authentication: {
            force_password_reset: false,
            new_password: data_form.password
          },
          accepts_product_review_abandoned_cart_emails: true,
          store_credit_amounts: [],
          origin_channel_id: parseInt(Env.get('BIGCOMMERCE_CHANNEL_ID')),
          channel_ids: [parseInt(Env.get('BIGCOMMERCE_CHANNEL_ID'))],
          form_fields: []
        }
      ]
    }
    // aqui se comprueba si el usuario es esta previamente creado en bigcommerce como usuario invitado en caso de existir
    // se le actualizan sus datos con el password que implementó durante su registro
    const isUserExistsInBigcommerce = await BigcommerceService.getCustomerByEmail(email)
    if (isUserExistsInBigcommerce.data.length) {
      const { id } = isUserExistsInBigcommerce.data[0]
      const updateUserPassword = await this.update(id, data_form.password, data_form.first_name, data_form.last_name)
      if (updateUserPassword.status == 200) {
        const createOrUpdateUser = await this.create(id, email, data_form.password)
        return { status: 200, message: createOrUpdateUser }
      }
    }

    const postRequest = await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.code }
      })

    if (postRequest.status === 200) {
      await this.create(postRequest.message.data[0].id, email, data_form.password)
    }

    return postRequest
  }

  public async show({ auth }: HttpContextContract) {
    const { id } = auth.use('api').user!.$attributes
    const user: any = await this.getUser(id)

    return user
  }

  public async isValid({ auth, request }: HttpContextContract) {
    const { email } = auth.use('api').user!.$attributes
    const { password } = request.body()

    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers/validate-credentials',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        email: email,
        password: password,
        channel_id: parseInt(Env.get('BIGCOMMERCE_CHANNEL_ID'))
      }
    }

    try {
      const postRequest = await axios.request(options)
      return { status: 200, isValid: postRequest.data.is_valid }
    } catch (error) {
      return { status: error.response.status, message: 'No se pudo validar el usuario' }
    }
  }

  public async edit({ auth, request, response }: HttpContextContract) {
    const data_form = request.body()
    const { id, email } = auth.use('api').user!.$attributes

    const validator = schema.create({
      last_name: schema.string(),
      first_name: schema.string(),
      email: schema.string({}, [rules.email()]),
      date_born: schema.date.optional(),
      phone_contact: schema.number(),
      nickname: schema.string.optional(),
      gender: schema.string.optional(),
      other_gender: schema.string.optional()
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
      method: 'PUT',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: [
        {
          id,
          email: data_form.email,
          first_name: data_form.first_name,
          last_name: data_form.last_name,
          phone: data_form.phone_contact.toString(),
          origin_channel_id: parseInt(Env.get('BIGCOMMERCE_CHANNEL_ID')),
          channel_ids: [parseInt(Env.get('BIGCOMMERCE_CHANNEL_ID'))],
          form_fields: []
        }
      ]
    }

    const postRequest = await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        console.log(error.response.data)
        return { status: error.response.status, message: 'No se pudo actualizar el usuario' }
      })

    if (postRequest.status == 200) {
      try {
        const newUser = await User.findByOrFail('email', email)
        newUser.email = data_form.email
        newUser.save()
        return { status: 200, message: newUser }
      } catch (error) {
        return { status: error, message: 'No se pudo actualizar el usuario en BD' }
      }
    }

    return postRequest
  }

  public async update(
    id: number,
    password: string,
    name: string | undefined = undefined,
    surname: string | undefined = undefined
  ) {
    const dataNewPassword = [
      {
        id,
        authentication: {
          force_password_reset: false,
          new_password: password
        }
      }
    ]
    const dataUpdateUserInvited = [
      {
        id,
        first_name: name,
        last_name: surname,
        authentication: {
          force_password_reset: false,
          new_password: password
        }
      }
    ]

    const options = {
      method: 'PUT',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: name && surname === undefined ? dataNewPassword : dataUpdateUserInvited
    }
    const postRequest = await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        return { status: error.response.status, message: 'No se pudo actualizar la contraseña', code: error.message }
      })

    return postRequest
  }

  public async destroy({ auth }: HttpContextContract) {
    await auth.use('api').revoke()
  }

  public async getUser(id: number) {
    const options = {
      method: 'GET',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers?id:in=' + id,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      }
    }

    const res = await axios.request(options)

    return res.data.data[0]
  }

  public async login({ auth, request }: HttpContextContract) {
    const data_form = request.body()
    const email = data_form.email.toLowerCase()

    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers/validate-credentials',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: {
        email: email,
        password: data_form.password,
        channel_id: parseInt(Env.get('BIGCOMMERCE_CHANNEL_ID'))
      }
    }

    try {
      const postRequest = await axios.request(options)
      //si el usuario no existe en BC
      if (postRequest.data.is_valid == false) {
        //obtiene el usuario de wp que corresponde al email
        const user_wp = await GeneralService.getUserByEmail(email)
        if (user_wp) {
          // Validate password WC
          const external_password = await GeneralService.validatePassword(user_wp, data_form.password)

          if (external_password) {
            //creamos usuario en BC
            const externalUser = await this.createExternalUser({
              params: { user: user_wp, password: data_form.password }
            })

            let time = await BigcommerceService.getTimeSeconds()
            // Generate token
            const { token } = await auth.use('api').attempt(email, data_form.password)

            return {
              status_code: 200,
              iat: time.time,
              iss: Env.get('CLIENT_ID_BIGCOMMERCE'),
              jti: externalUser.message.data[0].id + 1000,
              operation: 'customer_login',
              user: externalUser.message.data[0].first_name + ' ' + externalUser.message.data[0].last_name,
              customer_id: externalUser.message.data[0].id,
              token: token,
              email: email
            }
          }
        }
        return { status_code: 422, message: 'Credenciales incorrectas' }
      }

      let time = await BigcommerceService.getTimeSeconds()
      // Generate token
      const { token } = await auth.use('api').attempt(email, data_form.password)

      const user: any = await this.getUser(postRequest.data.customer_id)

      return {
        status_code: 200,
        iat: time.time,
        iss: Env.get('CLIENT_ID_BIGCOMMERCE'),
        jti: postRequest.data.customer_id + 1000,
        operation: 'customer_login',
        user: `${user.first_name.charAt(0).toUpperCase()}${user.first_name.slice(1).toLowerCase()} ${user.last_name
          .charAt(0)
          .toUpperCase()}${user.last_name.slice(1).toLowerCase()}`,
        customer_id: postRequest.data.customer_id,
        token: token,
        email: email
      }
    } catch (error) {
      return {
        status: Object.keys(error).some(err => err == 'responseText') ? error.responseText : error.response.status,
        message: 'Error del sistema'
      }
    }
  }

  public async createExternalUser({ params }: any) {
    const data_form = params.user
    const password = params.password

    const options = {
      method: 'POST',
      url: Env.get('ENDPOINT_BIGCOMMERCE_URL') + 'v3/customers',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN')
      },
      data: [
        {
          email: data_form.user_email.toLowerCase(),
          first_name: data_form.firstname != '' ? data_form.firstname : data_form.display_name,
          last_name: data_form.lastname != '' ? data_form.lastname : data_form.display_name,
          company: Env.get('NAME_EMAIL'),
          customer_group_id: Env.get('CUSTOMER_GROUP_ID'),
          addresses: [],
          authentication: {
            force_password_reset: false,
            new_password: password
          },
          accepts_product_review_abandoned_cart_emails: true,
          store_credit_amounts: [],
          origin_channel_id: parseInt(Env.get('BIGCOMMERCE_CHANNEL_ID')),
          channel_ids: [parseInt(Env.get('BIGCOMMERCE_CHANNEL_ID'))],
          form_fields: []
        }
      ]
    }

    const postRequest = await axios
      .request(options)
      .then(function (response) {
        return { status: 200, message: response.data }
      })
      .catch(function (error) {
        return { status: error.response.status, message: error.code }
      })

    if (postRequest.status === 200) {
      await this.create(postRequest.message.data[0].id, data_form.user_email.toLowerCase(), password)
    }

    return postRequest
  }

  public async resetPassword({ auth, request }: HttpContextContract) {
    const { email } = request.body()

    const user = await User.findBy('email', email)

    if (!user) {
      const wc_user = await GeneralService.getUserByEmail(email)
      if (wc_user) {
        try {
          const createExternalUser = await this.createExternalUser({
            params: { user: wc_user, password: Env.get('FAKE_PASSWORD') }
          })
          console.log(createExternalUser)
          const userModel = await GeneralService.getUserModel(createExternalUser.message.data[0].email)
          if (userModel) {
            console.log('entra aca')
            const token = await auth.use('api').generate(userModel, {
              expiresIn: '30 min'
            })
            const link = `${Env.get('URL_SITE')}/recover_password_2?token=${token.token}`
            await new RecoveryPassword({ contact: email, link }).send()
            return {
              status_code: 200,
              message: 'Revise su correo electrónico con el enlace para restablecer la contraseña',
              link: link
            }
          }
        } catch (error) {
          return {
            status_code: 404,
            message: 'Email no encontrado en la base de datos'
          }
        }
      } else {
        return {
          status_code: 404,
          message: 'Email no encontrado en el sistema'
        }
      }
    } else {
      console.log('encuentra user')
      try {
        const token = await auth.use('api').generate(user, {
          expiresIn: '30 min'
        })
        const link = `${Env.get('URL_SITE')}/recover_password_2?token=${token.token}`
        await new RecoveryPassword({ contact: email, link }).send()
        return {
          status_code: 200,
          message: 'Revise su correo electrónico con el enlace para restablecer la contraseña'
        }
      } catch (error) {
        return {
          status_code: 404,
          message: 'Email no encontrado en la base de datos'
        }
      }
    }
    console.log('nada')
  }

  public async newPassword({ auth, request, response, params }: HttpContextContract) {
    const { password } = request.body()

    const validator = schema.create({
      password: schema.string([rules.confirmed('password_confirmation'), rules.minLength(8), rules.alphaNumeric()])
    })

    try {
      await request.validate({
        schema: validator,
        messages: {
          required: 'El {{ field }} es requerido para cambiar tu contraseña',
          'password_confirmation.confirmed': 'Contraseñas no coinciden',
          'password.minLength': 'La contraseña debe tener mas de 8 caracteres'
        }
      })
    } catch (error) {
      response.badRequest(error.messages)
    }

    if (!params.user) {
      try {
        await auth.use('api').authenticate()
      } catch (error) {
        await auth.use('api').revoke()
        return {
          status_code: 401,
          message: 'Vuelve a solicitar el cambio de contraseña'
        }
      }
    }

    try {
      const { id, email } = auth.use('api').user!.$attributes
      const newUser = await User.findByOrFail('email', email)
      newUser.password = password
      await newUser.save()
      const reset_password = this.update(id, password)
      if (!params.user) {
        await auth.use('api').revoke()
      }
      return reset_password
    } catch (error) {
      return {
        status_code: 404,
        message: 'Email no encontrado'
      }
    }
  }
}
