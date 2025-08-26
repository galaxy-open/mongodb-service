import path from 'node:path'
import url from 'node:url'

export default {
  path: path.dirname(url.fileURLToPath(import.meta.url)) + '/../',
  title: 'MongoDB SSPL',
  version: '1.0.0',
  description: '',
  tagIndex: 3,
  // productionEnv: 'production', // optional
  info: {
    title: 'MongoDB SSPL',
    version: '1.0.0',
    description: '',
  },
  snakeCase: true,

  debug: false, // set to true, to get some useful debug output
  ignore: ['/swagger', '/docs', '/jobs/*', '/health/*'],
  preferredPutPatch: 'PUT', // if PUT/PATCH are provided for the same route, prefer PUT
  common: {
    parameters: {}, // OpenAPI conform parameters that are commonly used
    headers: {}, // OpenAPI conform headers that are commonly used
  },
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  }, // optional
  authMiddlewares: ['oauth', 'oauthJit', 'api', 'auth'], // optional
  defaultSecurityScheme: 'BearerAuth', // optional
  persistAuthorization: true, // persist authorization between reloads on the swagger page
  showFullPath: true, // the path displayed after endpoint summary
}
