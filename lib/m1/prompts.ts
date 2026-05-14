import type { M1Movel, M1TipoCapa } from './schema'

// ═══════════════════════════════════════════════════════════════
// PIPELINE A — Step 1: Capa Neutra Intermediária
// PT: extrai a estampa/cor/relevo da foto-referência e gera um
// "swatch" limpo do tecido com aquela estampa. Esse swatch fica
// cacheado e é reutilizado nos vários cenários (DEC-005).
// TODO(treinamento): refinar após primeiros testes com Rafael.
// ═══════════════════════════════════════════════════════════════

const STEP1_BASE = `
INSTRUCTION:
Extract the textile pattern, color and texture from the reference image.
Generate a clean, flat fabric swatch showing ONLY this pattern/color,
isolated against a neutral light gray background.

OUTPUT REQUIREMENTS:
- Flat fabric swatch, no furniture, no environment
- Centered composition, swatch fills 80% of the frame
- Even, soft studio lighting from above
- Neutral light gray background (#E5E5E5)
- The swatch must show the fabric texture clearly

FABRIC SPECIFICATION:
The fabric is polyester elastane stretch jersey knit — flat matte finish.
Render with visible fabric weave texture.
`

const STEP1_PROMPTS: Record<M1TipoCapa, string> = {
  estampada: `${STEP1_BASE}

PATTERN INSTRUCTIONS:
- Reproduce the printed pattern from the reference EXACTLY
- Preserve all colors, pattern scale, density and details
- The pattern is printed flat on the fabric surface (2D print, not embossed)
- For complex patterns (boho, geometric, intricate motifs), preserve every detail

AVOID:
- Color shift or saturation change
- Pattern simplification or stylization
- Velvet, velour, plush, satin or glossy appearance
- 3D effects or embossing (this is a printed pattern, flat)
`,

  lisa: `${STEP1_BASE}

COLOR INSTRUCTIONS:
- Reproduce the EXACT solid color from the reference
- Uniform color across the entire swatch
- Match hue, saturation and brightness precisely

AVOID:
- Color shift or saturation change
- ANY printed pattern or texture variation
- Velvet, velour, plush, satin or glossy appearance
- Sheen, gloss or reflective fabric look
- Any fabric type other than matte jersey knit
`,

  'alto-relevo': `${STEP1_BASE}

EMBOSSED PATTERN INSTRUCTIONS:
- The fabric has an EMBOSSED/QUILTED pattern (3D relief stitched into the fabric)
- The base fabric has a SOLID uniform color
- The pattern is created by quilted stitching that creates raised relief
- Reproduce the EXACT relief pattern from the reference (medallions, florals, mandalas, etc.)
- Preserve the depth and dimensionality of the embossing
- The relief MUST be visible — show shadows in the stitched grooves

AVOID:
- Printed pattern (this is embossed, not printed)
- Flat appearance (must show 3D depth)
- Color variation in the pattern (color is uniform; the design is purely textural)
- Velvet, velour, plush or satin
`,
}

