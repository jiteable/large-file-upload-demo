import { NextRequest } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path, { join } from 'path';
import { db } from '@/db/db';

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

// 保存或验证文件元数据
async function handleFileMetadata(fileDir: string, fileName: string, fileSize: number, lastModified: number) {
  const metadataPath = join(fileDir, 'metadata.json');

  // 如果元数据文件不存在，创建它
  if (!existsSync(metadataPath)) {
    const metadata = {
      fileName,
      fileSize,
      lastModified,
      createdAt: new Date().toISOString()
    };
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    return true;
  }

  // 如果元数据文件存在，验证它
  try {
    const metadataContent = await readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);

    // 验证文件名、大小和修改时间是否匹配
    if (metadata.fileName === fileName &&
      metadata.fileSize === fileSize &&
      metadata.lastModified === lastModified) {
      return true;
    }

    // 如果不匹配，说明是不同的文件
    return false;
  } catch (error) {
    console.error('Error reading metadata:', error);
    return false;
  }
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
    const fileDir = await ensureTempDir(fileNameHash);

    // 验证或保存文件元数据
    const isSameFile = await handleFileMetadata(
      fileDir,
      fileName,
      parseInt(fileSize),
      parseInt(lastModified)
    );

    if (!isSameFile) {
      return new Response(
        JSON.stringify({ error: 'File metadata mismatch. This appears to be a different file with the same name.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 构造分片文件路径
    const chunkFileName = `${chunkHash}.part${chunkIndex}`;
    const chunkFilePath = join(fileDir, chunkFileName);

    // 将分片写入磁盘
    const bytes = await chunk.arrayBuffer();
    await writeFile(chunkFilePath, new Uint8Array(bytes));

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


// // 确保临时目录存在
// const tempDir = await ensureTempDir();

// // 构造分片文件路径
// const chunkFileName = `${fileName}.part${chunkIndex}`;
// const chunkFilePath = join(tempDir, chunkFileName);

// // 将分片写入磁盘
// const bytes = await chunk.arrayBuffer();
// await writeFile(chunkFilePath, new Uint8Array(bytes));