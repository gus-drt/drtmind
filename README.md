# 🧠 Graph Notes

> **Graph Notes** é uma ferramenta de pensamento em rede (networked thought) projetada para funcionar como um "segundo cérebro". Desenvolvida para transformar notas isoladas em um ecossistema de conhecimento interconectado.

<p align="center">
<img alt="Static Badge" src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB">
<img alt="Static Badge" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white">
<img alt="Static Badge" src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white">
<img alt="Static Badge" src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=white">
<img alt="Static Badge" src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=white">
</p>

---

## 📖 O Projeto

O **Graph Notes** nasceu de uma necessidade pessoal: a frustração com o armazenamento linear de informações. Em um mundo onde o conhecimento é fluido e multifacetado, pastas e listas tradicionais muitas vezes se tornam cemitérios de arquivos.

Esta aplicação foi construída para permitir que as ideias se conectem organicamente. Inspirado em metodologias como *Zettelkasten* e ferramentas como Obsidian/Roam Research, o Graph Notes foca na simplicidade e na visualização de conexões por meio de um **Grafo de Notas**.

---

## ✨ Funcionalidades Principais

* **Visualização em Grafo:** Interface interativa com pan/zoom, centralização automática no nó índice e layout responsivo para mobile.
* **Editor Markdown:** Escreva notas ricas com suporte nativo a Markdown e pré-visualização em tempo real.
* **Pensamento Bidirecional:** Conecte notas através de links internos `[[Nome da Nota]]` e navegue entre elas com um clique.
* **Sistema de Tags:** Crie e gerencie tags coloridas para organizar suas notas; compatível com armazenamento local e na nuvem.
* **Fixar Notas:** Destaque notas importantes fixando-as no topo da lista.
* **Offline-First com Sincronização:** As notas são salvas localmente via IndexedDB e sincronizadas automaticamente com a nuvem quando a conexão é restabelecida. Um indicador visual mostra o status da sincronização em tempo real.
* **Armazenamento Dual:** Notas salvas localmente (gratuito, ilimitado) ou na nuvem (Supabase), com migração automática ao trocar de plano.
* **Importação e Exportação:** Exporte todas as suas notas em JSON e importe de volta a qualquer momento.
* **Autenticação Segura:** Login por e-mail/senha com suporte a redefinição de senha via Supabase Auth.
* **Interface Glassmorphism:** Design moderno com barra inferior em glass, tema claro/escuro e alta legibilidade em todos os tamanhos de tela.
* **Responsividade Total:** Experiência fluida em desktop e mobile, com gestos de swipe e barra de navegação adaptada.
* **Configurações Completas:** Página dedicada para alterar senha, tema da interface, exportar dados e excluir conta.
* **Planos de Assinatura:** Planos Free, Pro e AI Plus com integração Stripe via Supabase Edge Functions.

---

## 🛠️ Stack Tecnológica

O projeto utiliza o que há de mais moderno no ecossistema Web:

* **Frontend:** [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
* **Backend & Auth:** [Supabase](https://supabase.com/) (Postgres, Auth, Edge Functions)
* **Pagamentos:** Stripe via Supabase Edge Functions
* **Armazenamento Local:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [idb](https://github.com/jakearchibald/idb)
* **Gerenciamento de Estado:** [TanStack Query](https://tanstack.com/query/latest)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Temas:** [next-themes](https://github.com/pacocoursey/next-themes)
* **Ícones:** [Lucide React](https://lucide.dev/)
* **Testes:** [Vitest](https://vitest.dev/)

---

## 💳 Planos

| Recurso | Free | Pro | AI Plus |
|---|---|---|---|
| Notas locais (IndexedDB) | ✅ Ilimitadas | ✅ Ilimitadas | ✅ Ilimitadas |
| Notas na nuvem | Até 20 | ✅ Ilimitadas | ✅ Ilimitadas |
| Sincronização multi-device | ❌ | ✅ | ✅ |
| Suporte prioritário | ❌ | ✅ | ✅ |
| Recursos de IA (em breve) | ❌ | ❌ | ✅ |
| Preço | Grátis | R$ 19,90/mês | R$ 39,90/mês |

---

## 🚀 Como Executar

### Pré-requisitos

* Node.js (v18 ou superior) ou [Bun](https://bun.sh/)
* Uma conta no [Supabase](https://supabase.com/) com um projeto configurado

### Instalação

1. Clone o repositório:

```bash
git clone https://github.com/gus-drt/graphnotes.git
cd graphnotes
```

2. Instale as dependências:

```bash
npm install
# ou
bun install
```

3. Configure as variáveis de ambiente:
Copie o arquivo de exemplo e preencha com as suas chaves do Supabase:

```bash
cp .env.example .env
```

Edite o `.env` com os valores do seu projeto Supabase. Consulte `.env.example` para ver todas as variáveis necessárias.

4. Inicie o servidor de desenvolvimento:

```bash
npm run dev
# ou
bun dev
```

### Executando os Testes

```bash
npm run test
# ou
bun test
```

---

## 🗺️ Estrutura de Arquivos

```text
src/
├── __tests__/          # Testes automatizados (Vitest)
├── components/
│   ├── notes/          # Componentes de notas (editor, lista, grafo, tags)
│   ├── settings/       # Componentes da página de configurações
│   └── ui/             # Componentes de UI (Shadcn/UI)
├── config/             # Configurações de planos de assinatura
├── data/               # Dados estáticos (notas de boas-vindas)
├── hooks/              # Custom hooks (notas, tags, auth, sincronização, assinatura)
├── integrations/       # Configuração e tipos do Supabase
├── lib/                # Utilitários (IndexedDB, sync queue, migração)
├── pages/              # Páginas da aplicação (Index, Auth, Settings, Pricing, ResetPassword)
└── types/              # Definições de tipos TypeScript

supabase/
├── functions/          # Edge Functions (check-subscription, create-checkout, customer-portal, delete-account)
└── migrations/         # Migrações do banco de dados
```

---

## 🤝 Contribuição

Contribuições são o que fazem a comunidade open source um lugar incrível para aprender, inspirar e criar. Qualquer contribuição que você fizer será **muito apreciada**.

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Adicione suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Faça o Push da Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📝 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

---

<p align="center">
Desenvolvido por <strong>Gustavo Duarte</strong> 🚀
</p>
