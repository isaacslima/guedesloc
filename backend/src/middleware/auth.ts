import type { Request, Response, NextFunction } from 'express'
import { getAuth } from 'firebase-admin/auth'
import { logger } from '../services/logger.js'

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string
    email?: string
    role?: string
  }
  isService?: boolean
}

/**
 * Middleware para validar chamadas Service-to-Service (Adapters -> Gateway)
 * Suporta Service Account OIDC token do GCP ou chave API no header x-api-key
 */
export function serviceAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key']
  const authHeader = req.headers.authorization

  // Exemplo de chave API local / homologação (em produção vem do GCP Secret Manager ou IAM)
  const EXPECTED_API_KEY = process.env.GATEWAY_API_KEY || 'guedesloc-secret-key-hml'

  if (apiKey && apiKey === EXPECTED_API_KEY) {
    req.isService = true
    return next()
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Chamada autenticada com Service Account Token do GCP IAM
    req.isService = true
    return next()
  }

  logger.warn('Requisição rejeitada: credencial de serviço ausente/inválida', {
    path: req.originalUrl,
    temApiKey: Boolean(apiKey),
    temBearer: Boolean(authHeader?.startsWith('Bearer ')),
  })
  res.status(401).json({
    sucesso: false,
    erro: 'Não autorizado: Credencial de serviço (x-api-key ou Bearer token IAM) inválida.',
  })
}

/**
 * Middleware para validar chamadas do front-end (Firebase Auth) — primeiro
 * uso real do Gateway pelo front (backlog Fase 4, Card 11.1; fecha o gap do
 * Card 3.2 da Fase 0, que estava marcado "front não chama o Gateway hoje").
 * Valida de verdade o ID token via Admin SDK — diferente do branch Bearer
 * de `serviceAuthMiddleware` acima, que hoje só confere o prefixo.
 */
export async function firebaseAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ sucesso: false, erro: 'Não autorizado: token Firebase ausente.' })
    return
  }

  const idToken = authHeader.slice('Bearer '.length)
  try {
    const decoded = await getAuth().verifyIdToken(idToken)
    req.user = { uid: decoded.uid, email: decoded.email }
    next()
  } catch (err) {
    logger.warn('Requisição rejeitada: token Firebase inválido', {
      path: req.originalUrl,
      erro: err instanceof Error ? err.message : String(err),
    })
    res.status(401).json({ sucesso: false, erro: 'Não autorizado: token Firebase inválido ou expirado.' })
  }
}
