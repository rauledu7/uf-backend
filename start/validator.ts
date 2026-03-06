/*
|--------------------------------------------------------------------------
| Preloaded File
|--------------------------------------------------------------------------
|
| Any code written inside this file will be executed during the application
| boot.
|
*/
import { validator } from '@ioc:Adonis/Core/Validator'

validator.rule('alphaNumeric', (value, _, options) => {
  const letras = 'abcdefghijklmnopqrstuvwxyz'
  const numeros = '0123456789'
  let hasNumber = false
  let hasLetter = false

  if (typeof value !== 'string') {
    return
  }

  for (let i = 0; i < value.length; i++) {
    if (numeros.indexOf(value.charAt(i), 0) != -1) {
      hasNumber = true
    }
  }
  for (let i = 0; i < value.length; i++) {
    if (letras.indexOf(value.charAt(i), 0) != -1) {
      hasLetter = true
    }
  }

  if (!hasLetter || !hasNumber) {
    options.errorReporter.report(
      options.pointer,
      'alphaNumeric',
      'Debe introducir al menos una letra y un número',
      options.arrayExpressionPointer
    )
  }
})
