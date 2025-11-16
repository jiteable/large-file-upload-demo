'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Github } from 'lucide-react'
import { getProviders, signIn } from 'next-auth/react'
import { useEffect, useMemo, useState, useTransition } from 'react'
// import { Link } from '@/i18n/routing'
import Link from 'next/link'

export default function SignInPage() {
  // get url query `callbackUrl`
  const callbackUrl = useMemo(() => {
    // 将计算逻辑提取到一个函数中
    const calculateCallbackUrl = () => {
      if (typeof window === 'undefined') return null;

      const urlParams = new URLSearchParams(window.location.search)
      const url = urlParams.get('callbackUrl')
      // 使用 window.location.origin 作为基础 URL
      const origin = window.location.origin
      if (url) {
        try {
          // 如果是相对路径，拼接完整 URL
          if (url.startsWith('/')) {
            return new URL(url, origin).toString()
          } else {
            // 如果已经是完整 URL，直接使用
            new URL(url) // 验证 URL 格式
            return url
          }
        } catch (e) {
          // 如果 URL 格式不正确，使用默认值
          return origin
        }
      } else {
        // 默认回调到主页
        return origin
      }
    }

    return calculateCallbackUrl()
  }, [])

  // handle github sign in
  const [isGithubSignInPending, startGithubSignInTransition] = useTransition()
  const handleGitHubSignIn = () => {
    startGithubSignInTransition(async () => {
      await signIn('github', { callbackUrl: callbackUrl || '/' })
    })
  }

  // handle email sign in
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isEmailSignInPending, startEmailSignInTransition] = useTransition()
  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(email)) {
      return alert('邮箱格式不正确')
    }

    if (!password.trim()) {
      return alert('请输入密码')
    }

    startEmailSignInTransition(async () => {
      // 使用 credentials provider 进行邮箱密码登录，仅传递 email 和 password
      try {
        const result = await signIn('credentials', {
          email,
          password,
          callbackUrl: callbackUrl || '/work/0',
          redirect: false,
        })

        // 根据登录结果进行处理
        if (result?.error) {
          // 登录失败，显示错误消息
          alert('登录失败，请检查邮箱和密码')
        } else if (result?.ok) {
          // 登录成功，手动跳转
          window.location.href = callbackUrl || '/work/0'
        }
      } catch (error) {
        console.error('登录过程中发生错误:', error)
        alert('登录过程中发生错误，请稍后重试')
      }
    })
  }
  function validateEmail(email: string) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return regex.test(email)
  }

  // get providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const providers = await getProviders()
        console.log('Providers raw:', providers)
        if (!providers) {
          console.error('No providers found')
        }
        console.log('Available providers:', providers)
      } catch (err) {
        console.error('Failed to get providers:', err)
        // 更详细的错误信息
        if (err instanceof Error) {
          console.error('Error details:', err.message)
          console.error('Error stack:', err.stack)
        }
      }
    }
    fetchProviders()
    console.log('env...', process.env.NODE_ENV)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">欢迎回来</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">使用 GitHub 或邮箱登录</p>
        </div>

        {/* Login Form */}
        <div className="space-y-6">
          {/* GitHub Login */}
          <Button
            variant="outline"
            className="w-full h-12 text-base font-medium border-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            onClick={handleGitHubSignIn}
            disabled={isGithubSignInPending}
          >
            <Github className="mr-2 h-5 w-5" />
            使用 GitHub 登录
          </Button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white dark:bg-gray-800 px-3 text-gray-500 dark:text-gray-400">使用其他方式</span>
          </div>
        </div>

        {/* Email Login Form */}
        <form className="space-y-4" onSubmit={handleEmailSignIn}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                邮箱
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="输入你的邮箱"
                className="h-12 border-gray-300 focus:border-gray-400 focus:ring-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                className="h-12 border-gray-300 focus:border-gray-400 focus:ring-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-medium text-base"
            disabled={isEmailSignInPending}
          >
            {isEmailSignInPending ? '登录中...' : '登录'}
          </Button>
        </form>

        <div className="text-center">
          <Button variant="link" className="p-0 h-auto font-normal text-base">
            <Link
              href="/register"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              还没有账户？立即注册
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}