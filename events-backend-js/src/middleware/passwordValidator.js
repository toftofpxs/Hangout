// Temporary relaxed rule for development phase.
const MIN_PASSWORD_LENGTH = 3

export function validatePasswordMiddleware(req, res, next) {
  const { password } = req.body

  if (typeof password !== 'string') {
    return res.status(400).json({ message: 'Mot de passe invalide.' })
  }

  if (password.trim().length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      message: `Mot de passe invalide : minimum ${MIN_PASSWORD_LENGTH} caracteres.`
    })
  }

  next()
}
