'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type LoginInput = z.infer<typeof LoginSchema>

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/'
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setServerError(null)
    setLoading(true)
    const res = await signIn('credentials', { ...data, redirect: false, callbackUrl })
    setLoading(false)
    if (!res || res.error) {
      setServerError('E-mail ou senha incorretos.')
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6">
      <div className="absolute left-8 top-7 flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/m2/logos/logo-quadrado.png"
          alt="Charme do Detalhe"
          className="h-7 w-7 rounded-md object-cover"
        />
        <div className="text-[12.5px] font-medium">Central Marketing - Charme do Detalhe</div>
      </div>

      <div className="w-full max-w-[360px]">
        <div className="mb-9 text-center">
          <div className="mb-3.5 text-[11.5px] uppercase tracking-[0.12em] text-[color:var(--text-tertiary)]">
            Charme do Detalhe
          </div>
          <h1 className="m-0 text-[26px] font-medium leading-tight tracking-[-0.025em]">
            Entre na sua conta
          </h1>
          <p className="mx-auto mt-2 max-w-[300px] text-[13.5px] text-[color:var(--text-secondary)]">
            Acesse o painel de criação de conteúdo
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-medium">E-mail</label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="rafael@charmedodetalhe.com"
              className="h-11 w-full rounded-lg border border-[color:var(--border-strong)] bg-white px-3.5 text-[13.5px] outline-none focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15"
            />
            {errors.email && <div className="mt-1.5 text-[11.5px] text-[#A32D2D]">{errors.email.message}</div>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium">Senha</label>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-11 w-full rounded-lg border border-[color:var(--border-strong)] bg-white px-3.5 text-[13.5px] outline-none focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15"
            />
            {errors.password && (
              <div className="mt-1.5 text-[11.5px] text-[#A32D2D]">{errors.password.message}</div>
            )}
          </div>

          {serverError && <div className="mt-1 text-[11.5px] text-[#A32D2D]">{serverError}</div>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-[#553679] px-4 text-[13.5px] font-medium text-white transition hover:bg-[#46295F] disabled:cursor-wait disabled:bg-[#7A6195]"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-7 text-center text-[11.5px] text-[color:var(--text-tertiary)]">
          Esqueceu a senha? Solicite ao admin uma nova conta.
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-6 text-center text-[11px] text-black/35">
        Central Marketing - Charme do Detalhe
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
