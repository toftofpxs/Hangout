import { db } from '../db/index.js'
import { auditLogs } from '../db/schema.js'

const sanitizeMetadata = (metadata) => {
  if (!metadata) return null

  try {
    return JSON.stringify(metadata).slice(0, 4000)
  } catch {
    return JSON.stringify({ note: 'metadata_serialization_failed' })
  }
}

export const writeAuditLog = async ({
  req,
  actorUserId = null,
  actorRole = null,
  action,
  targetType = null,
  targetId = null,
  result = 'success',
  metadata = null,
}) => {
  if (!action) return null

  return db.insert(auditLogs).values({
    actor_user_id: actorUserId != null ? Number(actorUserId) : null,
    actor_role: actorRole || null,
    action,
    target_type: targetType || null,
    target_id: targetId || null,
    result,
    ip_address: req?.clientIp || req?.ip || null,
    user_agent: req?.get?.('user-agent') || null,
    request_id: req?.requestId || null,
    metadata_json: sanitizeMetadata(metadata),
  })
}

export default writeAuditLog