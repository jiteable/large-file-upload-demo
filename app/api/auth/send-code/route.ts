import { db } from '@/db/db'
import { sendEmail } from '@/lib/mailer'
import { genSuccessData, genErrorData } from '@/app/api/utils/gen-res-data'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return Response.json(genErrorData('邮箱地址不能为空'))
    }

    // 检查邮箱是否已经注册
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return Response.json(genErrorData('邮箱已注册'))
    }

    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // 存储验证码到数据库 (使用VerificationToken模型)
    const expires = new Date()
    expires.setMinutes(expires.getMinutes() + 10) // 10分钟后过期

    // 删除旧的验证码
    await db.verificationToken.deleteMany({
      where: {
        identifier: email,
      },
    })

    // 创建新的验证码
    await db.verificationToken.create({
      data: {
        identifier: email,
        token: code,
        expires,
      },
    })

    // 发送邮件
    await sendEmail({
      toEmail: email,
      subject: 'Document AI 验证码',
      text: `您的验证码是: ${code}，10分钟内有效。如果不是您本人操作，请忽略此邮件。`,
    })

    return Response.json(genSuccessData({ message: '验证码发送成功' }))
  } catch (error) {
    console.error('发送验证码失败:', error)
    return Response.json(genErrorData('发送验证码失败'))
  }
}
