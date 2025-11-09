/* eslint-disable @typescript-eslint/no-explicit-any */
import { getUploadedChunks } from './getUploadedChunks';
import { calculateChunkHash } from './calculateChunkHash';

/**
 * 控制并发上传的函数
 * @param tasks 上传任务数组
 * @param limit 最大并发数
 */
async function uploadWithConcurrencyLimit(tasks: (() => Promise<any>)[], limit: number): Promise<void> {
  const executing: Promise<any>[] = [];

  for (const task of tasks) {
    const promise = task().then(() => {
      // 任务完成后从执行队列中移除
      executing.splice(executing.indexOf(promise), 1);
    });

    executing.push(promise);

    // 如果当前执行的任务数达到限制，则等待其中一个完成
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  // 等待所有剩余的任务完成
  await Promise.all(executing);
}

/**
 * 处理文件上传的核心逻辑
 * @param file 要上传的文件
 */
export async function handleFileUpload(file: File): Promise<void> {
  const chunkSize = 1024 * 1024; // 1MB
  const totalChunks = Math.ceil(file.size / chunkSize);
  const MAX_CONCURRENT_REQUESTS = 6; // 最大并发请求数

  // 1. 先查询已上传的片段数量
  // const uploadedChunks = await getUploadedChunks(file.name);
  const uploadedChunks = 0;

  // 存储所有上传任务
  const uploadTasks: (() => Promise<any>)[] = [];

  // 2. 从已上传的下一个片段开始创建上传任务
  for (let i = uploadedChunks; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    // 将任务创建包装在闭包中，确保每个任务使用正确的变量
    const createUploadTask = async () => {
      // 计算分片哈希
      const chunkHash = await calculateChunkHash(chunk, i, totalChunks, chunkSize);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', i.toString());
      formData.append('fileName', file.name);
      formData.append('chunkHash', chunkHash); // 传递哈希值

      console.log(`开始上传分片 ${i}:`);
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value);
      }

      // 执行上传请求
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`分片 ${i} 上传失败: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`分片 ${i} 上传成功:`, result.message);
      return result;
    };

    uploadTasks.push(createUploadTask);
  }

  try {
    // 3. 使用并发控制执行所有上传任务
    await uploadWithConcurrencyLimit(uploadTasks, MAX_CONCURRENT_REQUESTS);
    console.log('所有分片上传完成');

    // 4. 通知服务器合并文件
    const mergeResponse = await fetch('/api/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: file.name,
        totalChunks: totalChunks
      })
    });

    if (!mergeResponse.ok) {
      throw new Error('Failed to merge file chunks');
    }

    const mergeResult = await mergeResponse.json();
    console.log('文件合并成功:', mergeResult.message);
  } catch (error) {
    console.error('上传过程中出错:', error);
    throw error;
  }

  console.log('文件上传成功！');
}

/**
 * 读取并打印文件内容（仅适用于文本文件）
 * @param fileToRead 要读取的文件
 */
export function printFileContent(fileToRead: File): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    if (fileToRead.type.startsWith('text/') || fileToRead.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        console.log('文件内容:', content);
        resolve(content);
      };
      reader.onerror = (e) => {
        console.error('读取文件出错:', e);
        reject(e);
      };
      reader.readAsText(fileToRead);
    } else {
      console.log('非文本文件，无法直接显示内容');
      resolve(undefined);
    }
  });
}