import { NextRequest } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path, { join } from 'path';
import { db } from '@/db/db';
import { multipartUpload, initMultipartUpload } from '../utils';

export const api = {
  bodyParser: { sizeLimit: '10mb' }
};

const UPLOAD_DIR = join(process.cwd(), 'server', 'uploads');

// 确保临时目录存在
async function ensureTempDir(fileNameHash: string) {
  const fileDir = join(UPLOAD_DIR, fileNameHash);
  if (!existsSync(fileDir)) {
    await mkdir(fileDir, { recursive: true });
  }
  return fileDir;
}

export async function POST(request: NextRequest) {
  try {
    // 获取上传的表单数据
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File | null;
    const chunkIndex = formData.get('chunkIndex') as string | null;
    const fileName = formData.get('fileName') as string | null;
    const fileNameHash = formData.get('fileNameHash') as string | null;
    const chunkHash = formData.get('chunkHash') as string | null;
    const fileSize = formData.get('fileSize') as string | null;
    const lastModified = formData.get('lastModified') as string | null;

    // 验证必要参数
    if (!chunk || !chunkIndex || !fileName || !fileSize || !lastModified) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: chunk, chunkIndex, fileName, fileSize, lastModified' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('-----chunk: ', chunk)
    console.log('------chunkIndex: ', chunkIndex)
    console.log('-----fileName: ', fileName)
    console.log('-----fileNameHash: ', fileNameHash)
    console.log('-----chunkHash: ', chunkHash)
    console.log('-----fileSize: ', fileSize)
    console.log('-----lastModified: ', lastModified)

    if (!fileNameHash) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: fileNameHash' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 如果是第一个分片，同时创建文件记录并初始化分片上传任务
    let uploadId: string | null = null;
    try {
      const existingFile = await db.file.findUnique({
        where: { hash: fileNameHash }
      });

      if (!existingFile) {
        // 初始化分片上传任务
        const mergedFileKey = `files/uploaded/merge/${fileName}`;
        const multipartUploadResult = await initMultipartUpload(mergedFileKey);
        uploadId = multipartUploadResult.uploadId;

        try {
          await db.file.create({
            data: {
              filename: fileName,
              hash: fileNameHash,
              size: parseInt(fileSize),
              lastModified: BigInt(parseInt(lastModified)),
              uploadId: uploadId
            }
          });
        } catch (createError) {
          // 处理并发创建的情况 - 如果是唯一约束错误，则忽略
          if (createError instanceof Error && 'code' in createError && createError.code === 'P2002') {
            // 获取已创建的文件记录
            const fileRecord = await db.file.findUnique({
              where: { hash: fileNameHash }
            });
            uploadId = fileRecord?.uploadId || null;
          } else {
            throw createError;
          }
        }
      } else {
        // 复用已存在的uploadId
        uploadId = existingFile.uploadId;
      }
    } catch (error) {
      console.error('创建文件记录时出错:', error);
      // 如果是唯一约束错误，尝试获取已存在的记录
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        const existingFile = await db.file.findUnique({
          where: { hash: fileNameHash }
        });
        uploadId = existingFile?.uploadId || null;
      } else {
        throw error;
      }
    }

    // 检查是否缺少uploadId（理论上不应该发生）
    if (!uploadId) {
      return new Response(
        JSON.stringify({ error: 'Missing uploadId for multipart upload' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 构造分片在OSS中的路径（最终合并后的文件路径）
    const mergedFileKey = `files/uploaded/merge/${fileName}`;

    // 上传分片到OSS
    const uploadResult = await multipartUpload(
      mergedFileKey,
      uploadId,
      parseInt(chunkIndex) + 1, // partNumber从1开始
      chunk
    );

    // 将分片信息保存到数据库
    try {
      await db.chunk.create({
        data: {
          index: parseInt(chunkIndex),
          hash: chunkHash || '',
          fileNameHash: fileNameHash,
          etag: uploadResult.etag
        }
      });
    } catch (chunkError) {
      // 处理重复分片的情况 - 如果是唯一约束错误，则忽略
      if (!(chunkError instanceof Error && 'code' in chunkError && chunkError.code === 'P2002')) {
        throw chunkError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Chunk ${chunkIndex} received successfully.`,
        uploadId: uploadId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload error:', error);
    // 如果是multipartUpload错误，则返回特定的错误信息
    if (error instanceof Error && error.message.includes('上传错误')) {
      return new Response(
        JSON.stringify({ error: `Failed to upload chunk to OSS: ${error.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to upload chunk' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 禁用默认的GET方法
export async function GET() {
  return new Response('Method not allowed', { status: 405 });
}