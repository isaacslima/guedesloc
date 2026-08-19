import { db, FieldValue } from './firestore.js'

export type TipoAutomacao = 'distribuicao' | 'confirmacao_dia' | 'confirmacao_entrega' | 'cobranca_foto' | 'cobranca_retirada'
export type SituacaoFila = 'executada' | 'simulada' | 'sugerida' | 'falha'

/**
 * Registro de cada avaliação/ação do motor de automações (Card 12.8) —
 * como o motor roda por polling (reavalia tudo a cada tick, não agenda
 * ações futuras de verdade), isso funciona como um log de execução, não
 * uma fila cancelável de ações futuras. Ver gap documentado no backlog.
 */
export async function registrarFila(entrada: {
  osId: string
  numeroOs: string
  tipo: TipoAutomacao
  situacao: SituacaoFila
  prestadorId?: string
  prestadorNome?: string
  detalhe?: string
}): Promise<void> {
  await db.collection('automacoes_fila').add({
    ...entrada,
    prestadorId: entrada.prestadorId ?? null,
    prestadorNome: entrada.prestadorNome ?? null,
    detalhe: entrada.detalhe ?? null,
    criadoEm: FieldValue.serverTimestamp(),
  })
}
