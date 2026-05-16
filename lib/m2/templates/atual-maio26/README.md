# Template 1 — Atual_Maio26

**Status:** Ativo (V1, Fase 1 do M2 — 18/05/2026)
**Pipeline:** `fal-prompt-puro` (gpt-image-1 via fal.ai)
**Custo:** ~$0.063/imagem (medium em 1024×1536)

## Propósito

Réplica fiel do workflow manual atual da equipe (Rafael usando ChatGPT Plus).
A IA decide layout, ilustrações e composição com base no copy fornecido pelo
usuário. Template não impõe estrutura de zonas — é "prompt-puro".

## Endpoints

- Sem PNGs de referência → `fal-ai/gpt-image-1/text-to-image`
- Com 1–3 PNGs → `fal-ai/gpt-image-1/edit-image` (PNGs em `image_urls[]`)

## Output

- Nativo do FAL: 1024×1536 (portrait)
- Pós-processamento (Sharp): resize/crop center pra 1080×1350 (4:5 Instagram)

## Carrossel

Cada slide é uma geração independente:
- `contextoGeral` é prefixado ao copy de todos os slides
- `ctaFinal` é anexado ao copy do último slide com instrução "display prominently"
- Sem variação de seed/style entre slides — homogeneidade é responsabilidade
  do prompt comum (gradient + brand identity)

## Iteração futura

Mudanças neste prompt vão atingir todo o T1 em prod. Validar com smoke local
(`pnpm tsx scripts/smoke-m2-imagem-unica.ts`) antes de commit.
