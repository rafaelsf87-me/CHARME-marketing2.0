import type { BuildPromptArgs } from '../types'

// T1 prompt v5 — pós-smoke carrossel (3 reforços de fechamento).
// Decisão Rafael: T1 é "rascunho rápido pra brainstorm interno" — réplica
// imperfeita do ChatGPT Plus. Limitações inerentes do gpt-image-1 em
// carrossel paralelo (continuidade, fundo, handles inventados, hierarquia)
// estão registradas em [LIMIT-M2-001] e serão resolvidas pelo T2 (Pipeline
// Híbrido Sharp/Satori, Fase 3).
//
// Reforços v5:
//   - BACKGROUND ENFORCEMENT: força gradient cyan→roxo em 100% do canvas.
//   - NO BRAND ELEMENTS: bloqueia IA de inventar "@charmedodetalhe", etc.
//   - TYPOGRAPHIC HIERARCHY STRICT: title ≤25% canvas, body 35-45% do title.
// Blocos mantidos do v4:
//   - STYLE REFERENCE + VISUAL STYLE AVOID: força 3D/foto cutout.
//   - TEXT FIDELITY: bloco crítico contra erros de português.
//   - DENSITY GUIDANCE: prefere whitespace a fonts pequenas.
const BASE_PROMPT = `Create an image for a social media content post for the CharmedoDetalhe store following the guidelines below.

DIMENSIONS:
- Size: 1080x1350 pixels (4:5 ratio, Instagram portrait format)

BRAND VISUAL IDENTITY (MANDATORY - NEVER CHANGE):
- Background: Smooth gradient from bright cyan/turquoise (#00E5E5) top-left to deep purple (#5B1E7D) bottom-right
- Title font: Montserrat Bold (or similar geometric sans-serif bold)
- Title color: Bright cyan (#00FFFF)
- Body text color: White (#FFFFFF)
- Accent elements: Cyan (#00FFFF) for arrows, icons, highlights
- Style: Modern, clean, vibrant gradient background

BACKGROUND ENFORCEMENT (CRITICAL):
- The cyan→purple gradient background MUST cover the ENTIRE canvas on EVERY generated image.
- NEVER use solid black, solid white, or any other background color/style.
- NEVER replace the gradient with dark/black areas for emphasis or visual contrast.
- Gradient flow: bright cyan (#00E5E5) top-left → deep purple (#5B1E7D) bottom-right, smooth blend, no hard edges.

NO BRAND ELEMENTS (CRITICAL):
- NEVER render any brand name, store name, social media handle, watermark, "@" symbol, or company signature anywhere in the composition.
- Do NOT add "CharmedoDetalhe", "Charme do Detalhe", "@charmedodetalhe", or any variation as text inside the image.
- The brand identity is conveyed through the visual style (gradient, colors, typography), NOT through written brand text.
- A composition containing any brand/handle text is INCORRECT output.

LAYOUT INTELLIGENCE:
- Automatically structure the design based on the copy provided
- Include relevant illustrations, product images, or icons that match the content theme
- Balance text and visual elements for optimal readability and engagement
- Use cyan arrows or connecting elements to guide the eye
- Maintain visual hierarchy: title → illustration/image → details → CTA (for engagement)

STYLE REFERENCE (VISUAL DIRECTION — CRITICAL FOR PROFESSIONAL OUTPUT):
- This is NOT flat vector illustration or cartoon style.
- Use realistic 3D-rendered or photo-realistic cutout objects on the gradient background.
- Objects (products, items, people, animals, food) should appear as if photographed or 3D-rendered with proper lighting, shadows, and depth — NEVER as flat 2D drawings.
- Title text should have subtle metallic shine, gloss, or glow effect (cyan reflective highlights).
- Add subtle sparkle or star accents (cyan, small) around the title or key visual elements for vibrancy.
- Bullet/list items can be rendered as small white rounded rectangles or pill shapes with dark text inside, connected by thin cyan arrows or lines.
- The overall feel should match a vibrant, modern educational infographic — like a high-engagement Instagram post — not a corporate slide or kids' book illustration.

VISUAL STYLE AVOID:
- Flat vector cartoon illustrations of people, objects, or scenes
- Simplified 2D drawings (e.g., a sofa drawn with flat blue rectangles)
- Generic minimalist clipart or icon-set aesthetic
- Plain solid colored rectangles as text backgrounds (use the gradient instead)
- Monochromatic palettes (must use full cyan→purple gradient + cyan accents)
- Childish or "infantil" style

TEXT FIDELITY (CRITICAL — STRICTEST RULE OF THIS PROMPT):
- The text content section below is IMMUTABLE. Render every word, character, accent, and punctuation mark EXACTLY as provided.
- Do NOT add, remove, paraphrase, rephrase, translate, or invent any text.
- Do NOT fabricate filler text to fill empty space. If the copy is short, use whitespace.
- Do NOT drop or substitute letters within words. "Veste o sofá" must remain "Veste o sofá", never "Veste 9 sofá" or similar substitution.
- Do NOT replace diacritics: á must be á (acute accent), not ă (breve) / ä (umlaut) / ã (tilde) / a (no accent). Same rule applies to é, í, ó, ú, ê, ô, ã, õ, â, ç.
- A Portuguese word missing its expected accent is INCORRECT output.
- Ignore formatting markers like "Title:", "Subtitle:", "CTA:" — those are structural hints, not literal content to display.

TYPOGRAPHIC HIERARCHY (STRICT):
- Title (main headline): bold, cyan (#00FFFF), occupies at MOST 25% of the canvas height.
- Title should be readable and prominent but NOT visually dominate or fill 1/3+ of the canvas.
- Body text (descriptions, bullets, secondary content): white, MUST be visibly smaller than the title (approximately 35-45% of title font size).
- Body text must NEVER approach the title's size. Uniform giant text throughout is INCORRECT.
- Preserve clear visual hierarchy: title > body > details.

DENSITY GUIDANCE:
- Avoid overcrowding text. If copy is dense, prefer larger whitespace over shrinking fonts to fit.
- For Instagram readability, keep total visible characters per image moderate.`

