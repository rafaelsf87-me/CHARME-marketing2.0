import type { M1Movel, M1TipoCapa, M1TipoFoto } from './schema'

// ═══════════════════════════════════════════════════════════════
// PIPELINE A — Step 1: Capa Neutra Intermediária (swatch)
// PT: extrai estampa/cor/relevo da foto-referência e gera um
// "swatch" limpo do tecido. Cacheado e reutilizado entre cenários.
// Capa Lisa NÃO usa Step 1 (subfluxo pula direto pro Step 2 com cor HEX).
// ═══════════════════════════════════════════════════════════════

const STEP1_BASE = `
INSTRUCTION:
Extract the textile pattern, color and texture from the reference image.
Generate a clean, flat fabric swatch showing ONLY this pattern/color,
isolated against a neutral light gray background.

SCALE AND DENSITY (CRITICAL):
- Preserve the EXACT scale of pattern units as seen in the reference.
- Preserve the EXACT density and frequency of pattern repetition.
- If the reference shows small, dense, repeating units → the swatch MUST show small, dense, repeating units.
- If the reference shows large, sparse units → the swatch MUST show large, sparse units.
- The number of pattern repetitions per visible area in the swatch must MATCH the reference.
- Each individual pattern unit (motif, shape, geometric element) should occupy the SAME relative area in the swatch as in the reference.

DO NOT:
- DO NOT enlarge pattern elements compared to the reference
- DO NOT reduce pattern density or repetition count
- DO NOT regularize, simplify or stylize the pattern
- DO NOT redesign the pattern with larger/cleaner shapes
- DO NOT crop into a single large motif — show the pattern as a tileable surface

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
// PIPELINE A — Step 2: Aplicar capa no cenário (nano-banana-2)
// REF-1 = template (cenário com móvel cinza).
// Estampada/Alto Relevo: REF-2 = foto do rolo de tecido (escala física fixa).
// Capa Lisa: sem REF-2; cor descrita no prompt.
// ═══════════════════════════════════════════════════════════════

type Step2Params = {
  movel: M1Movel
  tipoCapa: M1TipoCapa
  tipoFoto: M1TipoFoto
  customization?: string
  // Capa Lisa: HEX vai no prompt (sem REF-2).
  corHex?: string
  // Detalhe Tecido: indica se este Step 2 é o close ou o zoom.
  detalheVariant?: 'close' | 'zoom'
}

type FurnitureNames = { single: string; plural: string }

function furnitureNames(movel: M1Movel, tipoFoto: M1TipoFoto): FurnitureNames {
  const single = movel === 'sofa' ? 'sofa' : 'dining chair'
  if (tipoFoto === 'ambiente') {
    return {
      single,
      plural: movel === 'sofa'
        ? 'sofas (one 2-seater and one 3-seater)'
        : 'dining chairs (6 chairs around the table)',
    }
  }
  return { single, plural: single }
}

// Bloco específico por (tipoFoto, tipoCapa). Reforça variações multi-móvel,
// elasticidade, close/zoom do Detalhe Tecido, e realismo para foto-capa.
function buildScenarioBlock(
  tipoCapa: M1TipoCapa,
  tipoFoto: M1TipoFoto,
  detalheVariant?: 'close' | 'zoom'
): string {
  if (tipoFoto === 'ambiente') {
    return `MULTI-FURNITURE COHERENCE:
- The scene contains multiple matching pieces from the same collection.
- Apply the SAME pattern/color/texture on ALL pieces consistently.
- Maintain the SAME pattern scale and orientation across every piece, even at different angles.
- No variation in hue, saturation, pattern density or scale between pieces.`
  }

  if (tipoFoto === 'elastico') {
    return `ELASTICITY DEMONSTRATION:
- REF-1 shows a hand stretching/pulling the cover fabric — preserve this hand pose exactly.
- Render the fabric with visible stretch deformation at the pulled area: radial pattern distortion, tension lines, stress folds.
- The pattern stretches and slightly elongates with the fabric but remains recognizable.`
  }

  if (tipoFoto === 'detalhe-tecido') {
    if (detalheVariant === 'zoom') {
      return `MACRO TEXTURE FOCUS:
- Extreme close-up of the cover fabric texture and stitching.
- Visible weave/knit structure of the polyester elastane jersey.
- Visible cover seam, elastic edge and stitching detail.
- Sharp focus on textile details; soft background.`
    }
    return `HAND PULLING DETAIL:
- Hands lifting/pulling back the cover, partially revealing the original upholstery underneath.
- Preserve the exact hand position and pose from REF-1.
- Cover stitching and elastic seam clearly visible on the underside.
- Sharp focus on the fabric-original transition.`
  }

  // Foto Capa (default): realismo extra por tipo de capa.
  if (tipoCapa === 'alto-relevo') {
    return `REALISM (embossed cover):
- The quilted 3D relief is visible across the cover, with shadows in the stitched grooves.
- The base color is uniform; the design is purely textural.
- Natural fabric drape; the relief follows the furniture geometry over edges and folds.`
  }

  return `REALISM:
- Natural fabric drape on the existing cover shape from REF-1.
- Folds and tucking follow the same wrinkles already visible in REF-1.
- Subtle, barely visible seam lines along the cover edges.
- Match lighting, shadows and color temperature from REF-1 exactly.`
}

// ──────────────── Capa Lisa: prompt com HEX, sem REF-2 ────────────────
function buildStep2PromptLisa(p: Step2Params): string {
  const furniture = furnitureNames(p.movel, p.tipoFoto)
  const corHex = (p.corHex ?? '').toUpperCase()

  const header = `SUBSTITUTE THE FABRIC PATTERN OF THE COVER ON THE ${furniture.plural.toUpperCase()} IN REF-1.`

  const refBlock = `INPUTS:
