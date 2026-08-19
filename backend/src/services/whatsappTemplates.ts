// Templates de mensagem (backlog Fase 4, Card 11.3) — fixos nesta fase; a
// parametrização de horário/tentativas vem só na Fase 5 (Central de
// Automações).

export type TipoMensagemWhatsapp =
  | 'distribuicao'
  | 'confirmacao_dia'
  | 'confirmacao_entrega'
  | 'cobranca_foto'
  | 'cobranca_retirada'

export interface DadosParaTemplate {
  numero: string
  clienteNome: string
  endereco: string
  servicoTipo: string
  agendamento?: string // ISO
}

function formatarDataHora(iso?: string): string {
  if (!iso) return 'a combinar'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return 'a combinar'
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function montarTemplate(tipo: TipoMensagemWhatsapp, dados: DadosParaTemplate): string {
  switch (tipo) {
    case 'distribuicao':
      return (
        `Nova OS ${dados.numero}\n` +
        `Cliente: ${dados.clienteNome}\n` +
        `Endereço: ${dados.endereco}\n` +
        `Serviço: ${dados.servicoTipo}\n` +
        `Agendamento: ${formatarDataHora(dados.agendamento)}\n\n` +
        `Responda com uma das opções:\n1 - ACEITAR\n2 - RECUSAR\n3 - FALAR COM A EQUIPE`
      )
    case 'confirmacao_dia':
      return (
        `Confirmando: hoje tem a OS ${dados.numero} (${dados.clienteNome}), agendada pra ${formatarDataHora(dados.agendamento)}.\n` +
        `Responda 1 pra confirmar ou 3 pra falar com a equipe.`
      )
    case 'confirmacao_entrega':
      return (
        `OS ${dados.numero} (${dados.clienteNome}): a entrega já foi realizada?\n` +
        `Responda 1 pra confirmar entrega ou 3 pra falar com a equipe.`
      )
    case 'cobranca_foto':
      return `OS ${dados.numero}: ainda falta a foto da entrega. Pode enviar por aqui mesmo, por favor?`
    case 'cobranca_retirada':
      return (
        `OS ${dados.numero} (${dados.clienteNome}, ${dados.endereco}): já está no prazo de retirada da caçamba.\n` +
        `Pode confirmar a data prevista?`
      )
  }
}
