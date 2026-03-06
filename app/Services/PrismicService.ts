import * as prismicH from '@prismicio/helpers'
import Env from '@ioc:Adonis/Core/Env'
import * as prismic from '@prismicio/client'
import fetch from 'node-fetch'
import moment from 'moment'
import axios from 'axios'

class PrismicService {
  static endpoint: any = prismic.getRepositoryEndpoint(Env.get('ENDPOINT_PRISMIC'))
  static client: any = prismic.createClient(this.endpoint, {
    accessToken: Env.get('PRISMIC_ACCESS_TOKEN'),
    fetch
  })

  static async getDocument(endpoint: string, type: string) {
    const options = {
      method: 'GET',
      url: `${Env.get('ENDPOINT_PRISMIC_BETTERCOMMERCE')}/get-document/${type}/${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
        // 'X-Auth-Token': Env.get('BIGCOMMERCE_ACCESS_TOKEN'),
      }
    }

    try {
      const response = await axios.request(options)
      return { data: response.data }
    } catch (error) {
      return { status: error.response.status, message: error.response.data }
    }
  }
  static async getGlobalSettings() {
    const document = await PrismicService.getDocument(Env.get('ENDPOINT_PRISMIC'), 'configuraciones_globales')
    const globalSettings = document.data

    const top_header = globalSettings.beneficio.map(function (e) {
      return {
        icon: e.icon.url,
        title: e.title[0].text,
        link: e.link.link_type === 'Web' ? e.link.url : ''
      }
    })

    const pre_footer = globalSettings.items_prefooter.map(function (e) {
      return { title: e.title, text: e.text, image: e.image.url }
    })

    const stores = globalSettings.stores.map(function (e) {
      return { title: e.title[0].text, link: e.link.link_type === 'Web' ? e.link.url : '' }
    })

    const pickup_store = globalSettings.pickup_stores.map(function (e) {
      return { title: e.title[0].text, link: e.link.link_type === 'Web' ? e.link.url : '' }
    })
    const customer_services = globalSettings.customer_service.map(function (e) {
      return { title: e.title[0].text, link: e.link.link_type === 'Web' ? e.link.url : '' }
    })
    const account = globalSettings.account.map(function (e) {
      return { title: e.title[0].text, link: e.link.link_type === 'Web' ? e.link.url : '' }
    })
    const about_us = globalSettings.about.map(function (e) {
      return { title: e.title[0].text, link: e.link.link_type === 'Web' ? e.link.url : '' }
    })
    const contact_us = globalSettings.contact_us.map(function (e) {
      return {
        title: prismicH.asHTML(e.rich_title),
        icon: e.icon.url,
        link: e.link.link_type === 'Web' ? e.link.url : ''
      }
    })
    const social_media = globalSettings.social_media.map(function (e) {
      return { icon: e.icon.url, link: e.link.link_type === 'Web' ? e.link.url : '' }
    })
    const popups = {
      state: globalSettings.show,
      image: globalSettings.view_popups.url,
      url: globalSettings.link.url,
      destination: globalSettings.pages_destination,
      showInHome: globalSettings.home
    }
    const banner = {
      state: globalSettings.state,
      image: globalSettings.banner.url,
      image_mobile: globalSettings.banner_mobile.url
    }
    let topMenu = {
      items: globalSettings.top_menu,
      buttons: globalSettings.top_menu_buttons[0]
    }

    let response = {
      top_header,
      pre_footer: {
        title: globalSettings.title_prefooter[0].text,
        pre_footer
      },
      footer: {
        store_points: {
          title: globalSettings.title_store_points,
          stores,
          pickup_store
        },
        customer_services: {
          title: globalSettings.title_customer_service,
          data: customer_services
        },
        account: {
          title: globalSettings.title_account,
          data: account
        },
        about_us: {
          title: globalSettings.title_about,
          data: about_us
        },
        contact_us: {
          title: globalSettings.title_contact_us,
          info: contact_us,
          social_media
        }
      },
      popups_home: popups,
      banner_home: {
        state: banner.state,
        image: banner.image,
        image_mobile: banner.image_mobile
      },
      top_menu: topMenu
    }

    return response
  }

  static async getStores() {
    const document = await PrismicService.getDocument(Env.get('ENDPOINT_PRISMIC'), 'stores')
    const stores = document.data.stores
    const arrayStores: any[] = []
    Promise.all(
      stores.map(function (elem, index) {
        let returnStore = {
          __id: index + 1,
          title: elem.title[0]?.text || '',
          address: elem.address[0]?.text || '',
          schedule: elem.schedule[0]?.text || '',
          city: elem?.city || '',
          url: elem?.location?.url || '',
          phone: elem?.phone[0]?.text || '',
          info: elem?.pickup_store[0]?.text || '',
          img: elem?.img.url || '',
          location: elem?.location?.url || '',
          alias: elem?.alias || '',
          days: elem?.days || '',
          visibility: elem?.visibility || '',
          name: elem?.name || '',
        }
        arrayStores.push(returnStore)
      })
    )

    return arrayStores
  }

  static async getBlogs(url = '', data) {
    moment.locale('es')
    let arrayBlogs: any[] = []
    await Promise.all(
      data.map(async function (elem, index) {
        if (index <= 40) {
          if (url.length > 0) {
            if (elem.content.uid !== url) {
              // console.log('la url del elemento es ' + elem.uid)
              // console.log('la url que viene es ' + url)
              let date = elem.content.first_publication_date
              // let final_text = prismicH.asHTML(elem.data.content)
              let arrayTags: any[] = []

              elem.tags.map(function (element, _key) {
                arrayTags.push(element.tag)
              })
              let returnObjeto = {
                id: index,
                title: elem.content.title.length > 0 ? elem.content.title[0].text : '',
                content: elem.content.content[0].text + '...',
                image: elem.content.blog_thumb.url,
                date: moment(date).format('DD MMM'),
                tags: arrayTags,
                url: elem.content.uid,
                id_doc: elem.id
              }
              arrayBlogs.push(returnObjeto)
            }
          } else {
            let date = elem.content.first_publication_date
            // let final_text = prismicH.asHTML(elem.data.content)
            // let final_text = ''
            let arrayTags: any[] = []
            // text.map(function (e) {
            //   if (e.type == 'paragraph') {
            //     final_text = e.text?.substring(0, 140)
            //   }
            // })
            elem.content.tags.map(function (element, _key) {
              arrayTags.push(element.tag)
            })
            let returnObjeto = {
              id: index,
              title: elem.content.title.length > 0 ? elem.content.title[0].text : '',
              content: elem.content.content[0].text + '...',
              image: elem.content.blog_thumb.url,
              date: moment(date).format('DD MMM'),
              tags: arrayTags,
              url: elem.content.uid,
              id_doc: elem.id
            }
            arrayBlogs.push(returnObjeto)
          }
        }
      })
    )
    return arrayBlogs
  }

  static async getSingleBlog(id) {
    moment.locale('es')
    let arrayImages: any[] = []
    const blog = await PrismicService.client.getByUID('blogs', id)
    let date = blog.first_publication_date
    let text = prismicH.asHTML(blog.data.content)
    let images = blog.data.images
    let arrayTags: any[] = []
    let blogs = await PrismicService.getBlogs('', blog.id_doc)

    images.map(function (e) {
      let image = e.image.url
      arrayImages.push(image)
    })
    blog.data.tags.map(function (element, _key) {
      arrayTags.push(element.tag)
    })

    let returnObjeto = {
      id: id,
      title: blog.data.title[0] !== '' && blog.data.title[0],
      content: text,
      date: moment(date).format('DD MMM'),
      tags: arrayTags,
      url: blog.uid,
      gallery: arrayImages,
      blogs: blogs
    }

    return returnObjeto
  }
  static async getWorkWithUsContent() {
    const document = await PrismicService.getDocument(Env.get('ENDPOINT_PRISMIC'), 'work_with_us')
    let vacancies = document.data.vacancies.map(vacancy => {
      return {
        area: vacancy.areas,
        position: vacancy.position[0].text,
        link: vacancy.link.url,
        type: vacancy.type
      }
    })

    vacancies = vacancies.reduce((acc: any[], item: any) => {
      const existingGroup = acc.find(group => group.title.trim() === item.area.trim())

      if (existingGroup) {
        if (item.type === 'Prácticas') {
          existingGroup.available_jobs.push({ ...item })
        } else {
          existingGroup.profesionales.push({ ...item })
        }
      } else {
        const newGroup: any = {
          title: item.area.trim(),
          available_jobs: [],
          profesionales: []
        }
        if (item.type === 'Prácticas') {
          newGroup.available_jobs.push({ ...item })
        } else {
          newGroup.profesionales.push({ ...item })
        }
        acc.push(newGroup)
      }

      return acc
    }, [])

    return vacancies
  }
  // Este es el Popup solicitado por el equipo de Grow Marketing
  // static async getPopupGrowMarketing(){
  //   const document = await PrismicService.client.getSingle('configuraciones_globales')
  //   const globalSettings = document.data;
  //   const {popup_home,popup_image, popup_title, popup_text_content} = globalSettings

  //   return {status:popup_home, image:popup_image?.url || null,title:popup_title || null ,content: popup_text_content || null}
  // }
}
export default PrismicService