export function buildStep1Prompt(tipoCapa: M1TipoCapa): string {
  return STEP1_PROMPTS[tipoCapa]
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE A — Step 2: Aplicar Capa Neutra no Cenário
// PT: aplica o swatch (do Step 1) no móvel da foto-template,
// preservando 100% do ambiente, ângulo e iluminação. Usa mask
// pré-gerada para garantir que só o móvel é alterado.
// ═══════════════════════════════════════════════════════════════

type Step2Params = {
  movel: M1Movel
  tipoCapa: M1TipoCapa
  tipoFoto: 'capa' | 'ambiente'
  customization?: string
}

export function buildStep2Prompt(p: Step2Params): string {
  const object = p.movel === 'sofa' ? 'sofa' : 'dining chair'
  const objectPlural =
    p.movel === 'sofa'
      ? p.tipoFoto === 'ambiente'
        ? 'sofas (one 2-seater + one 3-seater)'
        : 'sofa'
      : p.tipoFoto === 'ambiente'
      ? 'dining chairs (6 chairs around the table)'
      : 'dining chair'

  const baseBlock = `
# === FOTO ${p.tipoFoto.toUpperCase()} · ${p.movel.toUpperCase()} · ${p.tipoCapa.toUpperCase()} ===
# PT: aplica capa no ${p.movel} mantendo cenário 100% intacto

INSTRUCTION:
Apply the fabric pattern/color from the reference swatch (provided as
secondary reference) to the cover of the ${objectPlural} in the scene.
Preserve every other element of the original scene completely unchanged.

PRESERVE STRICTLY (do not alter):
- Environment: walls, floor, decoration, surrounding furniture, plants
- Camera angle and perspective
- Lighting, shadows and color temperature
- Geometry, shape and pose of the ${object}
- All objects, plants and accessories in the scene

REPLACE ONLY:
- The visible cover fabric on the ${objectPlural}
- Match the reference swatch EXACTLY — same colors, same pattern, no variation
`

  const fabricBlock =
    p.tipoCapa === 'alto-relevo'
      ? `
FABRIC SPECIFICATION (mandatory):
The cover is a polyester elastane stretch fabric with EMBOSSED/QUILTED texture.
The pattern is created by quilted stitching that creates raised 3D relief
(NOT printed). Render with:
- Visible depth and shadows in the quilted stitching
- Uniform base color matching the reference
- The relief pattern is preserved even where the fabric stretches over edges
- Subtle, barely visible cover seam lines along the edges
- Fabric tucking naturally into gaps between cushions, armrests and base
- Natural draping that follows the ${object} shape

AVOID AT ALL COSTS:
- Flat envelope-like surface
- Painted-on appearance
- Printed pattern (this is embossed, not printed)
- Color variation in the relief pattern
- Velvet, velour, plush or satin appearance
- Any change to the environment, lighting or camera angle
`
      : `
FABRIC SPECIFICATION (mandatory realism):
The cover is a polyester elastane stretch jersey knit fabric — flat matte finish.
Render with:
- Subtle, barely visible seam lines along the cover edges (almost imperceptible)
- Fabric tucking naturally into gaps between cushions, armrests and base
- Small wrinkles and folds where the cover meets the furniture geometry
- Visible fabric texture — never a flat or painted appearance
- Natural draping that follows the underlying furniture shape

AVOID AT ALL COSTS:
- Flat envelope-like surface
- Painted-on appearance
- Cartoon or 3D-render aesthetic
- Color or pattern variation from the reference
- Any change to the environment, lighting or camera angle
- Velvet, velour, plush or satin appearance
- Sheen, gloss or reflective fabric look
- Any fabric type other than matte jersey knit
`

  // DEC-004: bloco de coerência ativo só em Foto Ambiente
  const ambienteBlock =
    p.tipoFoto === 'ambiente'
      ? `
MULTI-FURNITURE COHERENCE (critical):
- Scene contains multiple matching pieces
- Apply the SAME pattern/color/relief CONSISTENTLY on ALL pieces
- Maintain coherent pattern SCALE across all pieces, even at different angles
- All pieces must look like matching items from the same collection
- The pattern/color must be EXACTLY the same on every piece — no variation
  in hue, saturation, pattern density or scale
`
      : ''

  const customBlock = p.customization
    ? `
USER CUSTOMIZATION (apply within constraints):
${p.customization}
`
    : ''

  return `${baseBlock}${fabricBlock}${ambienteBlock}${customBlock}

OUTPUT: photorealistic, magazine-quality product photo, sharp focus,
natural lighting consistent with the original scene.`
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE B — Foto Elástico (cleanup)
// PT: transforma foto bruta de celular (mão esticando a capa) em
// foto profissional. Mantém a ação real, melhora iluminação/fundo/foco.
// ═══════════════════════════════════════════════════════════════

export function buildElasticoPrompt(movel: M1Movel, customization?: string): string {
  const object = movel === 'sofa' ? 'sofa' : 'dining chair'

  return `
# === FOTO ELÁSTICO · ${movel.toUpperCase()} ===
# PT: limpa a foto bruta de celular esticando a capa

INSTRUCTION:
Transform this raw smartphone photo of a hand stretching the cover fabric
on a ${object} into a professional product photograph.

PRESERVE (do not alter):
- The exact moment of the hand stretching the fabric
- The fabric pattern, color and texture
- The visible elasticity demonstration
- The fabric's relationship to the ${object} underneath
- Hand position and gesture (clean up imperfections subtly)

ENHANCE:
- Improve lighting: balanced, soft, natural-looking studio quality
- Blur or simplify the background (keep neutral, non-distracting)
- Improve sharpness on the fabric texture and stretching action
- Ensure colors are accurate, not oversaturated
- Crop intelligently to focus on the stretching action

AESTHETIC:
- Natural lighting feel, not heavy color grading
- Professional product photography style
- Magazine quality but understated
- E-commerce premium aesthetic

AVOID:
- Heavy filters or oversaturation
- Artificial / plastic appearance
- Changing the fabric texture or pattern
- Adding elements that weren't in the original photo
- Removing the hand or changing the gesture
- Background that competes with the fabric
${customization ? `\nUSER CUSTOMIZATION:\n${customization}` : ''}

OUTPUT: photorealistic, professional close-up photograph showcasing
fabric elasticity, 1080×1080.`
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE B — Foto Detalhe do Tecido (cleanup)
// PT: limpa foto bruta mostrando costuras + verso da capa +
// assento original. Comunica qualidade + facilidade de vestir.
// ═══════════════════════════════════════════════════════════════

export function buildDetalheTecidoPrompt(movel: M1Movel, customization?: string): string {
  const object = movel === 'sofa' ? 'sofa' : 'dining chair'

  return `
# === FOTO DETALHE DO TECIDO · ${movel.toUpperCase()} ===
# PT: limpa foto bruta mostrando costuras, verso da capa, assento
# original. Comunica qualidade + facilidade de vestir (antes/depois).

INSTRUCTION:
Transform this raw smartphone photo of hands lifting/pulling back the
cover on a ${object} into a professional detail photograph.

PRESERVE (do not alter):
- The exact gesture of hands lifting the cover
- The visible cover stitching and elastic seam on the underside
- The original ${object} upholstery underneath (this contrast is essential
  to communicate "before/after" — the original seat vs the new cover)
- The fabric pattern, color and texture
- The way the cover stretches and fits

ENHANCE:
- Improve lighting: soft, natural, even illumination
- Blur or simplify the background (remove visual distractions)
- Improve sharpness on stitching details and fabric texture
- Make the seams and elastic edge clearly visible (this is the focus)
- Crop intelligently to frame the gesture and the contrast between
  cover and original upholstery

AESTHETIC:
- Natural lighting, not heavy color grading
- Professional close-up product photography
- Communicates "quality cover" + "easy to install"
- E-commerce premium aesthetic, but natural-looking

AVOID:
- Heavy filters, oversaturation or color shifts
- Artificial / plastic appearance
- Hiding the original ${object} upholstery (it must remain visible)
- Removing or repositioning the hands
- Changing the fabric or stitching details
- Background that competes with the detail focus
${customization ? `\nUSER CUSTOMIZATION:\n${customization}` : ''}

OUTPUT: photorealistic, professional close-up showing fabric quality,
stitching detail and before/after contrast, 1080×1080.`
}
