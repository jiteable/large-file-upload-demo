import { NextRequest } from 'next/server';
import { writeFile, mkdir, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { rm } from 'fs/promises';
import { db } from '@/db/db';

const UPLOADS_DIR = join(process.cwd(), 'server', 'uploads');
const MERGE_DIR = join(process.cwd(), 'server', 'merge');

// 确保合并目录存在
async function ensureMergeDir() {
  if (!existsSync(MERGE_DIR)) {
    await mkdir(MERGE_DIR, { recursive: true });
  }
  return MERGE_DIR;
}

// 读取文件元数据
async function readFileMetadata(sourceDir: string) {
  try {
    const metadataPath = join(sourceDir, 'metadata.json');
    if (existsSync(metadataPath)) {
      const metadataContent = await readFile(metadataPath, 'utf8');
      return JSON.parse(metadataContent);
    }
    return null;
  } catch (error) {
    console.error('Error reading metadata:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 获取请求体中的数据
    const { fileName, fileNameHash, totalChunks } = await request.json();

    // 验证必要参数
    if (!fileName || !fileNameHash || totalChunks === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileName, fileNameHash, totalChunks' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 确保合并目录存在
    await ensureMergeDir();

    // 构建源文件夹路径
    const sourceDir = join(UPLOADS_DIR, fileNameHash);

    // 检查源文件夹是否存在
    if (!existsSync(sourceDir)) {
      return new Response(
        JSON.stringify({ error: `Source directory does not exist: ${sourceDir}` }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 读取文件元数据
    const fileMetadata = await readFileMetadata(sourceDir);

    // 读取分片文件列表
    const chunkFiles = await readdir(sourceDir);

    // 过滤出真正的分片文件（排除metadata.json和其他非分片文件）
    const actualChunkFiles = chunkFiles.filter(file => file.includes('.part'));

    // 验证分片数量
    if (actualChunkFiles.length !== totalChunks) {
      return new Response(
        JSON.stringify({
          error: `Expected ${totalChunks} chunks, but found ${actualChunkFiles.length}`,
          details: {
            expectedChunks: totalChunks,
            actualChunks: actualChunkFiles.length,
            uploadedChunks: actualChunkFiles
          }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 按照分片索引排序
    actualChunkFiles.sort((a, b) => {
      const indexA = parseInt(a.match(/\.part(\d+)$/)?.[1] || '0');
      const indexB = parseInt(b.match(/\.part(\d+)$/)?.[1] || '0');
      return indexA - indexB;
    });

    // 确定最终文件名（处理同名文件）
    let finalFileName = fileName;
    let counter = 1;
    const nameWithoutExtension = fileName.lastIndexOf('.') > 0
      ? fileName.substring(0, fileName.lastIndexOf('.'))
      : fileName;
    const extension = fileName.lastIndexOf('.') > 0
      ? fileName.substring(fileName.lastIndexOf('.'))
      : '';

    while (existsSync(join(MERGE_DIR, finalFileName))) {
      finalFileName = extension
        ? `${nameWithoutExtension}(${counter})${extension}`
        : `${fileName}(${counter})`;
      counter++;
    }

    // 合并文件
    const mergedFilePath = join(MERGE_DIR, finalFileName);

    // 逐个读取分片并写入目标文件
    for (const chunkFile of actualChunkFiles) {
      const chunkFilePath = join(sourceDir, chunkFile);
      const chunkData = await readFile(chunkFilePath);

      // 追加写入到合并文件
      await writeFile(mergedFilePath, chunkData, { flag: 'a' });
    }

    // 删除临时文件夹
    await rm(sourceDir, { recursive: true });

    // 更新数据库中的文件记录并删除分片记录
    const updatedFile = await db.file.update({
      where: { hash: fileNameHash },
      data: {
        uploaded: true,
        mergedAt: new Date(),
        path: mergedFilePath,
      }
    });

    // 删除分片记录
    await db.chunk.deleteMany({
      where: { fileNameHash: fileNameHash }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `File merged successfully: ${finalFileName}`,
        filePath: mergedFilePath,
        metadata: fileMetadata
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Merge error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to merge file chunks',
        details: (error as Error).message || 'Unknown error occurred during merge process'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 禁用默认的GET方法
export async function GET() {
  return new Response('Method not allowed', { status: 405 });
}