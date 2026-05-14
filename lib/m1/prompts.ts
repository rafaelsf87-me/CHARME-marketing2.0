import type { M1Movel, M1TipoCapa, M1TipoFoto } from './schema'

// ═══════════════════════════════════════════════════════════════
// PIPELINE A — Step 1: Capa Neutra Intermediária (swatch)
// PT: extrai estampa/cor/relevo da foto-referência e gera um
// "swatch" limpo do tecido. Cacheado e reutilizado entre cenários.
// Capa Lisa NÃO usa Step 1 (subfluxo pula direto pro Step 2 com cor HEX).
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

const STEP1_PROMPTS: Record<Exclude<M1TipoCapa, 'lisa'>, string> = {
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

export function buildStep1Prompt(tipoCapa: Exclude<M1TipoCapa, 'lisa'>): string {
  return STEP1_PROMPTS[tipoCapa]
}

// ═══════════════════════════════════════════════════════════════
// PIPELINE A — Step 2: Aplicar capa no cenário (inpainting)
// PT: aplica o swatch (Step 1) ou a cor HEX (Capa Lisa) no móvel
// da foto-template, preservando 100% do ambiente, ângulo e iluminação.
// ═══════════════════════════════════════════════════════════════

type Step2Params = {
  movel: M1Movel
  tipoCapa: M1TipoCapa
  tipoFoto: M1TipoFoto
  customization?: string
  // Capa Lisa: HEX vai no prompt (Step 2 sem reference image).
  corHex?: string
  // Detalhe Tecido: indica se este Step 2 é o close (mão puxando) ou
  // o zoom (macro da textura/costura). Refina o prompt sem mudar o swatch.
  detalheVariant?: 'close' | 'zoom'
}

function describeObject(movel: M1Movel, tipoFoto: M1TipoFoto): { single: string; plural: string } {
  const single = movel === 'sofa' ? 'sofa' : 'dining chair'
  if (tipoFoto === 'ambiente') {
    return {
      single,
      plural: movel === 'sofa'
        ? 'sofas (one 2-seater + one 3-seater)'
        : 'dining chairs (6 chairs around the table)',
    }
  }
  return { single, plural: single }
}

export function buildStep2Prompt(p: Step2Params): string {
  const { single: object, plural: objectPlural } = describeObject(p.movel, p.tipoFoto)

  const headerCapa = p.tipoCapa === 'lisa' && p.corHex
    ? `# Lisa — solid color ${p.corHex.toUpperCase()}`
    : `# ${p.tipoCapa}`

  // Capa Lisa: descreve cor no prompt (sem reference image).
  // Estampada/Alto-relevo: usa o swatch fornecido como secondary reference.
  const sourceBlock = p.tipoCapa === 'lisa' && p.corHex
    ? `
INSTRUCTION:
Apply a SOLID UNIFORM COLOR ${p.corHex.toUpperCase()} stretch jersey cover to
the visible cover area of the ${objectPlural} in the scene. The cover is
polyester elastane jersey knit with a flat matte finish, no pattern.
Preserve every other element of the original scene completely unchanged.
`
    : `
INSTRUCTION:
Apply the fabric pattern/color from the reference swatch (provided as
secondary reference) to the cover of the ${objectPlural} in the scene.
Preserve every other element of the original scene completely unchanged.
`

  const preserveBlock = `
PRESERVE STRICTLY (do not alter):
- Environment: walls, floor, decoration, surrounding furniture, plants
- Camera angle and perspective
- Lighting, shadows and color temperature
- Geometry, shape and pose of the ${object}
- All objects, plants and accessories in the scene

REPLACE ONLY:
- The visible cover fabric on the ${objectPlural}
${p.tipoCapa === 'lisa'
  ? `- Render uniformly in ${p.corHex?.toUpperCase()}, no pattern, no variation`
  : '- Match the reference swatch EXACTLY — same colors, same pattern, no variation'}
`

  const fabricBlock = p.tipoCapa === 'alto-relevo'
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

  // DEC-004: coerência multi-móveis ativa só em Foto Ambiente.
  const ambienteBlock = p.tipoFoto === 'ambiente'
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

  // Elástico: foco em demonstrar elasticidade (template já tem mão puxando).
  const elasticoBlock = p.tipoFoto === 'elastico'
    ? `
ELASTICITY DEMONSTRATION (critical for this scene):
- The template shows a hand stretching/pulling the cover fabric
- Render the fabric with visible STRETCH DEFORMATION at the pulled area:
  · Radial pattern distortion in the direction of the pull
  · Fabric tension lines and stress folds
  · Pattern stretches and slightly elongates with the fabric
- Keep fabric texture clear and matte (NO painted look, NO posterization)
- Show that the fabric is elastic, recovering from the deformation
`
    : ''

  // Detalhe Tecido: close vs zoom recebe orientação diferente.
  const detalheBlock = p.tipoFoto === 'detalhe-tecido'
    ? (p.detalheVariant === 'zoom'
      ? `
MACRO TEXTURE FOCUS (zoom half):
- Extreme close-up of the cover fabric texture and stitching
- Visible weave/knit of the polyester elastane jersey
- Visible cover seam, elastic edge and stitching detail
- Fabric tension and elasticity clearly readable
- Sharp focus on textile details, soft background
`
      : `
HAND PULLING DETAIL (close half):
- Hands lifting/pulling back the cover, partially revealing the original
  upholstery underneath — this contrast communicates "before/after"
- Cover stitching and elastic seam clearly visible on the underside
- Hand position natural, gesture readable
- Sharp focus on the fabric-original transition
`)
    : ''

  const customBlock = p.customization
    ? `
USER CUSTOMIZATION (apply within constraints):
${p.customization}
`
    : ''

  return `${headerCapa} · ${p.tipoFoto} · ${p.movel}
${sourceBlock}${preserveBlock}${fabricBlock}${ambienteBlock}${elasticoBlock}${detalheBlock}${customBlock}

OUTPUT: photorealistic, magazine-quality product photo, sharp focus,
natural lighting consistent with the original scene.`
}
