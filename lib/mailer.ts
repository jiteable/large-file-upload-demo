import 'server-only'
import nodemailer from 'nodemailer'

// 改进配置，添加更多选项
const config = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '25', 10),
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD,
  },
  secure: false, // 对于163邮箱使用false
  tls: {
    rejectUnauthorized: false, // 在某些情况下可能需要
  },
  connectionTimeout: 30000, // 30秒连接超时
  greetingTimeout: 30000, // 30秒问候超时
  socketTimeout: 30000, // 30秒socket超时
}

// 添加连接测试功能
export async function testEmailConnection() {
  try {
    const transporter = nodemailer.createTransport(config)
    await transporter.verify()
    console.log('Email server connection verified successfully')
    return true
  } catch (error) {
    console.error('Email server connection failed:', error)
    return false
  }
}

const transporter = nodemailer.createTransport(config)

interface SendEmailOpt {
  subject?: string
  text?: string
  toEmail?: string
}

export async function sendEmail(opt: SendEmailOpt = {}) {
  const { subject = '', text = '', toEmail } = opt
  if (!subject) {
    console.error('subject required')
    return
  }

  // if (process.env.NODE_ENV === 'development') {
  //   console.log('Wont send email in dev env... ', subject, text)
  //   return
  // }

  try {
    const mailConfig = {
      from: `划水AI<${process.env.EMAIL_FROM}>`,
      subject,
      to: toEmail || process.env.NOTICE_EMAIL_TO,
      text,
    }

    console.log('Sending email with config:', {
      from: mailConfig.from,
      to: mailConfig.to,
      subject: mailConfig.subject,
    })

    const res = await transporter.sendMail(mailConfig)
    console.log('Message sent: %s', res.messageId)
    return res
  } catch (error) {
    console.error('Failed to send email:', error)
    // 发送错误通知邮件到管理员邮箱（如果配置了）
    if (process.env.NOTICE_EMAIL_TO) {
      try {
        await transporter.sendMail({
          from: `划水AI<${process.env.EMAIL_FROM}>`,
          to: process.env.NOTICE_EMAIL_TO,
          subject: 'Email Sending Failed Alert',
          text: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      } catch (notifyError) {
        console.error('Failed to send notification email:', notifyError)
      }
    }
    throw error
  }
}
