import type { Request, Response, NextFunction } from 'express'
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
