'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface DownloadButtonProps {
  url: string
  filename?: string
  label?: string
}

export function DownloadButton({ url, filename = 'thumbnail.png', label = 'Fazer Download' }: DownloadButtonProps) {
  async function handleDownload() {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 250)
    } catch {
      window.open(url, '_blank')
    }
  }

  return (
    <Button type="button" variant="brand-outline" onClick={handleDownload}>
      <Download size={16} />
      {label}
    </Button>
  )
}
