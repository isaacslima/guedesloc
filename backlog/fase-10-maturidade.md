# Fase 10 — Maturidade, Resiliência e Automação

> **Objetivo:** Elevar o nível de maturidade operacional da plataforma com resiliência avançada de RPA, automação bancária fim a fim e conformidade estrita com LGPD e auditoria de segurança. Reposicionada para o final por depender de volume real de seguradoras (Fase 9) e do fluxo financeiro já rodando (Fase 7) para priorizar automação de pagamento e resiliência em escala. O Card 8.3 (log de auditoria imutável) é a base técnica que alimenta a tela de Auditoria de negócio do Card 14.3 (Fase 8); o Card 4.4 passa a cobrir também evidências de foto de entrega recebidas via WhatsApp (Fase 4/5); o Card 8.4 passa a cobrir também as credenciais do provedor de WhatsApp (Z-API).

---

## Módulos & Epics Inclusos

- **Epic 4 (Completo):** Motor de RPA (Resiliência, auto-recovery e armazenamento de evidências)
- **Epic 6 (Completo):** Automação de Pagamentos via PIX/API Bancária (Card 6.3)
- **Epic 8 (Completo):** Observabilidade, Auditoria LGPD e Gestão de Credenciais

---

## Cards da Fase 4

### Card 4.3 — Tratamento de falhas e resiliência do RPA
**Descrição:** Portais mudam de layout, caem, pedem captcha. O RPA precisa lidar com isso sem quebrar o sistema inteiro.

**Critérios de aceite:**
- Falha de um RPA não impacta os demais (isolamento de falha entre containers).
- Alerta automático quando um seletor/elemento esperado não é encontrado (indício de mudança de layout do portal).
- Reexecução automática com backoff exponencial antes de marcar como falha definitiva.

---

### Card 4.4 — Armazenamento de evidências
**Descrição:** Guardar prints/HTML da execução do RPA para auditoria e troubleshooting.

**Critérios de aceite:**
- Evidência de cada execução armazenada em Cloud Storage com retenção definida (ex: 90 dias).
- Vinculada ao ID da execução no painel de monitoramento.

---

### Card 6.3 — Integração com meio de pagamento (Automação PIX/Bancária)
**Descrição:** Automatizar o pagamento a prestadores via PIX/transferência bancária diretamente pelo sistema ao aprovar o lote.

**Critérios de aceite:**
- Integração com API de banco ou plataforma de pagamentos.
- Confirmação de pagamento via webhook atualiza status do lote automaticamente.

---

### Card 8.3 — Auditoria de acessos e ações (LGPD)
**Descrição:** Como o sistema trata dados sensíveis de clientes/veículos das seguradoras, é necessário registrar quem acessou/alterou cada informação.

**Critérios de aceite:**
- Log de auditoria imutável para ações sensíveis (alteração de valores, exclusão de OS, aprovação de pagamentos).
- Revisão dos dados pessoais trafegados e aplicação de políticas de retenção/anonimização conforme LGPD.

---

### Card 8.4 — Política de segurança de credenciais
**Descrição:** Definir rotação periódica de credenciais de integração e de Service Accounts do GCP.

**Critérios de aceite:**
- Cronograma de rotação documentado e automatizado via Secret Manager onde possível.
