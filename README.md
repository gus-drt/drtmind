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
* **Armazenamento Dual:** Notas salvas localmente (gratuito, ilimitado) ou na nuvem (Supabase), com limite de até 50 notas salvas e sincronizadas.
* **Importação e Exportação:** Exporte todas as suas notas em JSON e importe de volta a qualquer momento.
* **Autenticação Segura:** Login por e-mail/senha com suporte a redefinição de senha via Supabase Auth.
* **Interface Glassmorphism:** Design moderno com barra inferior em glass, tema claro/escuro e alta legibilidade em todos os tamanhos de tela.
* **Responsividade Total:** Experiência fluida em desktop e mobile, com gestos de swipe e barra de navegação adaptada.
* **Configurações Completas:** Página dedicada para alterar senha, tema da interface, exportar dados e excluir conta.

---

## 🛠️ Stack Tecnológica

O projeto utiliza o que há de mais moderno no ecossistema Web:

* **Frontend:** [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
* **Backend & Auth:** [Supabase](https://supabase.com/) (Postgres, Auth)
* **Armazenamento Local:** [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [idb](https://github.com/jakearchibald/idb)
* **Gerenciamento de Estado:** [TanStack Query](https://tanstack.com/query/latest)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Temas:** [next-themes](https://github.com/pacocoursey/next-themes)
* **Ícones:** [Lucide React](https://lucide.dev/)
* **Testes:** [Vitest](https://vitest.dev/)

---

## 👑 Freemium e Open Source

O Graph Notes conta com uma modalidade *Freemium* para quem não quer perder tempo configurando um banco de dados:

* **Notas Locais Ilimitadas:** Guarde quantas notas quiser gratuitamente, utilizando o armazenamento do seu navegador (IndexedDB).
* **Nuvem Limitada a 50 Notas:** As primeiras 50 notas criadas serão sincronizadas com nosso servidor de nuvem para você as acessar de outros dispositivos. Após isso, novas notas são salvas apenas localmente.
* **Open Source / Ilimitado:** Como o projeto é de código aberto, você sempre pode fazer um **fork do projeto** e apontar as variáveis de ambiente para o _seu próprio_ projeto Supabase. E a melhor parte: é 100% gratuito e não tem limite de notas na nuvem imposto via código.

---

## 🚀 Como Executar e Fazer Self-Hosting

### Pré-requisitos

* Node.js (v18 ou superior) ou [Bun](https://bun.sh/)
* Uma conta no [Supabase](https://supabase.com/)

### 1. Configuração do Backend (Supabase e Banco de Dados)

Se você for rodar utilizando uma nuvem própria, configure o banco de dados antes:

1. Crie um projeto no Supabase.
2. É necessário rodar as **Migrations** SQL para criar as tabelas `notes` e `tags`. Para isso, você pode copiar e colar o conteúdo dos arquivos SQL localizados na pasta `supabase/migrations/` diretamente no painel **SQL Editor** do Supabase. A ordem importa: crie a tabela base e logo depois as suas dependências.
3. Certifique-se de configurar a autenticação via E-mail no Supabase (Authentication > Providers) e desabilitar "Confirm Email" caso não queira usar SMTP de imediato.

### 2. Instalação e Frontend

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
Copie o arquivo de exemplo e preencha com as chaves do seu projeto Supabase:

```bash
cp .env.example .env
```

Edite o `.env` com as chaves "Project ID", "URL", "Anon Key" e "Publishable Key" (disponíveis nos painéis de *Settings -> API* do Supabase).

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
├── data/               # Dados estáticos (notas de boas-vindas)
├── hooks/              # Custom hooks (notas, tags, auth, sincronização, storage)
├── integrations/       # Configuração e tipos do Supabase
├── lib/                # Utilitários (IndexedDB, sync queue, migração)
├── pages/              # Páginas da aplicação (Index, Auth, Settings, ResetPassword)
└── types/              # Definições de tipos TypeScript

supabase/
├── functions/          # Edge Functions utilitárias (delete-account)
└── migrations/         # Migrações do banco de dados PostgreSQL
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
