import { put } from '@vercel/blob'
import { getTemplate } from './templates'
import type { Template } from './templates/types'
import { callGptImage, type CallGptImageArgs } from './fal-client'
import { resizeTo1080x1350 } from './post-process'
import { isBackgroundGradient } from './background-check'
import type { M2GenerateInput, M2SlideInput } from './schema'

interface ResolvedTemplate extends Template {
  buildPrompt: NonNullable<Template['buildPrompt']>
  falConfig: NonNullable<Template['falConfig']>
}

function resolveTemplate(templateId: M2GenerateInput['templateId']): ResolvedTemplate {
  const template = getTemplate(templateId)

  // 19/05/2026: registry expõe apenas T2 ativo no UI; T1/placeholders foram
  // removidos do REGISTRY mas a rota /api/imagens/m2/generate segue intacta
  // por 30 dias ([REF-M2-005]). Requests pra ids fora do registry retornam
  // erro explícito em vez de crash.
  if (!template) {
    throw new Error(
      `[M2] Template "${templateId}" não está mais disponível no registry. ` +
        `Templates ativos: ver lib/m2/templates/index.ts. Ver [REF-M2-005].`,
    )
  }

  if (template.status !== 'ativo') {
    throw new Error(
      `[M2] Template "${templateId}" não está ativo (status: ${template.status}). ` +
        `Selecione um template marcado como "ativo".`
    )
  }
  if (!template.buildPrompt) {
    throw new Error(`[M2] Template "${templateId}" sem buildPrompt configurado`)
  }
  if (!template.falConfig) {
    throw new Error(`[M2] Template "${templateId}" sem falConfig configurado`)
  }

  return template as ResolvedTemplate
}

// Retry wrapper (hotfix v8, 18/05/2026). Sharp valida cantos do output —
// se >=2 cantos parecem fundo sólido (preto/branco/cinza neutro), retenta
// 1× e aceita o segundo output (mesmo se também falhar — log + sigue).
//
// Custo médio sobe ~10-20% nos casos de retry ocasional. Aceito como
// trade-off do T1 ("réplica imperfeita do ChatGPT Plus"). T2 (Fase 3)
// elimina o problema via Pipeline Híbrido com gradient determinístico.
const MAX_ATTEMPTS = 2

async function generateWithBgCheck(args: CallGptImageArgs): Promise<{ url: string; buffer: Buffer }> {
  let lastUrl: string | null = null
  let lastBuffer: Buffer | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const url = await callGptImage(args)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`[M2] Falha ao baixar imagem do FAL (${response.status})`)
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    lastUrl = url
    lastBuffer = buffer

    const isOk = await isBackgroundGradient(buffer)
    if (isOk) {
      if (attempt > 1) console.log(`[M2] Background retry succeeded on attempt ${attempt}`)
      return { url, buffer }
    }

    if (attempt < MAX_ATTEMPTS) {
      console.log(`[M2] Background check failed (attempt ${attempt}), retrying...`)
    } else {
      console.log(`[M2] Background check failed after ${MAX_ATTEMPTS} attempts, accepting last output`)
    }
  }

  return { url: lastUrl as string, buffer: lastBuffer as Buffer }
}

async function generateOne(args: {
  template: ResolvedTemplate
  prompt: string
  referenceUrls: string[] | undefined
  blobKey: string
}): Promise<string> {
  // Hotfix v8 (18/05/2026): revertida a estratégia v6 de prepend gradient
  // base. Agora `referenceUrls` só carrega os PNGs do user. Sem PNGs,
  // pipeline cai em text-to-image automaticamente (via fal-client).
  // Validação de fundo é feita via retry com Sharp (background-check.ts).
  const { url, buffer } = await generateWithBgCheck({
    prompt: args.prompt,
    falConfig: args.template.falConfig,
    referenceUrls: args.referenceUrls,
  })

  // Reusa o buffer já baixado pra evitar segundo fetch.
  const processed = await resizeTo1080x1350(url, buffer)
  const blob = await put(args.blobKey, processed, {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'image/png',
  })
  return blob.url
}

export async function renderM2(input: M2GenerateInput): Promise<{ urls: string[] }> {
  const template = resolveTemplate(input.templateId)
  // `logo` e `modoGeracao` têm default no schema; após parse sempre chegam
  // definidos. `logo` será consumido pelo T2/T3 (Pipeline Híbrido, Fase 3+);
  // T1 ignora porque não aplica footer programático.
  const isUploadMode = input.modoGeracao === 'upload'

  if (input.modo === 'imagem-unica') {
    const prompt = template.buildPrompt({
      copyTexto: input.copyTexto,
      instrucoesExtras: input.instrucoesExtras,
      instrucoesUsoImagens: isUploadMode ? input.instrucoesUsoImagens : undefined,
      hasReferences: (input.pngUrls?.length ?? 0) > 0,
    })
    const url = await generateOne({
      template,
      prompt,
      referenceUrls: input.pngUrls,
      blobKey: `m2/${Date.now()}-imagem.png`,
    })
    return { urls: [url] }
  }

  // Carrossel: cada slide é uma geração independente, em paralelo.
  // Hotfix v8 (J): sem `ctaFinal` global — CTA vai dentro do copy do último
  // slide e a IA é instruída via LAST SLIDE GUIDANCE a destacá-la quando
  // presente.
  const tasks = input.slides.map((slide: M2SlideInput, idx: number) => {
    const isUltimo = idx === input.slides.length - 1
    const referenceUrls = slide.pngUrl ? [slide.pngUrl] : undefined
    const prompt = template.buildPrompt({
      copyTexto: slide.copyTexto,
      contextoGeral: input.contextoGeral,
      instrucoesUsoImagens: slide.promptImagem,
      isUltimoSlide: isUltimo,
      hasReferences: !!slide.pngUrl,
    })
    return generateOne({
      template,
      prompt,
      referenceUrls,
      blobKey: `m2/${Date.now()}-slide-${idx + 1}.png`,
    })
  })

  const urls = await Promise.all(tasks)
  return { urls }
}
