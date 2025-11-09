// utils/uploadFile.ts
import { cutFile } from './cutFile';
import { getUploadedChunks } from './getUploadedChunks';

/**
 * 处理文件上传的核心逻辑
 * @param file 要上传的文件
 */
export async function handleFileUpload(file: File): Promise<void> {
  const chunkSize = 1024 * 1024; // 1MB
  const totalChunks = Math.ceil(file.size / chunkSize);

  // 1. 先查询已上传的片段数量
  const uploadedChunks = await getUploadedChunks(file.name);

  const uploadPromises = [];
  // 2. 从已上传的下一个片段开始上传
  for (let i = uploadedChunks; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', i.toString());
    formData.append('fileName', file.name);

    uploadPromises.push(
      fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
    );
  }

  // 3. 等待所有片段上传完成
  await Promise.all(uploadPromises);

  // 4. 通知服务器合并文件
  await fetch('/api/merge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fileName: file.name,
      totalChunks: totalChunks
    })
  });

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