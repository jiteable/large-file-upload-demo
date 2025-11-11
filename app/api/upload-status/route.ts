import { NextRequest } from "next/server";
import { readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { fileNameHash } = await request.json();

    if (!fileNameHash) {
      return new Response(
        JSON.stringify({ error: 'Missing fileNameHash' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tempDir = join(process.cwd(), 'server', 'uploads', fileNameHash);

    // 如果目录不存在，说明还没有任何分片上传
    if (!existsSync(tempDir)) {
      return new Response(
        JSON.stringify({ uploadedChunks: 0, uploadedChunkIndices: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 读取目录中的所有文件
    const files = await readdir(tempDir);

    // 过滤出当前文件的分片并提取索引
    const chunkIndices: number[] = [];
    const chunkFiles = files.filter(file => {
      if (file.includes('.part')) {
        const match = file.match(/\.part(\d+)$/);
        if (match) {
          chunkIndices.push(parseInt(match[1]));
          return true;
        }
      }
      return false;
    });

    // 返回分片数量和具体的分片索引数组
    return new Response(
      JSON.stringify({
        uploadedChunks: chunkFiles.length,
        uploadedChunkIndices: chunkIndices.sort((a, b) => a - b) // 升序
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting uploaded chunks:', error);
    return new Response(
      JSON.stringify({ uploadedChunks: 0, uploadedChunkIndices: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}