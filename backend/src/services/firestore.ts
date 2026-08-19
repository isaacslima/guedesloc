import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'

// initializeApp() sem argumentos usa Application Default Credentials —
// GOOGLE_APPLICATION_CREDENTIALS apontando pra uma chave de service account,
// ou `gcloud auth application-default login` em desenvolvimento local.
if (getApps().length === 0) {
  // projectId fixo (mesmo do .firebaserc da raiz do monorepo) — sem isso o
  // Admin SDK também tenta autodetectar o project id via metadata do GCP,
  // o que falha (ou demora) fora de um ambiente GCP real.
  initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT || 'guedesloc' })
}

export const db = getFirestore()
export { FieldValue, Timestamp }

/**
 * Chaves de negócio (idempotencyKey, numeroOsSeguradora) podem conter "/" —
 * ex.: OS "542.71898731/1" da Tempo Assist. Usadas cruas como ID de
 * documento, o Firestore interpreta a "/" como separador de
 * coleção/documento e quebra (documentPath com número ímpar de
 * componentes). Sempre sanitizar antes de usar em .doc(id).
 */
export function sanitizarIdDocumento(id: string): string {
  return id.replace(/\//g, '_')
}
