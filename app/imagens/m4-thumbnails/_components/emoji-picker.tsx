'use client'

import * as React from 'react'
import { upload } from '@vercel/blob/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TooltipInfo } from '@/components/tooltip-info'
import { CURATED_EMOJIS_3D, QUICK_EMOJI_IDS, CATEGORY_LABELS, type Emoji3D } from '@/lib/m4/emojis'
import { M4_TOOLTIPS } from '@/lib/m4/tooltips'
import { Image as ImageIcon, Upload, Loader2, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmojiPickerProps {
  value: string | null
  onChange: (url: string | null) => void
}

const MAX_PNG_BYTES = 200 * 1024 // 200KB

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const quickEmojis = QUICK_EMOJI_IDS
    .map((id) => CURATED_EMOJIS_3D.find((e) => e.id === id))
    .filter((e): e is Emoji3D => !!e)

  async function handleUpload(file: File) {
    setErrorMsg(null)
    if (file.size > MAX_PNG_BYTES) {
      setErrorMsg('PNG excede 200KB')
      return
    }
    if (file.type !== 'image/png') {
      setErrorMsg('Apenas PNG é aceito')
      return
    }
    setUploading(true)
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      onChange(blob.url)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha no upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Ícone final</span>
        <TooltipInfo text={M4_TOOLTIPS.icon} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {quickEmojis.map((e) => (
          <EmojiButton key={e.id} emoji={e} selected={value === e.url} onClick={() => onChange(e.url)} />
        ))}

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex h-12 items-center justify-center rounded-md border border-[color:var(--border-default)] bg-white px-3 text-[11.5px] font-medium hover:border-[color:var(--border-strong)]"
        >
          + Mais
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-12 items-center gap-1.5 rounded-md border border-[color:var(--border-default)] bg-white px-3 text-[11.5px] font-medium hover:border-[color:var(--border-strong)] disabled:cursor-wait disabled:opacity-60"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          PNG próprio
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleUpload(f)
          }}
        />

        {value && !quickEmojis.some((e) => e.url === value) && (
          <div className="flex items-center gap-1.5 rounded-md border border-[1.5px] border-[#553679] bg-white p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Selecionado" className="h-9 w-9 object-contain" />
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remover ícone"
              className="rounded p-1 hover:bg-black/5"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {errorMsg && <span className="text-[11px] text-[#A32D2D]">{errorMsg}</span>}

      <EmojiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedUrl={value}
        onSelect={(url) => {
          onChange(url)
          setDialogOpen(false)
        }}
      />
    </div>
  )
}

function EmojiButton({
  emoji,
  selected,
  onClick,
}: {
  emoji: Emoji3D
  selected: boolean
  onClick: () => void
}) {
  const [failed, setFailed] = React.useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      title={emoji.label}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-md border bg-white p-1 transition hover:border-[color:var(--border-strong)]',
        selected ? 'border-[1.5px] border-[#553679]' : 'border-[color:var(--border-default)]'
      )}
    >
      {failed ? (
        <ImageIcon size={16} className="text-[color:var(--text-tertiary)]" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={emoji.url} alt={emoji.label} className="h-9 w-9 object-contain" onError={() => setFailed(true)} />
      )}
    </button>
  )
}

function EmojiDialog({
  open,
  onOpenChange,
  selectedUrl,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUrl: string | null
  onSelect: (url: string) => void
}) {
  const [query, setQuery] = React.useState('')
  const grouped = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? CURATED_EMOJIS_3D.filter((e) => e.label.toLowerCase().includes(q) || e.id.includes(q))
      : CURATED_EMOJIS_3D
    return filtered.reduce<Record<string, Emoji3D[]>>((acc, e) => {
      const cat = CATEGORY_LABELS[e.category]
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(e)
      return acc
    }, {})
  }, [query])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Escolher ícone</DialogTitle>
          <DialogDescription>30 emojis 3D curados, agrupados por uso.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar (ex: fogo, casa, comemora)"
            className="h-9 w-full rounded-md border border-[color:var(--border-strong)] bg-white pl-8 pr-3 text-sm outline-none focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15"
          />
        </div>

        <div className="max-h-[440px] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([catLabel, items]) => (
            <div key={catLabel} className="mb-4">
              <div className="mb-2 text-[10.5px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                {catLabel}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {items.map((e) => (
                  <EmojiButton
                    key={e.id}
                    emoji={e}
                    selected={selectedUrl === e.url}
                    onClick={() => onSelect(e.url)}
                  />
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="py-6 text-center text-sm text-[color:var(--text-secondary)]">
              Nenhum emoji encontrado.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
