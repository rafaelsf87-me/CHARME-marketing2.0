'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { AppShell } from '@/components/layout/app-shell'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type UserRow = {
  id: number
  email: string
  name: string | null
  role: 'admin' | 'operator'
  createdAt: string
}

type EditState =
  | { kind: 'new' }
  | { kind: 'edit'; user: UserRow }
  | null

export default function AdminUsuariosPage() {
  const { data: session } = useSession()
  const selfId = session?.user?.id
  const [list, setList] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/usuarios')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao listar')
      setList(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  async function handleDelete(user: UserRow) {
    const res = await fetch(`/api/admin/usuarios/${user.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(json.error || 'Falha ao deletar')
      return
    }
    setConfirmDelete(null)
    await fetchList()
  }

  return (
    <AppShell>
      <div className="px-11 py-9">
        <Breadcrumb items={[{ label: 'Administração' }, { label: 'Usuários' }]} />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="m-0 text-[26px] font-medium leading-tight tracking-[-0.025em]">
              Usuários
            </h1>
            <p className="mt-1.5 text-[13.5px] text-[color:var(--text-secondary)]">
              Gerenciar credenciais da equipe de marketing.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEdit({ kind: 'new' })}
            className="inline-flex items-center gap-2 rounded-lg bg-[#553679] px-4 py-2.5 text-[13px] font-medium text-white hover:bg-[#46295F]"
          >
            <Plus size={15} /> Novo usuário
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-[color:var(--text-secondary)]">Carregando...</div>
        ) : error ? (
          <div className="text-sm text-[#A32D2D]">{error}</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[color:var(--border-subtle)] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF9] text-left text-[11.5px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Nome</th>
                  <th className="px-4 py-2.5 font-medium">E-mail</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Criado em</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-t border-[color:var(--border-subtle)]">
                    <td className="px-4 py-3 text-[13px]">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-[13px]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10.5px] font-medium"
                        style={{
                          background: u.role === 'admin' ? '#EEEDFE' : '#F4F4F2',
                          color: u.role === 'admin' ? '#553679' : 'var(--text-secondary)',
                        }}
                      >
                        {u.role === 'admin' ? 'Admin' : 'Operador'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-[color:var(--text-secondary)]">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setEdit({ kind: 'edit', user: u })}
                        className="mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/[0.04]"
                        aria-label="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(u)}
                        disabled={String(u.id) === selfId}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Deletar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-[color:var(--text-secondary)]">
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserDialog state={edit} onClose={() => setEdit(null)} onSaved={fetchList} />

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar usuário</DialogTitle>
            <DialogDescription>
              Isso vai remover permanentemente <strong>{confirmDelete?.email}</strong>. Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="rounded-md border border-[color:var(--border-default)] px-3 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="rounded-md bg-[#A32D2D] px-3 py-2 text-sm font-medium text-white hover:bg-[#8B2424]"
            >
              Deletar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

function UserDialog({
  state,
  onClose,
  onSaved,
}: {
  state: EditState
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const isEdit = state?.kind === 'edit'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'operator'>('operator')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (state?.kind === 'edit') {
      setName(state.user.name || '')
      setEmail(state.user.email)
      setRole(state.user.role)
      setPassword('')
    } else if (state?.kind === 'new') {
      setName('')
      setEmail('')
      setPassword('')
      setRole('operator')
    }
    setErr(null)
  }, [state])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      if (state?.kind === 'new') {
        const res = await fetch('/api/admin/usuarios', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, email, password, role }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Falha ao criar')
      } else if (state?.kind === 'edit') {
        const patch: Record<string, unknown> = { name, role }
        if (password) patch.password = password
        const res = await fetch(`/api/admin/usuarios/${state.user.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Falha ao atualizar')
      }
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 w-full rounded-md border border-[color:var(--border-strong)] px-3 text-sm outline-none focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEdit}
              required
              className="h-10 w-full rounded-md border border-[color:var(--border-strong)] px-3 text-sm outline-none focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15 disabled:bg-[#FAFAF9]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">
              {isEdit ? 'Nova senha (opcional)' : 'Senha inicial'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              minLength={8}
              placeholder={isEdit ? 'Deixe em branco para manter' : 'Mínimo 8 caracteres'}
              className="h-10 w-full rounded-md border border-[color:var(--border-strong)] px-3 text-sm outline-none focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'operator')}
              className="h-10 w-full rounded-md border border-[color:var(--border-strong)] bg-white px-3 text-sm outline-none focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15"
            >
              <option value="operator">Operador</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {err && <div className="text-[11.5px] text-[#A32D2D]">{err}</div>}

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[color:var(--border-default)] px-3 py-2 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#553679] px-3 py-2 text-sm font-medium text-white hover:bg-[#46295F] disabled:cursor-wait disabled:bg-[#7A6195]"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
