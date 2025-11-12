import OSS from 'ali-oss'

export const ossClient = new OSS({
  region: 'oss-cn-hongkong',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: 'document-ai-dev',
})
