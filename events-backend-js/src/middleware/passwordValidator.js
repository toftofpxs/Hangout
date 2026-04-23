export const MIN_PASSWORD_LENGTH = 10

const PASSWORD_RULES = [
  { test: (value) => value.length >= MIN_PASSWORD_LENGTH, message: `minimum ${MIN_PASSWORD_LENGTH} caracteres` },
  { test: (value) => /[a-z]/.test(value), message: 'au moins une lettre minuscule' },
  { test: (value) => /[A-Z]/.test(value), message: 'au moins une lettre majuscule' },
  { test: (value) => /\d/.test(value), message: 'au moins un chiffre' },
  { test: (value) => /[^A-Za-z0-9]/.test(value), message: 'au moins un caractere special' },
]

export function validatePasswordStrength(password) {
  const normalizedPassword = typeof password === 'string' ? password.trim() : ''

  if (!normalizedPassword) {
    return 'Mot de passe invalide.'
  }

  for (const rule of PASSWORD_RULES) {
    if (!rule.test(normalizedPassword)) {
      return `Mot de passe invalide : ${rule.message}.`
    }
  }

  return null
}

export function validatePasswordMiddleware(req, res, next) {
  const { password, confirmPassword } = req.body ?? {}
  const validationMessage = validatePasswordStrength(password)

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage })
  }

  if (confirmPassword != null && String(password) !== String(confirmPassword)) {
    return res.status(400).json({ message: 'La confirmation du mot de passe ne correspond pas.' })
  }

  next()
}
