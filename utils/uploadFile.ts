/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUploadedChunks } from './getUploadedChunks';
import { calculateChunkHash } from './calculateChunkHash';
import SparkMD5 from 'spark-md5';


/**
 * 计算文件名哈希
 * @param fileName 原始文件名
 * @param fileSize 文件大小
 * @param lastModified 文件最后修改时间
 * @returns 文件名哈希值
 */
function calculateFileNameHash(fileName: string, fileSize: number, lastModified: number): string {
  return SparkMD5.hash(`${fileName}-${fileSize}-${lastModified}`);
}
/**
 * 控制并发上传的函数
 * @param tasks 上传任务数组
 * @param limit 最大并发数
 * @param signal AbortSignal用于取消请求
 */
async function uploadWithConcurrencyLimit(tasks: (() => Promise<any>)[], limit: number, signal?: AbortSignal): Promise<void> {
  const taskPool: Promise<any>[] = [];

  for (const task of tasks) {
    // 检查是否已取消
    if (signal?.aborted) {
      throw new Error('Upload aborted');
    }

    const promise = task().then(() => {
      // 任务完成后从执行队列中移除
      taskPool.splice(taskPool.indexOf(promise), 1);
    });

    taskPool.push(promise);

    // 如果当前执行的任务数达到限制，则等待其中一个完成
    if (taskPool.length >= limit) {
      await Promise.race(taskPool);
    }
  }

  // 等待所有剩余的任务完成
  await Promise.all(taskPool);
}

/**
 * 处理文件上传的核心逻辑
 * @param file 要上传的文件
 * @param signal AbortSignal用于取消请求
 */
export async function handleFileUpload(file: File, setUploadProgress: (progress: number) => void, signal?: AbortSignal): Promise<void> {
  const chunkSize = 5 * 1024 * 1024; // 5MB
  const totalChunks = Math.ceil(file.size / chunkSize);
  const MAX_CONCURRENT_REQUESTS = 6; // 最大并发请求数
  let finish = 0

  // 计算文件名哈希（包含文件大小和最后修改时间）
  const fileNameHash = calculateFileNameHash(file.name, file.size, file.lastModified);

  // 1. 先查询已上传的片段数量和具体索引
  const { uploadedChunks, uploadedChunkIndices } = await getUploadedChunks(fileNameHash);

  console.log(`文件 ${file.name} 总共需要 ${totalChunks} 个分片`);
  console.log(`已上传 ${uploadedChunks} 个分片，索引为: [${uploadedChunkIndices.join(', ')}]`);

  // 存储所有上传任务
  const uploadTasks: (() => Promise<any>)[] = [];

  // 更新初始进度为已上传的分片比例
  setUploadProgress(Math.floor((uploadedChunks / totalChunks) * 100));

  // 2. 为所有未上传的分片创建上传任务
  let tasksCreated = 0;
  for (let i = 0; i < totalChunks; i++) {
    // 检查是否已取消
    if (signal?.aborted) {
      throw new Error('Upload aborted');
    }

    // 如果分片已经上传，则跳过
    if (uploadedChunkIndices.includes(i)) {
      console.log(`分片 ${i} 已上传，跳过`);
      continue;
    }

    tasksCreated++;
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    // 将任务创建包装在闭包中，确保每个任务使用正确的变量
    const createUploadTask = async () => {
      // 检查是否已取消
      if (signal?.aborted) {
        throw new Error('Upload aborted');
      }

      // 计算分片哈希
      const chunkHash = await calculateChunkHash(chunk, i, totalChunks, chunkSize);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', i.toString());
      formData.append('fileName', file.name);
      formData.append('fileNameHash', fileNameHash); // 传递文件名哈希值
      formData.append('chunkHash', chunkHash); // 传递哈希值
      formData.append('fileSize', file.size.toString()); // 传递文件大小
      formData.append('lastModified', file.lastModified.toString()); // 传递最后修改时间

      console.log(`开始上传分片 ${i}:`);
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      // 执行上传请求
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal // 添加signal参数
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`分片 ${i} 上传失败: ${errorText}`);
      }

      const result = await response.json();
      console.log(`分片 ${i} 上传成功:`, result.message);
      finish++
      // 使用setTimeout确保进度更新在下一个事件循环中执行
      setTimeout(() => {
        // 正确计算总进度：(已上传的分片 + 当前完成的分片) / 总分片数
        setUploadProgress(Math.floor(((uploadedChunks + finish) / totalChunks) * 100))
      }, 0)

      return result;
    };

    uploadTasks.push(createUploadTask);
  }

  console.log(`为文件 ${file.name} 创建了 ${tasksCreated} 个上传任务`);

  try {
    // 3. 使用并发控制执行所有上传任务
    await uploadWithConcurrencyLimit(uploadTasks, MAX_CONCURRENT_REQUESTS, signal);
    console.log('所有分片上传完成');

    // 检查是否已取消
    if (signal?.aborted) {
      throw new Error('Upload aborted');
    }

    // 4. 通知服务器合并文件
    console.log(`准备合并文件，期望 ${totalChunks} 个分片`);
    const mergeResponse = await fetch('/api/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: file.name,
        fileNameHash: fileNameHash,
        totalChunks: totalChunks
      }),
      signal // 添加signal参数
    });

    if (!mergeResponse.ok) {
      const errorText = await mergeResponse.text();
      throw new Error(`Failed to merge file chunks: ${errorText}`);
    }

    const mergeResult = await mergeResponse.json();
    console.log('文件合并成功:', mergeResult.message);
  } catch (error) {
    console.error('上传过程中出错:', error);
    if (signal?.aborted) {
      // 将AbortError转换为有name属性的错误
      const abortError = new Error('Upload aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }
    throw error;
  }

  console.log('文件上传成功！');
}


/**
 * 读取并打印文件内容（仅适用于文本文件）
 * @param fileToRead 要读取的文件
 */
// export function printFileContent(fileToRead: File): Promise<string | undefined> {
//   return new Promise((resolve, reject) => {
//     if (fileToRead.type.startsWith('text/') || fileToRead.name.endsWith('.txt')) {
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         const content = e.target?.result as string;
//         console.log('文件内容:', content);
//         resolve(content);
//       };
//       reader.onerror = (e) => {
//         console.error('读取文件出错:', e);
//         reject(e);
//       };
//       reader.readAsText(fileToRead);
//     } else {
//       console.log('非文本文件，无法直接显示内容');
//       resolve(undefined);
//     }
//   });
// }