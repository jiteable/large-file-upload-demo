import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// 确保临时目录存在
async function ensureTempDir() {
  const tempDir = join(process.cwd(), 'tmp', 'uploads');
  if (!existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true });
  }
  return tempDir;
}

export async function POST(request: NextRequest) {
  try {
    // 获取上传的表单数据
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File | null;
    const chunkIndex = formData.get('chunkIndex') as string | null;
    const fileName = formData.get('fileName') as string | null;

    // 验证必要参数
    if (!chunk || !chunkIndex || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: chunk, chunkIndex, fileName' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 确保临时目录存在
    const tempDir = await ensureTempDir();

    // 构造分片文件路径
    const chunkFileName = `${fileName}.part${chunkIndex}`;
    const chunkFilePath = join(tempDir, chunkFileName);

    // 将分片写入磁盘
    const bytes = await chunk.arrayBuffer();
    await writeFile(chunkFilePath, new Uint8Array(bytes));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Chunk ${chunkIndex} uploaded successfully`
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