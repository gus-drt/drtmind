
Objetivo
- Eliminar o “site em branco” em produção causado por `supabaseUrl is required` e deixar o app resiliente para não quebrar silenciosamente no Live.

Diagnóstico (o que já confirmei)
- O erro vem da inicialização do client de backend no bundle de produção.
- Em Preview funciona, então o código em si está válido no ambiente de teste.
- O problema está no ciclo de build/publicação do frontend Live (variáveis de build ausentes/stale build), não nas funções de backend.
- Há também warnings de `ref` no `Badge`/`Pricing` (não causam tela branca, mas poluem debug).

Plano de implementação
1) Blindar o bootstrap para nunca gerar tela branca
- Arquivo: `src/main.tsx`
- Trocar o bootstrap para carregamento dinâmico do `App` (lazy import) após validar variáveis públicas obrigatórias.
- Se faltar config, renderizar uma tela de erro amigável (com instrução de atualização/publicação), em vez de quebrar a aplicação inteira.

2) Criar verificador central de configuração pública
- Novo arquivo: `src/lib/runtimeConfig.ts`
- Expor função de validação (`getMissingPublicConfig`) para `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Reuso em bootstrap e logs para diagnóstico claro no console.

3) Adicionar fallback de build no Vite (sem mexer no client gerado)
- Arquivo: `vite.config.ts`
- Definir fallback de build para variáveis públicas obrigatórias quando ausentes no pipeline Live.
- Isso evita que o bundle publicado nasça com `undefined` e reduz risco de regressão.
- Não editar `src/integrations/supabase/client.ts` (arquivo gerado).

4) Limpar warning de ref que está aparecendo no console
- Arquivo: `src/components/ui/badge.tsx`
- Converter `Badge` para `React.forwardRef` para eliminar o warning de ref em `Pricing`/`App`.

5) Publicação e validação em Live
- Publicar atualização de frontend (Update).
- Validar no domínio publicado:
  - abre `/` sem tela branca;
  - console sem `supabaseUrl is required`;
  - autenticação e carregamento inicial funcionando;
  - `Pricing` sem warning de ref.

Validação final (checklist rápido)
- Preview continua funcional.
- Produção abre sem erro crítico.
- Hard refresh em produção não volta a quebrar.
- Fluxos básicos (`/`, `/auth`, `/pricing`, `/settings`) carregam normalmente.
