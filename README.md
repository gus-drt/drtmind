# 🧠 DrtMind

> **DrtMind** é uma ferramenta de pensamento em rede (networked thought) projetada para funcionar como um "segundo cérebro". Desenvolvida para transformar notas isoladas em um ecossistema de conhecimento interconectado.

<p align="center">
<img src="[https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB]" alt="React" />
<img src="[https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript](https://www.google.com/search?q=https://img.shields.io/badge/TypeScript-5.8-blue%3Flogo%3Dtypescript)" alt="TypeScript" />
<img src="[https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css](https://www.google.com/search?q=https://img.shields.io/badge/Tailwind-3.4-38B2AC%3Flogo%3Dtailwind-css)" alt="Tailwind CSS" />
<img src="[https://img.shields.io/badge/Supabase-Backend-green?logo=supabase](https://www.google.com/search?q=https://img.shields.io/badge/Supabase-Backend-green%3Flogo%3Dsupabase)" alt="Supabase" />
<img src="[https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite](https://www.google.com/search?q=https://img.shields.io/badge/Vite-5.4-646CFF%3Flogo%3Dvite)" alt="Vite" />
</p>

---

## 📖 O Projeto

O **DrtMind** nasceu de uma necessidade pessoal: a frustração com o armazenamento linear de informações. Em um mundo onde o conhecimento é fluido e multifacetado, pastas e listas tradicionais muitas vezes se tornam cemitérios de arquivos.

Esta aplicação foi construída para permitir que as ideias se conectem organicamente. Inspirado em metodologias como *Zettelkasten* e ferramentas como Obsidian/Roam Research, o DrtMind foca na simplicidade e na visualização de conexões por meio de um **Grafo de Notas**.

---

## ✨ Funcionalidades Principais

* **Visualização em Grafo:** Uma interface interativa que permite ver como suas notas se conectam visualmente, facilitando a descoberta de novos insights.
* **Editor Markdown:** Escreva notas ricas com suporte nativo a Markdown e pré-visualização em tempo real.
* **Pensamento Bidirecional:** Conecte notas facilmente e navegue entre elas através de links internos.
* **Autenticação Segura:** Proteção total dos seus pensamentos através de login social e e-mail via Supabase.
* **Interface Neo-Brutalista:** Design moderno baseado em Shadcn/UI com bordas marcantes e alta legibilidade.
* **Responsividade Total:** Uma experiência fluida tanto no desktop quanto em dispositivos móveis.

---

## 🛠️ Stack Tecnológica

O projeto utiliza o que há de mais moderno no ecossistema Web:

* **Frontend:** [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
* **Backend & Auth:** [Supabase](https://supabase.com/)
* **Gerenciamento de Estado:** [TanStack Query](https://tanstack.com/query/latest)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Ícones:** [Lucide React](https://lucide.dev/)

---

## 🚀 Como Executar

### Pré-requisitos

* Node.js (v18 ou superior)
* npm ou Bun

### Instalação

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/drtmind.git
cd drtmind

```

2. Instale as dependências:

```bash
npm install

```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz e adicione suas chaves do Supabase:

```env
VITE_SUPABASE_URL=sua_url_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui

```

4. Inicie o servidor de desenvolvimento:

```bash
npm run dev

```

---

## 🗺️ Estrutura de Arquivos

```text
src/
├── components/         # Componentes reutilizáveis (UI, Notes, etc)
├── hooks/              # Custom hooks para lógica de negócios e DB
├── integrations/       # Configuração e tipos do Supabase
├── pages/              # Páginas da aplicação (Index, Auth, NotFound)
└── types/              # Definições de tipos TypeScript

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
Desenvolvido por <strong>Gus DRT</strong> 🚀
</p>
