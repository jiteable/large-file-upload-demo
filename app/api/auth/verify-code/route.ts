import { db } from '@/db/db'
import { genSuccessData, genErrorData } from '@/app/api/utils/gen-res-data'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, code } = body

    if (!email || !code) {
      return Response.json(genErrorData('邮箱地址和验证码不能为空'))
    }

    // 查找验证码
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: email,
        token: code,
      },
    })

    // 检查验证码是否存在且未过期
    if (!verificationToken) {
      return Response.json(genErrorData('验证码错误'))
    }

    if (verificationToken.expires < new Date()) {
      // 删除过期的验证码
      await db.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: code,
          },
        },
      })
      return Response.json(genErrorData('验证码已过期'))
    }

    // 验证成功
    return Response.json(genSuccessData({ message: '验证码正确' }))
  } catch (error) {
    console.error('验证验证码失败:', error)
    return Response.json(genErrorData('验证失败'))
  }
}
