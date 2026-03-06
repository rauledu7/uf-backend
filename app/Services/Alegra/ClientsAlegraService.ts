import Env from '@ioc:Adonis/Core/Env'
import axios from 'axios'
import { string } from '@ioc:Adonis/Core/Helpers'

type IdentificationType = {
  type: string
  name: string
}

class ClientAlegraService {
  protected URL_CREATE_CLIENT = 'https://api.alegra.com/api/v1/contacts' // POST
  protected API_TOKEN = Env.get('TOKEN_ALEGRA')

  /**
   * Metodo para la creación de un cliente
   */
  async createClientAPIAlegra(dataClient: any) {
    try {
      const options = {
        method: 'POST',
        url: `${this.URL_CREATE_CLIENT}`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: this.API_TOKEN
        },
        data: dataClient
      }

      const response = await axios.request(options)
      console.log('respuesta al crear cliente en la API de Alegra:', { response: response.data })
      return { status: 200, message: response.data }
    } catch (error) {
      console.error('Error al crear cliente en la API de Alegra:', {
        error: error.response?.data
      })
      return {
        status: error.response?.status || 500,
        message: error.response?.data || 'Error desconocido'
      }
    }
  }
  /**
   * Metodo para consultar un cliente desde la API de Alegra
   */
  async getClientAPIAlegra(email: string = '', identification: string = '') {
    try {
      const options = {
        method: 'GET',
        url: `${this.URL_CREATE_CLIENT}?email=${email}&identification=${identification}`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: this.API_TOKEN
        }
      }

      const response = await axios.request(options)
      console.log('respuesta al consultar cliente por email e identificación  en la API de Alegra:', {
        response: response.data
      })
      return { status: 200, message: response.data }
    } catch (error) {
      console.error('Error al consultar cliente en la API de Alegra:', {
        error: error.response?.data
      })
      return {
        status: error.response?.status || 500,
        message: error.response?.data || 'Error desconocido'
      }
    }
  }
  /**
   * Metodo para obtener datos de un cliente en  la base de datos
   */
  // async getDatabaseClient(identification: string) {
  //   try {
  //     const client = await ClientsAlegra.findBy('identification', identification)
  //     if (client) {
  //       return client.toJSON()
  //     }
  //     return null
  //   } catch (error) {
  //     console.error('Error al consultar cliente de alegra en la Base de datos:', {
  //       error: error.details,
  //     })
  //     return {
  //       status: error.status || 500,
  //       message: error.message || 'Error desconocido',
  //     }
  //   }
  // }
  /**
   * Metodo para guardar cliente de alegra en la base de datos luego de su creación en la API de Alegra
   */
  // async saveDatabaseClient(newClient: ClientsAlegra) {
  //   try {
  //     const client = await ClientsAlegra.create(newClient)
  //     return client.toJSON()
  //   } catch (error) {
  //     console.error('Error al guardar cliente de alegra en la base de datos:', {
  //       error: error.details,
  //     })
  //     return {
  //       status: error.status || 500,
  //       message: error.message || 'Error desconocido',
  //     }
  //   }
  // }
  /**
   * Metodo para armar la estructura de datos necesaria para crear el cliente en ALegra
   */
  public formateDataClient(orderData: any, documentType: string) {
    const { first_name, last_name, zip, email } = orderData.billing_address

    const typeDocument: IdentificationType = this.getDocumentType(documentType)

    const dataCreateClient = {
      name: `${string.capitalCase(first_name)} ${string.capitalCase(last_name)}`,
      nameObject: {
        firstName: string.capitalCase(first_name),
        lastName: string.capitalCase(last_name)
      },
      identifications: zip,
      identificationObject: {
        type: typeDocument.type,
        div: typeDocument.type == 'NIT' ? Number(zip.slice(-1)) : undefined, // si tiene 10 digitos corresponde a una persona juridica o NIT
        number: zip
      },
      email: email.toLowerCase(),
      kindOfPerson: typeDocument.type == 'NIT' ? 'LEGAL_ENTITY' : 'PERSON_ENTITY',
      type: 'client',
      status: 'active'
    }
    return dataCreateClient
  }
  /**
   * Método para obtener el tipo de documento de identidad del cliente
   */
  public getDocumentType(documentType: string): IdentificationType {
    const documentTypes = {
      RC: { type: 'RC', name: 'registro civil' },
      TI: { type: 'TI', name: 'tarjeta de identidad' },
      CC: { type: 'CC', name: 'cedula de ciudadania' },
      TE: { type: 'TE', name: 'tarjeta de extranjeria' },
      CE: { type: 'CE', name: 'cedula de extranjeria' },
      NIT: { type: 'NIT', name: 'nit' },
      PP: { type: 'PP', name: 'pasaporte' },
      DIE: { type: 'DIE', name: 'documento de identificacion extranjero' },
      FOREIGN_NIT: { type: 'FOREIGN_NIT', name: 'NIT de otro pais' }
    }

    // Función para quitar acentos
    const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Convertir el tipo de documento a minúsculas y quitar acentos
    const lowerCaseDocumentType = removeAccents(documentType.toLowerCase())

    // Definir un array de patrones de búsqueda
    const patterns = [
      { keywords: ['civil'], type: documentTypes.RC },
      { keywords: ['tarjeta', 'identidad'], type: documentTypes.TI },
      { keywords: ['cedula'], type: documentTypes.CC },
      { keywords: ['tarjeta', 'extranjeria'], type: documentTypes.TE },
      { keywords: ['cedula', 'extranjeria'], type: documentTypes.CE },
      { keywords: ['nit'], type: documentTypes.NIT },
      { keywords: ['pasaporte'], type: documentTypes.PP },
      { keywords: ['documento', 'extranjero'], type: documentTypes.DIE }
    ]

    // Buscar el tipo de documento
    const foundType = patterns.find(pattern =>
      pattern.keywords.every(keyword => lowerCaseDocumentType.includes(keyword))
    )

    return foundType ? foundType.type : documentTypes.FOREIGN_NIT
  }
}
export default ClientAlegraService
