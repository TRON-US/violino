const _ = require('lodash')

const errors = {
  500: {error: {code: 500, status: 'Internal Server Error'}},
  502: {error: {code: 502, status: 'Bad Gateway'}},
  503: {error: {code: 503, status: 'Service Temporarily Unavailable'}},
  504: {error: {code: 504, status: 'Gateway Timeout'}},
  400: {error: {code: 400, status: 'Bad Request'}},
  401: {error: {code: 401, status: 'Unauthorized'}},
  403: {error: {code: 403, status: 'Forbidden'}},
  404: {error: {code: 404, status: 'Not Found'}},
  405: {error: {code: 405, status: 'Method not allowed'}},
  408: {error: {code: 408, status: 'Request Timeout'}},
  418: {error: {code: 418, status: 'I am a teapot'}}
}

errors.set = function (errorCode, message) {
  const e = _.clone(errors[errorCode])
  e.message = message
  return e
}

module.exports = errors
