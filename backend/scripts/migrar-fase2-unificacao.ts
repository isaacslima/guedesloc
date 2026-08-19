/**
 * Migração Fase 2, Card 9.2 — unifica `ordens` (manual) e `ordens_integradas`
 * (via Gateway) numa única coleção `ordens`, no formato de
 * src/types/ordem.ts::OrdemUnificada.
 *
 * Por padrão roda em modo dry-run (só lê, gera relatório, não escreve nada).
 * Só grava de verdade com --aplicar.
 *
 *   npx tsx scripts/migrar-fase2-unificacao.ts              # dry-run
 *   npx tsx scripts/migrar-fase2-unificacao.ts --aplicar    # escreve de verdade
 *
 * Idempotente: pode rodar de novo sem duplicar — pula documento de
 * `ordens_integradas` cujo ID já existe em `ordens` com `origem` já
 * preenchido, e pula documento de `ordens` que já tem `origem` preenchido
 * (ou seja, já migrado).
 */
import 'dotenv/config'
import { db, Timestamp } from '../src/services/firestore.js'
import { derivarEtapaDeStatus, type OSEtapa, type OSStatus } from '../src/services/etapaOS.js'

const APLICAR = process.argv.includes('--aplicar')

interface Relatorio {
  ordensIntegradas: { total: number; migradas: number; jaMigradas: number; comProblema: string[] }
  ordensManuais: { total: number; migradas: number; jaMigradas: number; comProblema: string[] }
}

function paraTimestamp(valor: unknown): Timestamp | null {
  if (valor instanceof Timestamp) return valor
  if (typeof valor === 'string' && valor) {
    const data = new Date(valor)
    if (!Number.isNaN(data.getTime())) return Timestamp.fromDate(data)
  }
  return null
}

function paraISOouNull(valor: unknown): string | null {
  if (valor instanceof Timestamp) return valor.toDate().toISOString()
  if (typeof valor === 'string' && valor) return valor
  return null
}

async function migrarOrdensIntegradas(relatorio: Relatorio): Promise<void> {
  const snap = await db.collection('ordens_integradas').get()
  relatorio.ordensIntegradas.total = snap.size

  let batch = db.batch()
  let contadorBatch = 0

  for (const doc of snap.docs) {
    const data = doc.data()
    const destino = db.collection('ordens').doc(doc.id)
    const existenteDestino = await destino.get()

    if (existenteDestino.exists && existenteDestino.data()?.origem) {
      relatorio.ordensIntegradas.jaMigradas++
      continue
    }

    if (!data.cliente?.nome || !data.servico?.tipo || !data.status || !data.datas?.criacao) {
      relatorio.ordensIntegradas.comProblema.push(`${doc.id}: faltando cliente.nome/servico.tipo/status/datas.criacao`)
      continue
    }

    const status = data.status as OSStatus
    const etapaNova: OSEtapa = derivarEtapaDeStatus(status)
    const criacao = paraTimestamp(data.datas.criacao) ?? Timestamp.now()

    const unificado = {
      origem: 'integrada_rpa',
      seguradoraId: data.seguradoraId ?? null,
      seguradoraNome: data.seguradoraNome ?? null,
      numero: data.numeroOsSeguradora ?? doc.id,
      numeroOsSeguradora: data.numeroOsSeguradora ?? null,
      idempotencyKey: data.idempotencyKey ?? doc.id,
      status,
      etapa: etapaNova,
      cliente: {
        nome: data.cliente.nome,
        telefone: data.cliente.telefone ?? null,
        cpfCnpj: data.cliente.cpfCnpj ?? null,
        email: data.cliente.email ?? null,
        endereco: { texto: data.cliente.endereco ?? '' },
      },
      clienteId: null,
      equipamentoId: null,
      equipamentoNome: null,
      prestadoresIds: [],
      prestadoresNomes: [],
      servico: {
        tipo: data.servico.tipo,
        descricao: data.servico.descricao ?? '',
        valor: typeof data.servico.valor === 'number' ? data.servico.valor : null,
      },
      observacoes: null,
      datas: {
        criacao,
        agendamento: paraISOouNull(data.datas.agendamento),
        entregaReal: null,
        retiradaReal: null,
        conclusao: null,
      },
      historico: [
        {
          em: new Date().toISOString(),
          etapaAnterior: null,
          etapaNova,
          motivo: 'Migração pro modelo unificado (Fase 2, Card 9.2)',
        },
      ],
      camposAdicionais: data.camposAdicionais ?? null,
    }

    if (APLICAR) {
      batch.set(destino, unificado, { merge: true })
      contadorBatch++
      if (contadorBatch >= 400) {
        await batch.commit()
        batch = db.batch()
        contadorBatch = 0
      }
    }
    relatorio.ordensIntegradas.migradas++
  }

  if (APLICAR && contadorBatch > 0) await batch.commit()
}

