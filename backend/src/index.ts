import express from 'express'
import type { Request, Response } from 'express'
import { serviceAuthMiddleware } from './middleware/auth.js'
import {
  verificarEBloquearIdempotencia,
  registrarSucessoIdempotencia,
  registrarErroIdempotencia,
} from './services/idempotency.js'
import { publicarEventoOS, type TipoEventoOS } from './services/pubsub.js'

const app = express()
const PORT = process.env.PORT || 8080

app.use(express.json())

// Healthcheck
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'guedesloc-gateway-backend', timestamp: new Date().toISOString() })
})

// Ingestão Canônica de OS v1 (API Gateway)
app.post('/api/v1/os/ingest', serviceAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ sucesso: false, erro: 'Payload JSON inválido.' })
      return
    }

    const { seguradoraId, seguradoraNome, numeroOsSeguradora, status, cliente, servico, datas } = payload

    // Validação de Campos Obrigatórios
    if (!seguradoraId || !numeroOsSeguradora || !cliente?.nome || !cliente?.endereco || !servico?.tipo || !datas?.criacao) {
      res.status(422).json({
        sucesso: false,
        erro: 'Payload fora do Contrato Canônico. Verifique campos obrigatórios (seguradoraId, numeroOsSeguradora, cliente, servico, datas).',
      })
      return
    }

    const idempotencyKey = payload.idempotencyKey || `${seguradoraId}:${numeroOsSeguradora}`

    // Checagem de Idempotência
    const idempotencyCheck = await verificarEBloquearIdempotencia(idempotencyKey, seguradoraId, numeroOsSeguradora)
    if (idempotencyCheck.isDuplicate) {
      res.status(409).json({
        sucesso: false,
        idempotente: true,
        mensagem: idempotencyCheck.mensagem,
        idempotencyKey,
      })
      return
    }

    // Determina o eventoPubSub
    let tipoEvento: TipoEventoOS = 'os.criada'
    if (status === 'concluida') tipoEvento = 'os.finalizada'
    else if (status === 'cancelada') tipoEvento = 'os.cancelada'
    else if (status === 'em_andamento') tipoEvento = 'os.status_alterado'

    // Publica o Evento no Barramento Pub/Sub
    const eventoId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    await publicarEventoOS(tipoEvento, {
      id: eventoId,
      tipoEvento,
      timestamp: new Date().toISOString(),
      idempotencyKey,
      payloadOS: payload,
    })

    await registrarSucessoIdempotencia(idempotencyKey)

    res.status(201).json({
      sucesso: true,
      mensagem: 'Ordem de serviço ingerida e evento publicado com sucesso.',
      idempotencyKey,
      eventoId,
      tipoEvento,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const err = error as Error
    console.error('[Gateway API Error]:', err)
    if (req.body?.idempotencyKey) {
      await registrarErroIdempotencia(req.body.idempotencyKey)
    }
    res.status(500).json({ sucesso: false, erro: 'Erro interno ao processar ingestão de OS.', detalhe: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Gateway Backend rodando na porta ${PORT}`)
})
