import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path, { join } from 'path';

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

    // 验证必要参数
    if (!chunk || !chunkIndex || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: chunk, chunkIndex, fileName' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('-----chunk: ', chunk)
    console.log('------chunkIndex: ', chunkIndex)
    console.log('-----fileName: ', fileName)
    console.log('-----fileNameHash: ', fileNameHash)
    console.log('-----chunkHash: ', chunkHash)

    if (!fileNameHash) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: fileNameHash' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 确保临时目录存在
    const fileDir = await ensureTempDir(fileNameHash);

    // 构造分片文件路径
    const chunkFileName = `${chunkHash}`;
    const chunkFilePath = join(fileDir, chunkFileName);

    // 将分片写入磁盘

    const bytes = await chunk.arrayBuffer();
    await writeFile(chunkFilePath, new Uint8Array(bytes));

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