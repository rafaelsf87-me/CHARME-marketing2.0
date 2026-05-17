import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getDecoracaoById } from './decoracoes-banco'

// Carrega o PNG do filesystem (public/brand/m3/decoracoes/<filename>).
// Server-only — pra preview no browser, a UI usa o path público direto.
export async function loadDecoracao(id: string): Promise<Buffer> {
  const item = getDecoracaoById(id)
  if (!item) throw new Error(`[M3] Decoração desconhecida: ${id}`)
  const fullPath = path.resolve(process.cwd(), 'public/brand/m3/decoracoes', item.filename)
  return readFile(fullPath)
}
