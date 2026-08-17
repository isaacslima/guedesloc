import 'dotenv/config'
import { enfileirarAcao } from './fila'
import { desconectar } from './db'

async function main() {
  const [numeroOs, tipoAcao, payloadJson] = process.argv.slice(2)

  if (!numeroOs || !tipoAcao) {
    console.error('Uso: npm run enfileirar -- <numeroOs> <tipoAcao> [payloadJson]')
    console.error('Ex.: npm run enfileirar -- "542.71868104/2" aceite')
    console.error('Ex.: npm run enfileirar -- "542.71868104/2" atualizar_confirmacao_chegada \'{"senha":"1234"}\'')
    process.exit(1)
  }

  let payload: Record<string, unknown> | undefined
  if (payloadJson) {
    try {
      payload = JSON.parse(payloadJson)
    } catch {
      console.error('payloadJson inválido — precisa ser um JSON válido.')
      process.exit(1)
    }
  }

  const id = await enfileirarAcao(numeroOs, tipoAcao, payload)
  console.log(`[Enfileirar] Ação #${id} criada: "${tipoAcao}" para OS ${numeroOs}`)
  await desconectar()
}

main()
