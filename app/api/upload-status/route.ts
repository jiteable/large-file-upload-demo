import { NextRequest } from 'next/server';
import { db } from '../../../db/db';
import { genSuccessData, genErrorData } from '@/app/api/utils/gen-res-data';

export async function POST(request: NextRequest) {
  try {
    const { fileNameHash } = await request.json();

    if (!fileNameHash) {
      return new Response(
        JSON.stringify(genErrorData('Missing fileNameHash')),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 从数据库查询已上传的分片信息
    const uploadedChunks = await db.chunk.findMany({
      where: {
        fileNameHash: fileNameHash
      },
      select: {
        index: true
      },
      orderBy: {
        index: 'asc'
      }
    });

    const chunkIndices = uploadedChunks.map(chunk => chunk.index);

    // 返回分片数量和具体的分片索引数组
    return new Response(
      JSON.stringify(genSuccessData({
        uploadedChunks: chunkIndices.length,
        uploadedChunkIndices: chunkIndices
      })),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error getting uploaded chunks:', error);
    return new Response(
      JSON.stringify(genSuccessData({ uploadedChunks: 0, uploadedChunkIndices: [] })),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}