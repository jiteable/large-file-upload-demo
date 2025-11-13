/* eslint-disable @typescript-eslint/no-explicit-any */
import { ossClient as client } from '../../lib/oss';
const progress = (p: number, _checkpoint: any) => {
  // Object的上传进度。
  console.log(`上传进度: ${p * 100}%`);
  // 分片上传的断点信息。
  console.log('断点信息:', _checkpoint);
};

/**
 * 初始化分片上传任务
 * @param objectName OSS中的对象名称（最终文件路径）
 * @returns 包含uploadId的对象
 */
export async function initMultipartUpload(objectName: string) {
  try {
    const result = await client.initMultipartUpload(objectName);
    console.log('初始化分片上传任务成功: ', result);
    return result;
  } catch (e: any) {
    console.log('初始化分片上传任务失败:', e);
    throw new Error(`初始化分片上传任务失败: ${e.message}`);
  }
}

/**
 * 上传单个分片
 * @param objectName OSS中的对象名称（最终文件路径）
 * @param uploadId 分片上传任务ID
 * @param partNumber 分片编号（从1开始）
 * @param file 分片文件内容
 * @returns 上传结果，包含ETag等信息
 */
export async function multipartUpload(objectName: string, uploadId: string, partNumber: number, file: File) {
  try {
    // 将浏览器File对象转换为Node.js Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 上传分片到OSS
    const result = await client.uploadPart(objectName, uploadId, partNumber, buffer, 0, buffer.length, {
      // 移除了不被支持的progress参数
      // 设置更长的超时时间
      timeout: 300000 // 5分钟超时
    });

    console.log(`分片 ${partNumber} 上传结果: `, result);

    // 注意：对于分片上传，不能立即调用head方法检查对象，因为对象尚未完成合并
    // 只有在所有分片上传完成并调用completeMultipartUpload后，对象才真正存在

    return result;
  } catch (e: any) {
    // 捕获超时异常。
    if (e.code === 'ConnectionTimeoutError' || e.code === 'ResponseTimeoutError') {
      console.log('TimeoutError', e.message);
      throw new Error(`上传超时: ${e.message}`);
    }
    console.log('上传错误:', e);
    throw new Error(`上传错误: ${e.message}`);
  }
}


//hashpath: 文件名hash
//hash: 分片名hash
//file: 分片内容
// 开始分片上传。
// export async function multipartUpload(hashpath: string, hash: string, file: File) {
//   try {
//     // 将浏览器File对象转换为Node.js Buffer
//     const buffer = Buffer.from(await file.arrayBuffer());

//     // 上传到OSS，增加重试机制和更详细的配置
//     const result = await client.multipartUpload(`files/uploaded/Chunks/${hashpath}/${hash}`, buffer, {
//       progress,
//       // 指定Object的存储类型。
//       headers: {
//         'x-oss-storage-class': 'Standard'
//       },
//       // 设置并发上传分片大小和最大并发数
//       parallel: 3, // 减少并发数以降低网络压力
//       partSize: 5 * 1024 * 1024, // 5MB per part
//       // 增加重试机制
//       // 设置更长的超时时间
//       timeout: 300000 // 10分钟超时
//     });

//     console.log('ha 上传结果: ', result);

//     console.log('hashpath 上传结果: ', result.etag);

//     // 验证上传结果
//     const head = await client.head(`files/uploaded/Chunks/${hashpath}/${hash}`);
//     console.log('文件头信息:', head);

//     return result;
//   } catch (e: any) {
//     // 捕获超时异常。
//     if (e.code === 'ConnectionTimeoutError' || e.code === 'ResponseTimeoutError') {
//       console.log('TimeoutError', e.message);
//       throw new Error(`上传超时: ${e.message}`);
//     }
//     console.log('上传错误:', e);
//     throw new Error(`上传错误: ${e.message}`);
//   }
// }

//合并分片
// export async function completeMultipartUpload(fileName: string, hashpath: string, hash: string, chunkNumber: number) {


//   const result = await client.completeMultipartUpload()


//   const result2 = await client.initMultipartUpload()


// }