# DIVIDAS_PROJETO.md
## Log de Dívidas Técnicas, Bugs e Melhorias Pendentes

**Como usar:** registrar aqui qualquer item que seja **identificado mas não resolvido agora**. Não usar como TODO list de tarefas planejadas — usar para itens que **emergem durante o desenvolvimento** e precisam ser registrados pra não serem esquecidos.

**Formato:** item mais recente no topo de cada categoria.

**Política:** revisar este arquivo ao final de cada sprint/marco. Resolver, descartar ou repriorizar itens.

---

## 🐛 Bugs Conhecidos

*(nenhum até o momento)*

### Template para entrada
```
### [BUG-001] Título curto
- **Onde:** caminho/arquivo, módulo
- **Descrição:** o que acontece, o que deveria acontecer
- **Severidade:** baixa / média / alta / crítica
- **Workaround:** se houver
- **Identificado em:** sessão N, DD/MM/AAAA
```

---

## 🔧 Melhorias Pendentes

*(nenhuma até o momento)*

### Template para entrada
```
### [MEL-001] Título curto
- **Onde:** caminho/arquivo, módulo
- **Descrição:** o que melhorar e por quê
- **Impacto esperado:** performance / UX / manutenção / segurança
- **Esforço estimado:** baixo / médio / alto
- **Identificado em:** sessão N, DD/MM/AAAA
```

---

## ✨ Features Futuras

Ideias que surgiram mas estão **fora do escopo atual**. Não implementar agora.

*(nenhuma até o momento)*

### Template para entrada
```
### [FEAT-001] Título curto
- **Descrição:** o que seria a feature
- **Por que faz sentido:** problema que resolve
- **Quando reavaliar:** após X, após pedido de Y, etc.
- **Identificado em:** sessão N, DD/MM/AAAA
```

---

## 🏗️ Refatoração Necessária

Código que funciona mas precisa ser melhorado antes da próxima feature relacionada.

### [REF-001] `trustHost: true` em `lib/auth/config.ts` é no-op em NextAuth v4
- **Onde:** `lib/auth/config.ts`
- **Por que refatorar:** a flag `trustHost` é prop oficial só do NextAuth v5 (Auth.js). Em v4 (4.24.10), foi mantida via type extension `NextAuthOptionsV5` como prep — em runtime é ignorada. O que de fato resolve previews na v4 é o `resolveAuthUrl()` sobrescrevendo `process.env.NEXTAUTH_URL`.
- **Bloqueia:** nada agora. Validar ativação real quando subir pra NextAuth v5.
- **Esforço estimado:** baixo (remover o type extension assim que upgrade for feito).
- **Identificado em:** Sessão 1 de Infra, 14/05/2026

### Template para entrada
```
### [REF-001] Título curto
- **Onde:** caminho/arquivo
- **Por que refatorar:** problema atual (acoplamento, duplicação, complexidade)
- **Bloqueia:** o que não pode ser feito antes da refatoração
- **Identificado em:** sessão N, DD/MM/AAAA
```

---

## 📚 Dúvidas e Decisões Pendentes

Pontos onde uma decisão de produto é necessária antes de avançar.

### [DEC-002] Especificação completa do M5 (Banners Email)
- **Bloqueia:** implementação do M5
- **Contexto registrado:** ferramenta de email = Edrone; resto 100% TBD
- **Aguardando:** sessão de planejamento dedicada ao M5
- **Identificado em:** sessão 0, 13/05/2026

### [DEC-004] Coerência de estampa em múltiplos móveis (Foto Ambiente do M1)
- **Onde:** `lib/m1/prompts.ts` — bloco `MULTI-FURNITURE COHERENCE` dentro de `buildStep2Prompt` quando `tipoFoto === 'ambiente'`
- **Descrição:** Foto Ambiente aplica a mesma estampa em 2 sofás (2+3 lugares) ou 6 cadeiras em ângulos diferentes. Risco de inconsistência de escala/cor entre as peças.
- **Status:** A TESTAR (fase de treinamento manual após implementação)
- **Quando validar:** após Rafael testar 5–10 outputs reais cobrindo estampas simples e complexas (Boho, mandalas, padrões densos)
- **Decisão final pendente:** aceitar pipeline atual ou criar tratamento extra (ex: passar swatch + hint de escala explicitamente; rodar Step 2 com referência maior)
- **Identificado em:** Implementação M1, 14/05/2026