async function migrarOrdensManuais(relatorio: Relatorio): Promise<void> {
  const [snapOrdens, snapClientes] = await Promise.all([
    db.collection('ordens').get(),
    db.collection('clientes').get(),
  ])
  const enderecoPorClienteId = new Map<string, string>()
  snapClientes.docs.forEach((c) => enderecoPorClienteId.set(c.id, (c.data().endereco as string) ?? ''))

  const docsManuais = snapOrdens.docs.filter((d) => !d.data().origem)
  relatorio.ordensManuais.total = docsManuais.length + snapOrdens.docs.filter((d) => d.data().origem).length
  relatorio.ordensManuais.jaMigradas = snapOrdens.docs.filter((d) => d.data().origem).length

  let batch = db.batch()
  let contadorBatch = 0

  for (const doc of docsManuais) {
    const data = doc.data()

    if (!data.numero || !data.status) {
      relatorio.ordensManuais.comProblema.push(`${doc.id}: faltando numero/status`)
      continue
    }

    const status = (data.status as OSStatus) ?? 'aberta'
    const etapaNova: OSEtapa = derivarEtapaDeStatus(status)
    const criacao = paraTimestamp(data.dataCriacao) ?? Timestamp.now()

    const unificado = {
      origem: 'manual',
      status,
      etapa: etapaNova,
      numero: data.numero,
      cliente: {
        nome: data.clienteNome ?? '',
        telefone: null,
        cpfCnpj: null,
        email: null,
        endereco: { texto: (data.clienteId && enderecoPorClienteId.get(data.clienteId)) || '' },
      },
      clienteId: data.clienteId ?? null,
      equipamentoId: data.equipamentoId ?? null,
      equipamentoNome: data.equipamentoNome ?? null,
      prestadoresIds: data.prestadoresIds ?? [],
      prestadoresNomes: data.prestadoresNomes ?? [],
      servico: {
        tipo: data.tipo ?? '',
        descricao: data.descricao ?? '',
        valor: null,
      },
      observacoes: data.observacoes ?? null,
      datas: {
        criacao,
        agendamento: paraISOouNull(data.dataAgendamento),
        entregaReal: null,
        retiradaReal: null,
        conclusao: null,
      },
      historico: [
        {
          em: new Date().toISOString(),
          etapaAnterior: null,
          etapaNova,
          motivo: 'Migração pro modelo unificado (Fase 2, Card 9.2)',
        },
      ],
      camposAdicionais: null,
    }

    if (APLICAR) {
      batch.update(doc.ref, unificado)
      contadorBatch++
      if (contadorBatch >= 400) {
        await batch.commit()
        batch = db.batch()
        contadorBatch = 0
      }
    }
    relatorio.ordensManuais.migradas++
  }

  if (APLICAR && contadorBatch > 0) await batch.commit()
}

async function main() {
  console.log(`[Migração Fase 2] Modo: ${APLICAR ? 'APLICAR (grava de verdade)' : 'DRY-RUN (só leitura)'}`)

  const relatorio: Relatorio = {
    ordensIntegradas: { total: 0, migradas: 0, jaMigradas: 0, comProblema: [] },
    ordensManuais: { total: 0, migradas: 0, jaMigradas: 0, comProblema: [] },
  }

  await migrarOrdensIntegradas(relatorio)
  await migrarOrdensManuais(relatorio)

  console.log('\n=== Relatório ===')
  console.log(`ordens_integradas → ordens: ${relatorio.ordensIntegradas.total} no total, ${relatorio.ordensIntegradas.migradas} ${APLICAR ? 'migradas' : 'a migrar'}, ${relatorio.ordensIntegradas.jaMigradas} já migradas antes.`)
  if (relatorio.ordensIntegradas.comProblema.length > 0) {
    console.log(`  ⚠️ ${relatorio.ordensIntegradas.comProblema.length} com problema (não migradas):`)
    relatorio.ordensIntegradas.comProblema.forEach((p) => console.log(`    - ${p}`))
  }

  console.log(`ordens (manual, em lugar): ${relatorio.ordensManuais.total} no total, ${relatorio.ordensManuais.migradas} ${APLICAR ? 'migradas' : 'a migrar'}, ${relatorio.ordensManuais.jaMigradas} já migradas antes.`)
  if (relatorio.ordensManuais.comProblema.length > 0) {
    console.log(`  ⚠️ ${relatorio.ordensManuais.comProblema.length} com problema (não migradas):`)
    relatorio.ordensManuais.comProblema.forEach((p) => console.log(`    - ${p}`))
  }

  if (!APLICAR) {
    console.log('\nDry-run concluído — nada foi gravado. Revise o relatório e rode de novo com --aplicar pra migrar de verdade.')
  } else {
    console.log('\nMigração aplicada.')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('[Migração Fase 2] Erro fatal:', err)
  process.exit(1)
})
