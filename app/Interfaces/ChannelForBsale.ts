import Env from '@ioc:Adonis/Core/Env'

export const tokenForBsale = [
  {
    token_channel: Env.get('TOKEN_BSALE_UF_CL'),
    channel: 1,
    seller_id: 16,
    name: 'ultimate',
    purchase_confirmation: 'https://ultimatefitness.cl/cl/purchase_confirmation?purchase=',
    purchase_error: 'https://ultimatefitness.cl/cl/purchase_error/',
    country: 'CL'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_TF_CL'),
    channel: 1457601,
    seller_id: 195,
    name: 'terraforce',
    purchase_confirmation: 'https://terraforce.cl/cl/purchase_confirmation?purchase=',
    purchase_error: 'https://terraforce.cl/cl/purchase_error/',
    country: 'CL'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_SF_CL'),
    channel: 1573014,
    seller_id: 232,
    name: 'snowforce',
    purchase_confirmation: 'https://snowforce.cl/cl/purchase_confirmation?purchase=',
    purchase_error: 'https://snowforce.cl/cl/purchase_error/',
    country: 'CL'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_AR_CL'),
    channel: 1501686,
    seller_id: 196,
    name: 'around',
    purchase_confirmation: 'https://around.cl/cl/purchase_confirmation?purchase=',
    purchase_error: 'https://around.cl/cl/purchase_error/',
    country: 'CL'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_TS_CL'),
    channel: 1461778,
    seller_id: 197,
    name: 'tspin',
    purchase_confirmation: 'https://tspin.cl/cl/purchase_confirmation?purchase=',
    purchase_error: 'https://tspin.cl/cl/purchase_error/',
    country: 'CL'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_FC_CL'),
    channel: 1420393,
    seller_id: 17,
    name: 'firstcare',
    purchase_confirmation: 'https://firstcare.cl/cl/purchase_confirmation?purchase=',
    purchase_error: 'https://firstcare.cl/cl/purchase_error/',
    country: 'CL'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_CC_CL'),
    channel: 1567036,
    seller_id: 15,
    name: 'Camillas',
    purchase_confirmation: 'https://camillaschile.cl/cl/purchase_confirmation?purchase=',
    purchase_error: 'https://camillaschile.cl/cl/purchase_error/',
    country: 'CL'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_UC_CL'),
    channel: 1598942,
    seller_id: 248,
    name: 'clothing',
    purchase_confirmation: 'https://ultimateclothing.cl/cl/purchase_confirmation?purchase=',
    purchase_error: 'https://ultimatefitness.cl/cl/purchase_error/',
    country: 'CL'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_AF_CL'),
    channel: 1443267,
    seller_id: 122,
    name: 'aquaforce',
    purchase_confirmation: 'https://aquaforce.cl/cl/purchase_confirmation?purchase=',
    purchase_error: 'https://aquaforce.cl/cl/purchase_error/',
    country: 'CL'
  },

  /* PERU */

  {
    token_channel: Env.get('TOKEN_BSALE_UF_PE'),
    channel: 1,
    name: 'ultimate',
    purchase_confirmation: 'https://ultimatefitness.pe/pe/purchase_confirmation?purchase=',
    purchase_error: 'https://ultimatefitness.pe/pe/purchase_error/',
    country: 'PE'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_TF_PE'),
    channel: 1457601,
    name: 'terraforce',
    purchase_confirmation: 'https://terraforce.pe/pe/purchase_confirmation?purchase=',
    purchase_error: 'https://terraforce.pe/pe/purchase_error/',
    country: 'PE'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_AF_PE'),
    channel: 1443267,
    name: 'aquaforce',
    purchase_confirmation: 'https://aquaforce.pe/pe/purchase_confirmation?purchase=',
    purchase_error: 'https://aquaforce.pe/pe/purchase_error/',
    country: 'PE'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_UC_PE'),
    channel: 1598942,
    name: 'clothing',
    purchase_confirmation: 'https://ultimateclothing.pe/pe/purchase_confirmation?purchase=',
    purchase_error: 'https://ultimateclothing.pe/pe/purchase_error/',
    country: 'PE'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_FC_PE'),
    channel: 1420393,
    name: 'Firstcare',
    purchase_confirmation: 'https://firstcare.pe/pe/purchase_confirmation?purchase=',
    purchase_error: 'https://firstcare.pe/pe/purchase_error/',
    country: 'PE'
  },
  {
    token_channel: Env.get('TOKEN_BSALE_AR_PE'),
    channel: 1526717,
    name: 'around',
    purchase_confirmation: 'https://around.pe/pe/purchase_confirmation?purchase=',
    purchase_error: 'https://around.pe/pe/purchase_error/',
    country: 'PE'
  }
]
