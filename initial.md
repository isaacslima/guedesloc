1. Stack Tecnológica Definida
Front-end: Vue 3 (Composition API) + TypeScript + Vite.

UI/Componentes: Tailwind CSS + shadcn-vue (para construir o dashboard e formulários rapidamente sem perder tempo com CSS).

Backend & BaaS: Firebase (Firestore para banco NoSQL, Firebase Auth para login, Cloud Storage para as fotos/evidências).

Workers & RPA: Google Cloud Run (GCP). O Cloud Run é ideal para rodar containers Docker com o Playwright, pois as Cloud Functions padrão do Firebase podem ter limitações de tempo de execução e tamanho de imagem para browsers headless.

2. Desenho de Domínios (DDD)
A estrutura de dados no Firestore deve refletir os domínios de negócio.

Domínio Companies (Seguradoras):

id, name (ex: Notro, Europ, Tokio Marine), active, parsingRules (regras para o extrator de texto).

Domínio ServiceOrders (Ordens de Serviço - Core):

id, companyId, externalId (Número da OS na seguradora), status (pending, accepted, assigned, completed), customerName, customerPhone, address, city, serviceType (caçamba, guincho), createdAt, deadline.

Domínio Providers (Prestadores de Serviço):

id, name, phone (WhatsApp), cities (array de cidades atendidas), serviceTypes (array de serviços que presta), active.

Domínio Evidences (Fotos/Comprovantes):

id, serviceOrderId, providerId, imageUrl, uploadedAt.

3. Features Iniciais (MVP - Foco em Padronização)
Módulo de Autenticação: Login seguro via Firebase Auth para os gestores (Fernanda e Bruno).

Dashboard Operacional: Visão geral diária de OSs com filtros rápidos por status e seguradora.

Engine de Padronização (O "Funil"):

Uma tela onde o texto bruto copiado do sistema da seguradora é colado.

Uma Cloud Function que recebe esse texto, utiliza Regex ou integração com LLM para extrair os dados e salva a OS estruturada no Firestore.

Gestão de OS: Tela de detalhe da OS com o botão "Enviar para WhatsApp", que gera o link wa.me/numero?text=... já com os dados padronizados.