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
  // Capa Lisa: HEX vai no prompt (sem REF-2/REF-3).
  corHex?: string
  // Detalhe Tecido: indica se este Step 2 é o close ou o zoom.
  detalheVariant?: 'close' | 'zoom'
  // Estampada/Alto Relevo: true quando o usuário forneceu também a foto do rolo.
  temRolo?: boolean
  // Largura física real do móvel do template (cm).
  templateWidthCm?: number
  // Largura física real do móvel da foto-sofá usuário (cm).
  refSofaWidthCm?: number
  // Largura útil entre braços (template e REF-2) — usada pelo bloco
  // HORIZONTAL PATTERN COLUMNS pra calcular o alvo de colunas.
  templateInnerWidthCm?: number
  refSofaInnerWidthCm?: number
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
  // Vestindo a Capa é sempre sofá (validado no schema).
  if (tipoFoto === 'vestindo-capa') {
    return { single: '3-seater sofa', plural: '3-seater sofa' }
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
    const elasticityBlock = `ELASTICITY DEMONSTRATION:
- REF-1 shows a hand stretching/pulling the cover fabric — preserve this hand pose exactly.
- Render the fabric with visible stretch deformation at the pulled area: radial pattern distortion, tension lines, stress folds.
- The pattern stretches and slightly elongates with the fabric but remains recognizable.`

    // Elástico é close-up: o sofá inteiro não aparece, então não há ratio
    // template↔REF-2 pra calcular. Trava escala diretamente em REF-2.
    // Lisa pula porque não tem REF-2 (apenas HEX no prompt).
    if (tipoCapa === 'lisa') return elasticityBlock
    return `${elasticityBlock}

PATTERN SCALE MATCH (CRITICAL):
- Match the pattern scale EXACTLY as seen in REF-2's fabric.
- Pattern unit size in the output must be IDENTICAL to REF-2.
- DO NOT enlarge the pattern units.
- DO NOT shrink the pattern units.
- Pattern density (units per visible area) must MATCH REF-2.`
  }

  if (tipoFoto === 'vestindo-capa') {
    return `DRESSING ACTION (this image type only):
- The output must show a 3-seater sofa, with proper proportions and geometry.
- A HUMAN HAND must be visible on the right side of the frame, mid-action: pulling the slipcover into place over the sofa.
- One small section near the hand shows the cover being adjusted (mid-motion, naturally tucked or held by the fingers).
- The scene should feel candid, slightly amateur — like a real customer photo, NOT a polished studio shoot.
- Camera angle: side / three-quarter dramatic angle (NOT the polished frontal catalog shot).
- Background: simple wall, soft natural light. No decoration. No second furniture.

COVERAGE STATE (CRITICAL):
- The slipcover is PARTIALLY APPLIED — approximately 60-70% of the sofa is covered with the patterned fabric.
- A VISIBLE SECTION of the bare gray sofa underneath MUST remain uncovered (typically the right armrest or one cushion area near the hand).
- The uncovered section must clearly contrast with the patterned area — the original gray upholstery is visible.
- DO NOT cover the entire sofa.
- DO NOT make the bare section disappear under shadow or framing.

SINGLE FURNITURE ONLY (CRITICAL):
- The image shows ONLY ONE piece of furniture being covered with a slipcover.
- DO NOT add any second furniture, sofa, chair, or piece of upholstery below, beside, or behind the main subject.
- The space outside the main furniture must show ONLY floor, rug, wall, or empty space.
- No phantom furniture parts. No partial sofa surfaces. No additional cushions on separate furniture.

STRICT — SOFA GEOMETRY:
- The sofa must be a 3-seater with realistic proportions — armrests, backrest, base, legs.
- DO NOT invent additional furniture pieces.
- DO NOT modify the sofa's size or shape into anything other than a standard 3-seater.`
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
- Sharp focus on the fabric-original transition.

SINGLE FURNITURE ONLY (CRITICAL):
- The image shows ONLY ONE piece of furniture being covered with a slipcover.
- DO NOT add any second furniture, sofa, chair, or piece of upholstery below, beside, or behind the main subject.
- The space outside the main furniture must show ONLY floor, rug, wall, or empty space.
- No phantom furniture parts. No partial sofa surfaces. No additional cushions on separate furniture.`
  }

  // Foto Capa (default): realismo. Alto Relevo nasce como cópia idêntica de
  // Estampada nesta versão (V1 M1, 18/05/2026) — sem bloco embossed separado.
  // Para reintroduzir vocabulário de relevo no futuro, criar bloco próprio.
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

// ──────────── Estampada: REF-2 = sofá-padrão, REF-3 = rolo (opcional) ────────────
// Estampada e Alto Relevo nascem com prompts IDÊNTICOS — funções separadas
// permitem iteração independente sem regressão cruzada. Conteúdo inicial do
// Alto Relevo é cópia exata da Estampada (decisão V1 M1, 18/05/2026).
function buildStep2PromptEstampada(p: Step2Params): string {
  const furniture = furnitureNames(p.movel, p.tipoFoto)
  const patternNoun = 'fabric pattern'
  const temRolo = p.temRolo === true

  const header = `SUBSTITUTE THE FABRIC PATTERN OF THE COVER ON THE ${furniture.plural.toUpperCase()} IN REF-1.`

  const ref3Line = temRolo
    ? `\n- REF-3 (third image): flat photo of the fabric roll showing the ${patternNoun} undistorted.
  Defines: pattern shapes, exact colors, and clean texture.`
    : ''

  const inputsBlock = `INPUTS:
- REF-1 (first image): base scene with the ${furniture.single} wearing a plain gray cover.
  Defines: scene, geometry, lighting, camera, decoration — EVERYTHING except cover fabric.
- REF-2 (second image): photo of the SAME ${patternNoun} applied to a real furniture surface.
  Defines: TRUE PHYSICAL SCALE of the pattern (how big each unit appears on real fabric).${ref3Line}`

  const scaleBlock = `PHYSICAL SCALE LAW (HIGHEST PRIORITY):
- Each pattern unit represents a FIXED PHYSICAL SIZE (cm), seen in REF-2.
- Think of the pattern as tiles of constant size glued onto fabric. Tile size NEVER changes.
- A larger piece of furniture fits MORE tiles. A smaller fits FEWER. Tile size is constant.
- If REF-1's furniture is LARGER than REF-2's furniture, output MUST contain MORE pattern repetitions.
- If REF-1's furniture is SMALLER than REF-2's furniture, output MUST contain FEWER pattern repetitions.

SIZE-AWARENESS RULES (CRITICAL):
- If REF-1 appears WIDER than REF-2 → output MUST show MORE units across the width.
- If REF-1 appears TALLER than REF-2 → output MUST show MORE units across the height.
- DO NOT preserve the visual COUNT of units between REF-2 and output.
- DO NOT scale or stretch the pattern to fit REF-1's furniture.
- DO NOT use REF-2's furniture as a sizing reference — use it ONLY to learn the physical size of one pattern unit.

STRICT PROHIBITIONS FOR REF-2:
- DO NOT copy lighting, shadows, color temperature, or background from REF-2.
- DO NOT copy any furniture geometry, dimensions or pose from REF-2.
- DO NOT bring any scene element from REF-2 into the output.`

  const dimensionsBlock = buildDimensionsBlock(
    p.tipoFoto,
    p.templateWidthCm,
    p.refSofaWidthCm,
    p.templateInnerWidthCm,
    p.refSofaInnerWidthCm
  )

  const sourceBlock = temRolo
    ? `PATTERN SOURCE PRIORITY:
- REF-3 (flat fabric roll) is the CLEAN SOURCE for pattern shapes, exact colors, and texture details.
- REF-2 (applied to furniture) is the SCALE REFERENCE only.
- Combine: shapes/colors/texture from REF-3, physical scale from REF-2.`
    : ''

  const cushionLine = p.tipoFoto === 'detalhe-tecido'
    ? ''
    : `- Cushion count, position, shape\n`

  const preserveBlock = `PRESERVE STRICTLY (from REF-1):
- Furniture geometry, dimensions, pose
${cushionLine}- Frame, legs, armrests
- Background scene (walls, floor, decoration, lighting, shadows)
- Camera angle and perspective

REPLACE ONLY:
- The visible cover fabric on the furniture

ZERO DECORATIVE PILLOWS (CRITICAL):
- The output MUST NOT contain any decorative pillows, throw pillows, accent cushions, blankets or throws placed on top of the cover.
- The cover is ONE continuous piece of fabric draped over the furniture frame and its built-in cushions.
- Render the cover as a single continuous patterned surface. NO separate pillow objects on top.
- DO NOT add accessories, blankets, throws or any decorative items on the furniture.

STRICT PROHIBITIONS:
- DO NOT add cushions, throws, pillows not present in REF-1
- DO NOT modify furniture proportions or pose
- DO NOT reinterpret or stylize the pattern
- DO NOT alter pattern colors

REALISM:
- Natural fabric drape following REF-1's existing wrinkles
- Match lighting and shadows from REF-1
- Subtle fabric tucking and natural cover folds`

  const scenarioBlock = buildScenarioBlock(p.tipoCapa, p.tipoFoto, p.detalheVariant)
  const customBlock = p.customization
    ? `USER CUSTOMIZATION (apply within the constraints above):\n${p.customization}`
    : ''
  const footer = `OUTPUT: photorealistic, e-commerce catalog quality, sharp focus.`

  return [header, inputsBlock, scaleBlock, dimensionsBlock, sourceBlock, preserveBlock, scenarioBlock, customBlock, footer]
    .filter(Boolean)
    .join('\n\n')
}

// ──────────── Alto Relevo: cópia idêntica do Estampada (V1 M1, 18/05/2026) ────────────
// Função separada para permitir iteração independente do prompt no futuro
// (ex: reintroduzir vocabulário "quilted/embossed" sem afetar Estampada).
// Mantém output BIT-A-BIT igual ao Estampada nesta versão.
function buildStep2PromptAltoRelevo(p: Step2Params): string {
  const furniture = furnitureNames(p.movel, p.tipoFoto)
  const patternNoun = 'fabric pattern'
  const temRolo = p.temRolo === true

  const header = `SUBSTITUTE THE FABRIC PATTERN OF THE COVER ON THE ${furniture.plural.toUpperCase()} IN REF-1.`

  const ref3Line = temRolo
    ? `\n- REF-3 (third image): flat photo of the fabric roll showing the ${patternNoun} undistorted.
  Defines: pattern shapes, exact colors, and clean texture.`
    : ''

  const inputsBlock = `INPUTS:
- REF-1 (first image): base scene with the ${furniture.single} wearing a plain gray cover.
  Defines: scene, geometry, lighting, camera, decoration — EVERYTHING except cover fabric.
- REF-2 (second image): photo of the SAME ${patternNoun} applied to a real furniture surface.
  Defines: TRUE PHYSICAL SCALE of the pattern (how big each unit appears on real fabric).${ref3Line}`

  const scaleBlock = `PHYSICAL SCALE LAW (HIGHEST PRIORITY):
- Each pattern unit represents a FIXED PHYSICAL SIZE (cm), seen in REF-2.
- Think of the pattern as tiles of constant size glued onto fabric. Tile size NEVER changes.
- A larger piece of furniture fits MORE tiles. A smaller fits FEWER. Tile size is constant.
- If REF-1's furniture is LARGER than REF-2's furniture, output MUST contain MORE pattern repetitions.
- If REF-1's furniture is SMALLER than REF-2's furniture, output MUST contain FEWER pattern repetitions.

SIZE-AWARENESS RULES (CRITICAL):
- If REF-1 appears WIDER than REF-2 → output MUST show MORE units across the width.
- If REF-1 appears TALLER than REF-2 → output MUST show MORE units across the height.
- DO NOT preserve the visual COUNT of units between REF-2 and output.
- DO NOT scale or stretch the pattern to fit REF-1's furniture.
- DO NOT use REF-2's furniture as a sizing reference — use it ONLY to learn the physical size of one pattern unit.

STRICT PROHIBITIONS FOR REF-2:
- DO NOT copy lighting, shadows, color temperature, or background from REF-2.
- DO NOT copy any furniture geometry, dimensions or pose from REF-2.
- DO NOT bring any scene element from REF-2 into the output.`

  const dimensionsBlock = buildDimensionsBlock(
    p.tipoFoto,
    p.templateWidthCm,
    p.refSofaWidthCm,
    p.templateInnerWidthCm,
    p.refSofaInnerWidthCm
  )

  const sourceBlock = temRolo
    ? `PATTERN SOURCE PRIORITY:
- REF-3 (flat fabric roll) is the CLEAN SOURCE for pattern shapes, exact colors, and texture details.
- REF-2 (applied to furniture) is the SCALE REFERENCE only.
- Combine: shapes/colors/texture from REF-3, physical scale from REF-2.`
    : ''

  const cushionLine = p.tipoFoto === 'detalhe-tecido'
    ? ''
    : `- Cushion count, position, shape\n`

  const preserveBlock = `PRESERVE STRICTLY (from REF-1):
- Furniture geometry, dimensions, pose
${cushionLine}- Frame, legs, armrests
- Background scene (walls, floor, decoration, lighting, shadows)
- Camera angle and perspective

REPLACE ONLY:
- The visible cover fabric on the furniture

ZERO DECORATIVE PILLOWS (CRITICAL):
- The output MUST NOT contain any decorative pillows, throw pillows, accent cushions, blankets or throws placed on top of the cover.
- The cover is ONE continuous piece of fabric draped over the furniture frame and its built-in cushions.
- Render the cover as a single continuous patterned surface. NO separate pillow objects on top.
- DO NOT add accessories, blankets, throws or any decorative items on the furniture.

STRICT PROHIBITIONS:
- DO NOT add cushions, throws, pillows not present in REF-1
- DO NOT modify furniture proportions or pose
- DO NOT reinterpret or stylize the pattern
- DO NOT alter pattern colors

REALISM:
- Natural fabric drape following REF-1's existing wrinkles
- Match lighting and shadows from REF-1
- Subtle fabric tucking and natural cover folds`

  const scenarioBlock = buildScenarioBlock(p.tipoCapa, p.tipoFoto, p.detalheVariant)
  const customBlock = p.customization
    ? `USER CUSTOMIZATION (apply within the constraints above):\n${p.customization}`
    : ''
  const footer = `OUTPUT: photorealistic, e-commerce catalog quality, sharp focus.`

  return [header, inputsBlock, scaleBlock, dimensionsBlock, sourceBlock, preserveBlock, scenarioBlock, customBlock, footer]
    .filter(Boolean)
    .join('\n\n')
}

// Baseline assumido para REF-2 (foto-sofá usuário): ~6 colunas horizontais
// de tiles do padrão visíveis entre os braços. Métrica mais preditiva que
// "tile count total" porque o modelo conta colunas com mais consistência.
const REF_SOFA_BASELINE_COLUMNS = 6

// Bloco de dimensões + alvo de colunas horizontais.
// - Foto Capa: PHYSICAL DIMENSIONS + HORIZONTAL PATTERN COLUMNS (alvo numérico).
// - Foto Ambiente: PHYSICAL DIMENSIONS apenas (colunas não-aplicáveis com
//   múltiplos móveis distantes na cena).
// - Foto Elástico / Detalhe Tecido: bloco inteiro omitido (close-ups onde o
//   sofá inteiro não é visível; escala vem só de REF-2).
function buildDimensionsBlock(
  tipoFoto: M1TipoFoto,
  templateWidthCm?: number,
  refSofaWidthCm?: number,
  templateInnerWidthCm?: number,
  refSofaInnerWidthCm?: number
): string {
  if (tipoFoto === 'elastico' || tipoFoto === 'detalhe-tecido') return ''
  if (!templateWidthCm || !refSofaWidthCm) return ''
  const ratio = templateWidthCm / refSofaWidthCm
  const ratioStr = ratio.toFixed(2)

  const hasInner = Boolean(templateInnerWidthCm && refSofaInnerWidthCm)
  const innerRatio = hasInner
    ? (templateInnerWidthCm as number) / (refSofaInnerWidthCm as number)
    : 0
  const innerRatioStr = innerRatio.toFixed(2)
  // Alvo de colunas: ratio × baseline, clamped em [6, 7]. Pressão maior que
  // 7 leva o modelo a comprimir ou fragmentar o padrão — preferir extensão
  // lateral mantendo tile-size constante.
  const rawColumns = Math.round(REF_SOFA_BASELINE_COLUMNS * (innerRatio || ratio))
  const targetColumns = Math.max(6, Math.min(7, rawColumns))

  // HORIZONTAL PATTERN COLUMNS só faz sentido em Foto Capa e Vestindo a Capa
  // (1 sofá completo visível em ambos). Em Ambiente, múltiplos móveis
  // distantes tornam a contagem ambígua — mantemos só o ratio de dimensões.
  const columnsBlock = hasInner && (tipoFoto === 'capa' || tipoFoto === 'vestindo-capa')
    ? `

HORIZONTAL PATTERN COLUMNS (CRITICAL):
- REF-2's seat+back area shows approximately ${REF_SOFA_BASELINE_COLUMNS} horizontal pattern columns between the arms.
- REF-1's seat+back area is approximately ${innerRatioStr}× wider than REF-2's.
- Output should show approximately ${targetColumns} horizontal pattern columns between the arms.
- EXTEND the pattern naturally laterally — as if the fabric continues to fill the wider seat area.
- Keep tile size CONSTANT — the pattern just continues into the additional width.
- DO NOT compress, distort, or fragment the pattern grid.
- DO NOT make tiles smaller. Tiles should remain the SAME visual size as REF-2.
- The armrests are identical width between REF-2 and REF-1 — no pattern changes there.`
    : ''

  return `PHYSICAL DIMENSIONS (CRITICAL):
- REF-2's furniture is approximately ${refSofaWidthCm}cm wide.
- REF-1's furniture is approximately ${templateWidthCm}cm wide.
- Width ratio: REF-1 is ${ratioStr}× wider than REF-2.${columnsBlock}`
}

export function buildStep2Prompt(p: Step2Params): string {
  if (p.tipoCapa === 'lisa') return buildStep2PromptLisa(p)
  if (p.tipoCapa === 'alto-relevo') return buildStep2PromptAltoRelevo(p)
  return buildStep2PromptEstampada(p)
}
