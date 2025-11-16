'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from 'next-auth/react'
import { useEffect, useState, useTransition } from 'react'

export default function RegisterPage() {

  // get url query `callbackUrl`
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const url = urlParams.get('callbackUrl')
    // 使用 window.location.origin 作为基础 URL
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    if (url) {
      try {
        // 如果是相对路径，拼接完整 URL
        if (url.startsWith('/')) {
          setCallbackUrl(new URL(url, origin).toString())
        } else {
          // 如果已经是完整 URL，直接使用
          new URL(url) // 验证 URL 格式
          setCallbackUrl(url)
        }
      } catch (e) {
        // 如果 URL 格式不正确，使用默认值
        setCallbackUrl(origin)
      }
    } else {
      // 默认回调到主页
      setCallbackUrl(origin)
    }
  }, [])

  // handle email sign in
  const [email, setEmail] = useState('')
  const [isEmailSignInPending, startEmailSignInTransition] = useTransition()
  const [name, setName] = useState('') // 添加名称状态
  const [password, setPassword] = useState('') // 添加密码状态

  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0) // 添加倒计时状态
  const [isSendingCode, setIsSendingCode] = useState(false) // 添加发送状态

  // 添加倒计时效果
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [countdown])

  const handleEmailRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail(email)) {
      return alert('邮箱格式不正确')
    }

    if (!name.trim()) {
      return alert('请输入您的姓名')
    }

    if (!validatePassword(password)) {
      return alert('密码至少6位，且同时包含大小写字母')
    }

    if (!code.trim()) {
      return alert('请输入验证码')
    }

    startEmailSignInTransition(async () => {
      await signIn('credentials', { email, name, password, code, callbackUrl: callbackUrl || '/' })
    })
  }

  function validateEmail(email: string) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return regex.test(email)
  }

  function validatePassword(password: string) {
    // 检查密码长度至少6位且同时包含大小写字母
    const lengthValid = password.length >= 6
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)

    return lengthValid && hasUpperCase && hasLowerCase
  }

  async function sendCode() {
    if (!validateEmail(email)) {
      return alert('邮箱格式不正确')
    }

    // 如果正在倒计时或正在发送，则不执行
    if (countdown > 0 || isSendingCode) {
      return
    }

    setIsSendingCode(true)
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (result.errno === 0) {
        alert('验证码已发送，请检查您的邮箱')
        // 开始60秒倒计时
        setCountdown(60)
      } else {
        alert(`发送失败: ${result.msg}`)
      }
    } catch (error) {
      console.error('Failed to send verification code:', error)
      alert('发送验证码失败，请稍后重试')
    } finally {
      setIsSendingCode(false)
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const url = urlParams.get('callbackUrl')
    // 使用 window.location.origin 作为基础 URL
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

    if (url) {
      try {
        // 如果是相对路径，拼接完整 URL
        if (url.startsWith('/')) {
          setCallbackUrl(new URL(url, origin).toString())
        } else {
          // 如果已经是完整 URL，直接使用
          new URL(url) // 验证 URL 格式
          setCallbackUrl(url)
        }
      } catch (e) {
        // 如果 URL 格式不正确，使用默认值
        setCallbackUrl(origin + '/work/0')
      }
    } else {
      // 默认回调到 /work/0
      setCallbackUrl(origin + '/work/0')
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-secondary-foreground">创建账户</h1>
          <p className="text-sm text-gray-500">输入您的信息创建新账户</p>
        </div>

        {/* Login Form */}
        <form className="space-y-4" onSubmit={handleEmailRegister}>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-muted-foreground">
              姓名
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="请输入您的姓名"
              className="h-11 border-gray-300 focus:border-gray-400 focus:ring-gray-400"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
              邮箱
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="输入你的邮箱"
              className="h-11 border-gray-300 focus:border-gray-400 focus:ring-gray-400"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Label htmlFor="password" className="text-sm font-medium text-muted-foreground">
              密码
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="请输入密码（至少6位，且同时包含大小写字母）"
              className="h-11 border-gray-300 focus:border-gray-400 focus:ring-gray-400"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Label htmlFor="code" className="text-sm font-medium text-muted-foreground">
              验证码
            </Label>
            <div className="flex gap-2">
              <Input
                id="code"
                type="text"
                placeholder="请输入验证码"
                className="h-11 border-gray-300 focus:border-gray-400 focus:ring-gray-400 flex-1"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {/* 修改按钮文本和禁用状态 */}
              <Button type="button" onClick={sendCode} disabled={countdown > 0 || isSendingCode} className="h-11">
                {isSendingCode ? '发送中...' : countdown > 0 ? `${countdown}秒后可重发` : '发送验证码'}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-gray-900 hover:bg-gray-800 text-white font-medium"
            disabled={isEmailSignInPending}
          >
            {isEmailSignInPending ? '注册中...' : '注册'}
          </Button>
        </form>
      </div>
    </div>
  )
}