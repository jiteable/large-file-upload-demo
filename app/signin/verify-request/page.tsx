import { Mail } from 'lucide-react'

export default function VerifyRequestPage() {
  // 由于没有找到实际的翻译文件，这里直接使用中文文本
  const title = '请检查您的邮箱'
  const subTitle = '我们已经发送了一封包含登录链接的邮件，请点击邮件中的链接完成登录。'
  const infoText = '如果您没有收到邮件，请检查垃圾邮件文件夹。'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center">
            <Mail className="w-8 h-8 text-gray-600 dark:text-gray-300" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-500 dark:text-gray-300">{subTitle}</p>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">{infoText}</p>
        </div>

        {/* Back to Sign In */}
        <div className="text-center pt-4">
          <a
            href="/signin"
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            返回登录页面
          </a>
        </div>
      </div>
    </div>
  )
}
