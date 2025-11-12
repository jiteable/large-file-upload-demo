/* eslint-disable @typescript-eslint/no-explicit-any */
import { ossClient as client } from '../../lib/oss';
const progress = (p: number, _checkpoint: any) => {
  // Object的上传进度。
  console.log(`上传进度: ${p * 100}%`);
  // 分片上传的断点信息。
  console.log('断点信息:', _checkpoint);
};

//hashpath: 文件名hash
//hash: 分片名hash
//file: 分片内容
// 开始分片上传。
export async function multipartUpload(hashpath: string, hash: string, file: File) {
  try {
    // 将浏览器File对象转换为Node.js Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 上传到OSS
    const result = await client.multipartUpload(`files/uploaded/Chunks/${hashpath}/${hash}`, buffer, {
      progress,
      // 指定Object的存储类型。
      headers: {
        'x-oss-storage-class': 'Standard'
      },
      // 设置并发上传分片大小和最大并发数
      parallel: 6,
      partSize: 1024 * 1024 // 1MB per part
    });

    console.log('上传结果:', result);

    // 验证上传结果
    const head = await client.head(`files/uploaded/Chunks/${hashpath}/${hash}`);
    console.log('文件头信息:', head);

    return result;
  } catch (e: any) {
    // 捕获超时异常。
    if (e.code === 'ConnectionTimeoutError') {
      console.log('TimeoutError');
    }
    console.log('上传错误:', e);
    throw e;
  }
}