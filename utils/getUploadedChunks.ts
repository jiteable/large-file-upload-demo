import { readdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

export async function getUploadedChunks(fileName: string): Promise<number> {
  try {
    const tempDir = join(process.cwd(), 'tmp', 'uploads');

    // 如果目录不存在，说明还没有任何分片上传
    if (!existsSync(tempDir)) {
      return 0;
    }

    // 读取目录中的所有文件
    const files = await readdir(tempDir);

    // 过滤出当前文件的分片
    const chunkFiles = files.filter(file =>
      file.startsWith(fileName) && file.includes('.part')
    );

    // 返回分片数量
    return chunkFiles.length;
  } catch (error) {
    console.error('Error getting uploaded chunks:', error);
    // 出错时返回0，重新开始上传
    return 0;
  }
}