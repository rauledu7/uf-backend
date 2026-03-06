import { test } from '@japa/runner'
import CompleteOrder from 'App/Mailers/CompleteOrder'

test.group('Emails complete order template', () => {
  test('should send email successfully', async ({ assert }) => {
    // 🎯 DATOS MOCK COMPLETOS SIN CÁLCULO DE PESO
    const mockData = {
      // Variables del body (como shipping[0]) - ESTRUCTURA REAL
      __id: 1699555834634,
      title: 'Retiro Bodega Test',
      address: 'Dirección Test 456, Santiago',
      url: 'https://example.com/maps/test',
      city: 'Santiago',
      alias: 'test',
      visibility: 'true',
      days: '3',

      // Variables específicas del controlador
      id: '276494',
      email: 'jesus.udiz@bettercommerce.cl',
      name: 'Usuario Test Sin Peso',

      // Productos con status completo (como products_with_status)
      products: [
        {
          image: 'https://example.com/test-no-weight.jpg',
          name: 'Producto Test Sin Peso',
          weight: '0.3',
          status: {
            color: '#17a2b8',
            status: 'EN PREPARACIÓN',
            message: 'Tu producto está siendo preparado'
          }
        }
      ]
    }

    try {
      console.log('📧 Enviando correo de prueba...')
      console.log(`📬 Destinatario: ${mockData.email}`)
      console.log(`📋 Asunto: Conoce el estado de tus productos del pedido #${mockData.id}`)

      // 🎯 ENVIAR EL CORREO (exactamente como en el controlador)
      await new CompleteOrder(mockData).send()

      console.log('✅ Correo enviado correctamente')
      console.log('📧 Revisa tu bandeja de entrada')

      assert.isTrue(true, 'Correo enviado correctamente')
    } catch (error) {
      console.error('❌ Error al enviar correo:', error.message)

      // 🎯 INVESTIGAR ERRORES ESPECÍFICOS
      if (error.message.includes('400')) {
        console.log('🔍 Error 400 - Validación de datos falló')
        console.log('📋 Variables que la plantilla necesita:')
        console.log('   ✅ name, id, title, address, products (del mock data)')
        console.log('   ✅ color, bg_color, image (del entorno)')
        console.log('   ✅ logo, marca, weightProduct, imageDiscount (del entorno)')
        console.log('   ✅ facebook, instagram, website, contacto (del entorno)')

        // 🎯 VERIFICAR ESTRUCTURA DE PRODUCTOS
        if (mockData.products && mockData.products.length > 0) {
          const product = mockData.products[0]
          console.log('🔍 Estructura del primer producto:')
          console.log(`   ✅ image: ${product.image ? 'OK' : 'FALTA'}`)
          console.log(`   ✅ name: ${product.name ? 'OK' : 'FALTA'}`)
          console.log(`   ✅ weight: ${product.weight ? 'OK' : 'FALTA'}`)
          console.log(`   ✅ status.color: ${product.status?.color ? 'OK' : 'FALTA'}`)
          console.log(`   ✅ status.status: ${product.status?.status ? 'OK' : 'FALTA'}`)
          console.log(`   ✅ status.message: ${product.status?.message ? 'OK' : 'FALTA'}`)
        } else {
          console.log('❌ Array de productos vacío o undefined')
        }
      }

      assert.fail(`Error al enviar correo: ${error.message}`)
    }
  })
})
