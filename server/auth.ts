/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/db/db'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import NextAuth from 'next-auth'
import { type Adapter } from 'next-auth/adapters'
import GitHub from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import Email from 'next-auth/providers/nodemailer'
import Resend from 'next-auth/providers/resend'

import type { NextAuthConfig } from 'next-auth'

// 拼接 SMTP 服务器地址
function genEmailSmtpPServer() {
  const from = process.env.EMAIL_FROM || ''
  const host = process.env.EMAIL_HOST || ''
  const port = process.env.EMAIL_PORT || ''
  const password = process.env.EMAIL_PASSWORD || ''

  const username = from.split('@')[0]

  const server = `smtp://${username}:${password}@${host}:${port}`
  console.log('Email Server:', server)
  return server
}

function genProviders() {
  const env = process.env.NODE_ENV || 'development'
  const providers = []

  // GitHub provider
  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHub({
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
      })
    )
  }

  // 根据环境决定使用哪个邮件服务
  if (env === 'production') {
    // 生产环境使用 Resend
    if (process.env.RESEND_API_KEY) {
      providers.push(
        Resend({
          apiKey: process.env.RESEND_API_KEY || '',
          from: 'no-reply@document-ai.top',
        })
      )
    } else {
      console.error('Resend API key not configured for production environment')
    }
  } else {
    // 开发环境使用 nodemailer
    providers.push(
      Email({
        server: genEmailSmtpPServer(),
        from: process.env.EMAIL_FROM,
      })
    )
  }

  // 添加 Credentials Provider
  providers.push(
    CredentialsProvider({
      name: '凭证登录',
      credentials: {
        email: { label: '邮箱', type: 'email', placeholder: '请输入邮箱地址' },
        name: { label: '姓名', type: 'text', placeholder: '请输入姓名（可选）' },
        password: { label: '密码', type: 'password', placeholder: '请输入密码' },
        code: { label: '验证码', type: 'text', placeholder: '请输入验证码（可选）' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null
        }

        // 查找用户
        let user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })

        // 如果提供了密码，验证密码
        if (credentials.password) {
          // 如果用户不存在，创建新用户
          if (!user) {
            // 需要同时提供验证码来创建新用户
            if (!credentials.code) {
              return null
            }

            // 验证验证码
            const verificationToken = await db.verificationToken.findFirst({
              where: {
                identifier: credentials.email as string,
                token: credentials.code,
              },
            })

            // 检查验证码是否存在且未过期
            if (!verificationToken || verificationToken.expires < new Date()) {
              // 删除过期的验证码
              if (verificationToken) {
                await db.verificationToken.delete({
                  where: {
                    identifier_token: {
                      identifier: credentials.email as string,
                      token: credentials.code as string,
                    },
                  },
                })
              }
              return null
            }

            // 验证成功后删除验证码
            await db.verificationToken.delete({
              where: {
                identifier_token: {
                  identifier: credentials.email as string,
                  token: credentials.code as string,
                },
              },
            })

            // 创建新用户
            const name = credentials.name && typeof credentials.name === 'string' ? credentials.name.trim() : ''
            user = await db.user.create({
              data: {
                email: credentials.email as string,
                name: name || (credentials.email as string).split('@')[0],
                password: credentials.password as string,
              },
            })

            return {
              id: user.id,
              email: user.email,
              name: user.name,
            }
          }

          // 检查用户是否有密码
          if (!user.password) {
            return null
          }

          // 验证密码
          if (credentials.password !== user.password) {
            return null
          }

          // 密码验证成功
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        }

        // 如果提供了验证码，验证验证码（用于注册或登录场景）
        if (credentials.code) {
          // 验证验证码
          const verificationToken = await db.verificationToken.findFirst({
            where: {
              identifier: credentials.email as string,
              token: credentials.code,
            },
          })

          // 检查验证码是否存在且未过期
          if (!verificationToken || verificationToken.expires < new Date()) {
            // 删除过期的验证码
            if (verificationToken) {
              await db.verificationToken.delete({
                where: {
                  identifier_token: {
                    identifier: credentials.email as string,
                    token: credentials.code as string,
                  },
                },
              })
            }
            return null
          }

          // 验证成功后删除验证码
          await db.verificationToken.delete({
            where: {
              identifier_token: {
                identifier: credentials.email as string,
                token: credentials.code as string,
              },
            },
          })

          // 如果用户不存在，创建新用户（仅使用验证码的情况）
          if (!user) {
            const name = credentials.name && typeof credentials.name === 'string' ? credentials.name.trim() : ''
            user = await db.user.create({
              data: {
                email: credentials.email as string,
                name: name || (credentials.email as string).split('@')[0],
              },
            })
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        }

        // 如果既没有密码也没有验证码，则验证失败
        return null
      },
    })
  )

  return providers
}

export const config = {
  trustHost: true,
  basePath: '/api/auth',
  theme: {
    logo: 'https://next-auth.js.org/img/logo/logo-sm.png',
  },
  adapter: PrismaAdapter(db) as Adapter,
  providers: genProviders(),
  pages: {
    signIn: '/signin',
    verifyRequest: '/signin/verify-request',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    authorized() {
      return true
    },
    jwt({ token, trigger, user }) {
      if (trigger === 'signIn') {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      // @ts-expect-error: user may have id property not defined in type
      session.user.id = token.id
      return session
    },
    // 添加重定向回调，注册成功后跳转到 /work/0
    async redirect({ url, baseUrl }) {
      // 如果是登录或注册成功，重定向到 /work/0
      if (url.startsWith(baseUrl) && (url.includes('/signin') || url.includes('/register'))) {
        return `${baseUrl}/work/0`
      }

      // 对于其他情况，确保 URL 是安全的
      if (url.startsWith(baseUrl)) {
        return url
      }

      // 如果 URL 不安全，重定向到主页
      return baseUrl
    },
  },
  // 添加错误处理
  logger: {
    error(error: Error) {
      console.error('NextAuth Error:', error)
    },
    warn(code: string) {
      console.warn('NextAuth Warning:', code)
    },
    debug(message: string, metadata: any) {
      console.debug('NextAuth Debug:', message, metadata)
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)
