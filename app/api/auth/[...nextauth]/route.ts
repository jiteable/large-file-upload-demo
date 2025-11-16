/* eslint-disable @typescript-eslint/no-explicit-any */
import { handlers } from '@/server/auth'

const origGET = handlers.GET
const origPOST = handlers.POST

export async function GET(request: Request) {
  const res = await (origGET as any)(request)

  try {
    const location = res?.headers?.get('location') || res?.headers?.get('Location')
    if (location) {
      console.log('[NextAuth] Response Location header:', location)
      try {
        // 使用 request.url 作为基础 URL 来解析相对路径
        const baseUrl = new URL(request.url).origin
        const u = new URL(location, baseUrl)
        const redirectParam = u.searchParams.get('redirect_uri') || u.searchParams.get('redirect')
        if (redirectParam) console.log('[NextAuth] redirect_uri param:', redirectParam)
      } catch (e) {
        console.log(e)
      }
    }
  } catch (e) {
    console.log(e)
  }

  return res
}

export async function POST(request: Request) {
  const res = await (origPOST as any)(request)

  try {
    const location = res?.headers?.get('location') || res?.headers?.get('Location')
    if (location) {
      console.log('[NextAuth] Response Location header:', location)
      try {
        // 同样处理 POST 方法
        const baseUrl = new URL(request.url).origin
        const u = new URL(location, baseUrl)
        const redirectParam = u.searchParams.get('redirect_uri') || u.searchParams.get('redirect')
        if (redirectParam) console.log('[NextAuth] redirect_uri param:', redirectParam)
      } catch (e) {
        console.log(e)
      }
    }
  } catch (e) {
    console.log(e)
  }

  return res
}
