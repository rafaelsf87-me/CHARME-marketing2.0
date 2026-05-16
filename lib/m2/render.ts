import { put } from '@vercel/blob'
import { brandM2 } from '@/lib/brand/m2.brand'
import { getTemplate } from './templates'
import type { Template } from './templates/types'
import { callGptImage } from './fal-client'
import { resizeTo1080x1350 } from './post-process'
import type { M2GenerateInput, M2SlideInput } from './schema'

interface ResolvedTemplate extends Template {
  buildPrompt: NonNullable<Template['buildPrompt']>
  falConfig: NonNullable<Template['falConfig']>
}

function resolveTemplate(templateId: M2GenerateInput['templateId']): ResolvedTemplate {
  const template = getTemplate(templateId)

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

async function generateOne(args: {
  template: ResolvedTemplate
  prompt: string
  referenceUrls: string[] | undefined
  blobKey: string
}): Promise<string> {
  // Hotfix v6 (18/05/2026): T1 sempre usa edit-image com o gradient base
  // como primeira reference image. Trava o fundo cyan→roxo (resolve fundo
  // preto/branco aleatório que escapava do BACKGROUND ENFORCEMENT só-via-prompt).
  // PNGs do usuário (modo IA opcional / Upload obrigatório) entram nas
  // posições seguintes.
  const referenceUrls = [
    brandM2.backgrounds.gradientBaseUrl,
    ...(args.referenceUrls ?? []),
  ]

  const rawUrl = await callGptImage({
    prompt: args.prompt,
    falConfig: args.template.falConfig,
    referenceUrls,
  })

  const processed = await resizeTo1080x1350(rawUrl)
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
  // Homogeneidade visual fica por conta do prompt comum (gradient + brand id).
  // Hotfix UX 18/05/2026: 1 imagem por slide + promptImagem por slide
  // (substitui instrucoesUsoImagens global). Mais granular.
  const tasks = input.slides.map((slide: M2SlideInput, idx: number) => {
    const isUltimo = idx === input.slides.length - 1
    const referenceUrls = slide.pngUrl ? [slide.pngUrl] : undefined
    const prompt = template.buildPrompt({
      copyTexto: slide.copyTexto,
      contextoGeral: input.contextoGeral,
      instrucoesUsoImagens: slide.promptImagem,
      isUltimoSlide: isUltimo,
      ctaFinal: isUltimo ? input.ctaFinal : undefined,
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