### [DEC-005] Pipeline 2-step + cache para todo M1 (Pipeline A)
- **Onde:** `lib/m1/render-pipeline-a.ts` + `lib/m1/cache.ts`
- **Descrição:** Step 1 gera capa neutra (swatch) com Flux Kontext a partir da foto-referência; Step 2 aplica esse swatch no template via inpainting (mask Grounded-SAM pré-gerada). Cache LRU 30min/50 entradas reutiliza Step 1 entre cenários (mesma capa, vários ambientes).
- **Status:** APROVADO em planejamento (decisão de Rafael, registrada aqui). Será marcada **RESOLVIDA** quando implementação for testada com render real (depende de FAL_KEY + Vercel Pro + 11 PNGs).
- **Custo extra:** ~$1–2/mês (desprezível no volume da equipe de 4)
- **Justificativa:** evita retrabalho, garante qualidade em estampas complexas (Boho, alto-relevo), permite reutilizar Step 1 entre cenários e mantém prompts independentes.
- **Identificado em:** Implementação M1, 14/05/2026


### Template para entrada
```
### [DEC-NNN] Título curto
- **Bloqueia:** o que está parado
- **Contexto:** o que já foi discutido / decidido parcialmente
- **Aguardando:** quem ou qual evento destrava
- **Identificado em:** sessão N, DD/MM/AAAA
```

---

## 🗑️ Resolvidas / Descartadas

Quando uma dívida é resolvida ou descartada, mover para cá com nota curta. Manter os últimos 20 itens, depois limpar.

### [DEC-001] Dimensões exatas M3 (desktop e mobile) — RESOLVIDA em sessão 4 (15/05/2026)
- **Decisão:** Desktop 1920×550 WEBP, Mobile 800×600 WEBP
- **Implementação:** `lib/brand/m3.brand.ts`
- **Validado:** time/design do Rafael confirmou as duas proporções

### [MEL-001] Limpeza periódica do Vercel Blob — RESOLVIDA em Sessão 1 de Infra (14/05/2026)
- **Solução:** cron implementado em `app/api/cron/cleanup-blob/route.ts` com schedule diário `0 3 * * *` (03h UTC) declarado em `vercel.json`.
- **Política:** deleta blobs com mais de 7 dias; preserva tudo que começa com prefixo `templates/`. Autenticado via header `Authorization: Bearer ${CRON_SECRET}`.
- **Commit:** `83d7b6f`.

### [DEC-003] Licença Times New Roman MT — RESOLVIDA em sessão 2 (13/05/2026)
- **Decisão:** substituída por **Tinos** (Google Fonts, Apache License 2.0 — clone métrico open-source do Times, uso comercial livre).
- **Implementação:** TTFs Regular e Bold self-hosted em `public/fonts/Tinos-{Regular,Bold}.ttf`, declaração `@font-face` em `app/globals.css` com fallback Google Fonts CDN, `brandM4.fonts.text = 'Tinos, "Times New Roman", serif'`.

### [DEC-006] Endpoint `fal-ai/flux-pro/kontext` não aceita `mask_url` / `reference_image_url` — RESOLVIDA em sessão 3 (14/05/2026)
- **Solução:** Step 2 do Pipeline A migrado de `fal-ai/flux-pro/kontext` (não suporta mask+reference) para `fal-ai/flux-kontext-lora/inpaint` (suporta image+mask+reference+prompt). Custo total Pipeline A: ~$0.10/img. Arquitetura 2-step + cache preservada. Endpoint usado é `dev`+LoRA — validar qualidade na fase de treinamento; se insuficiente, migrar pra Opção B (fluxo descrito na DEC-006).
- **Implementação:**
  - `lib/brand/m1.brand.ts` — `pipeline.falModels.fluxKontextInpaint = 'fal-ai/flux-kontext-lora/inpaint'`
  - `lib/m1/fal-client.ts` — nova função `callFluxKontextInpaint()` com tipo local `FluxKontextInpaintInput` (mirror de `BaseKontextInpaintInput` do SDK)
  - `lib/m1/render-pipeline-a.ts` — Step 2 chama `callFluxKontextInpaint`; Step 1 continua em `callFluxKontext` (`flux-pro/kontext`)
  - `docs/IMPL_M1.md` bump pra v1.1
- **Validações:** typecheck/lint/build limpos.
