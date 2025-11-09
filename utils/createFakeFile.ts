export const createFakeFile = (sizeMB: number, fileName: string) => {
  const chunkSize = 65536; // 浏览器API限制的最大值
  const chunks = [];

  // 计算总字节数
  const totalBytes = sizeMB * 1024 * 1024;
  let remainingBytes = totalBytes;

  while (remainingBytes > 0) {
    const currentChunkSize = Math.min(chunkSize, remainingBytes);
    const randomBuffer = new Uint8Array(currentChunkSize);
    crypto.getRandomValues(randomBuffer);
    chunks.push(randomBuffer);
    remainingBytes -= currentChunkSize;
  }

  return new File(chunks, fileName, { type: "application/octet-stream" });
};

// 下载文件函数
export const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
