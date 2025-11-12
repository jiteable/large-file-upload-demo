import { NextRequest } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path, { join } from 'path';
import { db } from '@/db/db';
import { multipartUpload } from '../utils';

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

    // 确保临时目录存在
    await ensureTempDir(fileNameHash);

    // 构造分片文件路径
    const chunkFileName = `${chunkHash}.part${chunkIndex}`;

    // 只有当multipartUpload成功上传时才继续后续操作
    await multipartUpload(fileNameHash, chunkFileName!, chunk)

    // 如果是第一个分片，同时创建文件记录
    try {
      const existingFile = await db.file.findUnique({
        where: { hash: fileNameHash }
      });

      if (!existingFile) {
        await db.file.create({
          data: {
            filename: fileName,
            hash: fileNameHash,
            size: parseInt(fileSize),
            lastModified: BigInt(parseInt(lastModified)),
          }
        });
      }
    } catch (error) {
      // 忽略唯一约束错误，因为可能在并发请求中已经被创建了
      if (error instanceof Error && 'code' in error && error.code !== 'P2002') {
        throw error;
      }
    }

    // 将分片信息保存到数据库
    await db.chunk.create({
      data: {
        index: parseInt(chunkIndex),
        hash: chunkHash || '',
        fileNameHash: fileNameHash,
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Chunk ${chunkIndex} received successfully.`,
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