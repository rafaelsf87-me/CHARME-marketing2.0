import { callGptImage1Title } from './fal-client'
import { getActiveTemplate } from './templates'
import { getTituloCached, setTituloCache, normalizeTituloKey } from './titulo-cache'

export interface GenerateTituloResult {
  png: Buffer
  cacheHit: boolean
  // Texto exato usado no prompt (após normalize). Útil pra log/debug.
  textoNormalizado: string
}

export interface GenerateTituloArgs {
  texto: string
  // Default: 'atual-maio26' (único ativo no V1). Pode ser sobrescrito quando
  // T2/T3 forem implementados.
  templateId?: string
}

// Orquestrador do pipeline do título 3D balão. Normaliza texto, checa cache,
// chama gpt-image-1 se miss, cacheia, retorna Buffer.
export async function generateTitulo(args: GenerateTituloArgs): Promise<GenerateTituloResult> {
  const { texto, templateId = 'atual-maio26' } = args
  const textoNormalizado = normalizeTituloKey(texto)

  const cached = getTituloCached(textoNormalizado)
  if (cached) {
    return { png: cached, cacheHit: true, textoNormalizado }
  }

  const tpl = getActiveTemplate(templateId)
  if (!tpl.buildTituloPrompt || !tpl.falConfig) {
    throw new Error(`[M3] Template ${templateId} não tem buildTituloPrompt/falConfig`)
  }

  const prompt = tpl.buildTituloPrompt(textoNormalizado)
  const png = await callGptImage1Title({ prompt, falConfig: tpl.falConfig })

  setTituloCache(textoNormalizado, png)
  return { png, cacheHit: false, textoNormalizado }
}
