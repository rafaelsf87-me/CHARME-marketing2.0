// Prompt parametrizado do título 3D balão — Template Atual_Maio26.
// Fórmula validada em smoke (19/05/2026, ver DEC-M3-002 em DIVIDAS):
// 5 textos PT-BR ("DESCONTÃO DE MÃE", "BOTA FORA CHARME", "SAÍDEIRA 2024",
// + 2 variações Prompt A/B/C) — fidelidade tipográfica 100%, efeito 3D balão
// consistente, PNG transparente real.

export function buildTituloPrompt(texto: string): string {
  const textoSanitizado = texto.replace(/'/g, '').trim()
  return `3D inflated balloon typography, chrome-like glossy highlights, white body with magenta double outline, exact text: '${textoSanitizado}'. Transparent background, no scene, no decorations, isolated typographic element only. Portuguese language. DO NOT misspell, DO NOT add extra letters, DO NOT translate to English, DO NOT add background elements, DO NOT add hearts or shapes around the text.`
}