const REQUIREMENTS = `REQUIREMENTS:
- Portuguese text only, no English
- Preserve all accents (á, ã, â, é, ê, í, ó, ô, ú, ç)
- Montserrat Bold for headlines
- Cyan color for main titles
- White for body text and subtitles
- Cyan arrows/decorative elements if needed
- Smart layout with illustrations matching the content topic
- Clean modern aesthetic matching brand style
- Maintain 4:5 portrait ratio (1080x1350)`

export function buildT1Prompt(args: BuildPromptArgs): string {
  const {
    copyTexto,
    instrucoesExtras,
    instrucoesUsoImagens,
    contextoGeral,
    isUltimoSlide,
    ctaFinal,
  } = args

  // Carrossel: prefixa contexto + (no último slide) anexa CTA com instrução
  // explícita pra IA exibir em destaque.
  let textContent = copyTexto
  if (contextoGeral) {
    textContent = `Context: ${contextoGeral}\n\n${textContent}`
  }
  if (isUltimoSlide && ctaFinal) {
    textContent = `${textContent}\n\nCTA (call to action — display prominently): ${ctaFinal}`
  }

  // Combina instruções extras (modo IA) + uso de imagens (modo upload).
  // No upload o usuário referencia PNGs por nome de arquivo — texto vai bruto
  // pro modelo decidir como aplicar.
  const instrucoesCombined = [
    instrucoesExtras,
    instrucoesUsoImagens ? `Image usage guidance: ${instrucoesUsoImagens}` : null,
  ]
    .filter(Boolean)
    .join('\n- ')

  const instructionsBlock = instrucoesCombined
    ? `\n\nADDITIONAL INSTRUCTIONS:\n- ${instrucoesCombined}\n`
    : ''

  return `${BASE_PROMPT}${instructionsBlock}\n\nTEXT CONTENT (PORTUGUESE-BR — IMMUTABLE, RENDER VERBATIM):\n${textContent}\n\n${REQUIREMENTS}`
}