- REF-1 (first image): base scene with the ${furniture.single} wearing a plain gray cover. This image defines EVERYTHING in the output.

TARGET COVER: a SOLID UNIFORM COLOR ${corHex} polyester elastane stretch jersey knit cover, flat matte finish, no patterns, no variation.`

  const cushionRule = p.tipoFoto === 'detalhe-tecido'
    ? ''
    : `  * Cushion count, position and shape\n`

  const preserveBlock = `OUTPUT REQUIREMENTS:
- The ${furniture.plural}' cover must show the EXACT target color, uniformly applied, with no patterns or variation.
- All other elements must be IDENTICAL to REF-1 — pixel-level fidelity to:
  * Furniture geometry, dimensions and pose
${cushionRule}  * Frame, legs, armrests, backrest
  * Background scene (walls, floor, decoration, lighting, shadows)
  * Camera angle and perspective
  * Color temperature and overall lighting

STRICT PROHIBITIONS:
- DO NOT add cushions, throws, pillows, blankets or any object not present in REF-1
- DO NOT change the number of cushions or seats already in REF-1
- DO NOT modify furniture proportions, geometry or pose
- DO NOT alter the target color (must be exactly ${corHex})
- DO NOT introduce any pattern, gradient or texture variation
- DO NOT change the background scene, decoration or lighting
- DO NOT apply any texture not present in the target (no velvet, no velour, no embroidery, no satin, no gloss)
- DO NOT crop, reframe or change camera angle`

  const scenarioBlock = buildScenarioBlock(p.tipoCapa, p.tipoFoto, p.detalheVariant)
  const customBlock = p.customization
    ? `USER CUSTOMIZATION (apply within the constraints above):\n${p.customization}`
    : ''
  const footer = `OUTPUT: photorealistic, e-commerce catalog quality, sharp focus, natural lighting consistent with REF-1.`

  return [header, refBlock, preserveBlock, scenarioBlock, customBlock, footer]
    .filter(Boolean)
    .join('\n\n')
}

// ──────────── Estampada / Alto Relevo: REF-2 = foto do rolo ────────────
function buildStep2PromptPattern(p: Step2Params): string {
  const furniture = furnitureNames(p.movel, p.tipoFoto)
  const isEmbossed = p.tipoCapa === 'alto-relevo'
  const patternNoun = isEmbossed ? 'quilted/textured 3D fabric pattern' : 'fabric pattern'
  const ref2Noun = isEmbossed
    ? 'quilted/textured 3D fabric pattern'
    : 'pattern'

  const header = `SUBSTITUTE THE FABRIC PATTERN OF THE COVER ON THE ${furniture.plural.toUpperCase()} IN REF-1.`

  const inputsBlock = `INPUTS:
- REF-1 (first image): base scene with the ${furniture.single} wearing a plain gray cover.
  Defines: scene, geometry, lighting, camera, decoration — EVERYTHING except cover pattern.
- REF-2 (second image): flat photo of the fabric roll showing the ${ref2Noun} at its TRUE PHYSICAL SCALE.
  Defines: pattern shapes, exact colors, texture, AND physical size per pattern unit.`

  const scaleBlock = `PHYSICAL SCALE LAW (highest priority):
- Each pattern unit in REF-2 represents a FIXED PHYSICAL SIZE (cm).
- Apply the pattern to REF-1's furniture preserving that physical size, regardless of furniture dimensions.
- If REF-1's furniture is larger than the visible area of REF-2, the output MUST show MORE repetitions of the pattern.
- Think of REF-2 as a piece of physical fabric — if you wrap it around a larger object, you see more repetitions of the same-sized pattern.

DO NOT:
- DO NOT scale or stretch the pattern to fit the furniture.
- DO NOT preserve "visual count" — preserve the physical size of each pattern unit.
- DO NOT crop into a single large motif. Show pattern at the same density seen in REF-2.`

  const cushionLine = p.tipoFoto === 'detalhe-tecido'
    ? ''
    : `- Cushion count, position, shape\n`

  const preserveBlock = `PRESERVE STRICTLY (REF-1):
- Furniture geometry, dimensions, pose
${cushionLine}- Frame, legs, armrests
- Background scene (walls, floor, decoration, lighting, shadows)
- Camera angle and perspective

REPLACE ONLY:
- The visible cover fabric on the furniture
- Apply the EXACT ${patternNoun}, colors and texture from REF-2

STRICT PROHIBITIONS:
- DO NOT add cushions, throws, pillows not present in REF-1
- DO NOT modify furniture proportions or pose
- DO NOT reinterpret or stylize the pattern from REF-2
- DO NOT alter pattern colors

REALISM:
- Natural fabric drape following REF-1's existing wrinkles
- Match lighting and shadows from REF-1`

  const scenarioBlock = buildScenarioBlock(p.tipoCapa, p.tipoFoto, p.detalheVariant)
  const customBlock = p.customization
    ? `USER CUSTOMIZATION (apply within the constraints above):\n${p.customization}`
    : ''
  const footer = `OUTPUT: photorealistic, e-commerce catalog quality, sharp focus.`

  return [header, inputsBlock, scaleBlock, preserveBlock, scenarioBlock, customBlock, footer]
    .filter(Boolean)
    .join('\n\n')
}

export function buildStep2Prompt(p: Step2Params): string {
  if (p.tipoCapa === 'lisa') return buildStep2PromptLisa(p)
  return buildStep2PromptPattern(p)
}
