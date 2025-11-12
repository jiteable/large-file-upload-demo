export function cutFile(file: File) {

  const chunkSize = 5 * 1024 * 1024; // 1MB
  const chunks = [];
  const totalChunks = Math.ceil(file.size / chunkSize);
  for (let i = 0; i < file.size; i += chunkSize) {
    const chunk = file.slice(i, i + chunkSize);
    chunks.push(chunk);
  }

  return { chunks, totalChunks }
}