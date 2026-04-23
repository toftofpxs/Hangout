import { randomUUID } from 'crypto'

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }

  return req.socket?.remoteAddress || req.ip || null
}

export const requestContext = (req, res, next) => {
  req.requestId = randomUUID()
  req.clientIp = getClientIp(req)
  res.setHeader('X-Request-Id', req.requestId)
  next()
}

export default requestContext