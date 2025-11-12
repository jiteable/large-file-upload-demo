import OSS from 'ali-oss'

export const ossClient = new OSS({
  region: 'oss-cn-hongkong',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: 'document-ai-dev',
  timeout: 300000, // 增加超时时间到5分钟(300,000毫秒)
})
