import nodemailer from 'nodemailer'

let transporterPromise = null

async function getTransporter() {
  if (transporterPromise) return transporterPromise

  transporterPromise = (async () => {
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || 587)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'

    if (!host) return null

    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    })

    try {
      await transport.verify()
      return transport
    } catch {
      transporterPromise = null
      return null
    }
  })()

  return transporterPromise
}

export async function sendPaymentConfirmationEmail({ to, userName, eventTitle, amount, paymentDate }) {
  try {
    const transporter = await getTransporter()
    if (!transporter) {
      return { sent: false, skipped: true }
    }

    const from = process.env.MAIL_FROM || process.env.SMTP_USER
    const formattedDate = new Date(paymentDate).toLocaleString('fr-FR')

    await transporter.sendMail({
      from,
      to,
      subject: `Confirmation de paiement - ${eventTitle}`,
      text: [
        `Bonjour ${userName || ''},`,
        '',
        `Votre paiement de ${amount} EUR pour l'événement "${eventTitle}" a bien été validé.`,
        `Date du paiement : ${formattedDate}`,
        '',
        'Votre inscription peut maintenant être finalisée sur la plateforme.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2>Confirmation de paiement</h2>
          <p>Bonjour ${userName || ''},</p>
          <p>Votre paiement de <strong>${amount} EUR</strong> pour l'événement <strong>${eventTitle}</strong> a bien été validé.</p>
          <p>Date du paiement : ${formattedDate}</p>
          <p>Votre inscription peut maintenant être finalisée sur la plateforme.</p>
        </div>
      `,
    })

    return { sent: true, skipped: false }
  } catch {
    return { sent: false, skipped: true }
  }
}

export async function sendRefundConfirmationEmail({ to, userName, eventTitle, amount }) {
  try {
    const transporter = await getTransporter()
    if (!transporter) {
      return { sent: false, skipped: true }
    }

    const from = process.env.MAIL_FROM || process.env.SMTP_USER

    await transporter.sendMail({
      from,
      to,
      subject: `Remboursement en cours - ${eventTitle}`,
      text: [
        `Bonjour ${userName || ''},`,
        '',
        `Votre demande de remboursement de ${amount} EUR pour l'événement "${eventTitle}" a bien été prise en compte.`,
        'Le remboursement sera traité sous 48 heures.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2>Remboursement en cours</h2>
          <p>Bonjour ${userName || ''},</p>
          <p>Votre demande de remboursement de <strong>${amount} EUR</strong> pour l'événement <strong>${eventTitle}</strong> a bien été prise en compte.</p>
          <p>Le remboursement sera traité sous <strong>48 heures</strong>.</p>
        </div>
      `,
    })

    return { sent: true, skipped: false }
  } catch {
    return { sent: false, skipped: true }
  }
}

export async function sendCartPaymentConfirmationEmail({ to, userName, items, totalAmount, paymentDate }) {
  try {
    const transporter = await getTransporter()
    if (!transporter) {
      return { sent: false, skipped: true }
    }

    const from = process.env.MAIL_FROM || process.env.SMTP_USER
    const formattedDate = new Date(paymentDate).toLocaleString('fr-FR')
    const lines = items.map((item) => `- ${item.title} : ${item.amount} EUR`)
    const htmlLines = items.map((item) => `<li><strong>${item.title}</strong> : ${item.amount} EUR</li>`).join('')

    await transporter.sendMail({
      from,
      to,
      subject: 'Confirmation de paiement de votre panier',
      text: [
        `Bonjour ${userName || ''},`,
        '',
        'Votre paiement a bien été validé pour les événements suivants :',
        ...lines,
        '',
        `Montant total : ${totalAmount} EUR`,
        `Date du paiement : ${formattedDate}`,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2>Confirmation de paiement</h2>
          <p>Bonjour ${userName || ''},</p>
          <p>Votre paiement a bien été validé pour les événements suivants :</p>
          <ul>${htmlLines}</ul>
          <p><strong>Montant total :</strong> ${totalAmount} EUR</p>
          <p><strong>Date du paiement :</strong> ${formattedDate}</p>
        </div>
      `,
    })

    return { sent: true, skipped: false }
  } catch {
    return { sent: false, skipped: true }
  }
}

export async function sendEmailVerificationEmail({ to, userName, verificationLink }) {
  try {
    const transporter = await getTransporter()
    if (!transporter) {
      return { sent: false, skipped: true }
    }

    const from = process.env.MAIL_FROM || process.env.SMTP_USER

    await transporter.sendMail({
      from,
      to,
      subject: 'Activez votre compte Hangout',
      text: [
        `Bonjour ${userName || ''},`,
        '',
        'Merci pour votre inscription sur Hangout.',
        'Cliquez sur le lien ci-dessous pour activer votre compte :',
        verificationLink,
        '',
        'Ce lien expire dans 24 heures.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2>Activation de votre compte</h2>
          <p>Bonjour ${userName || ''},</p>
          <p>Merci pour votre inscription sur Hangout.</p>
          <p>
            <a href="${verificationLink}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">
              Activer mon compte
            </a>
          </p>
          <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
          <p>${verificationLink}</p>
          <p>Ce lien expire dans 24 heures.</p>
        </div>
      `,
    })

    return { sent: true, skipped: false }
  } catch {
    return { sent: false, skipped: true }
  }
}
