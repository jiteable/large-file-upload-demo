/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { db } from '@/db/db';
import { ossClient } from '@/lib/oss';

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

    // 从数据库获取文件记录和所有分片信息
    const fileRecord = await db.file.findUnique({
      where: { hash: fileNameHash }
    });

    if (!fileRecord) {
      return new Response(
        JSON.stringify({ error: 'File record not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 从数据库获取所有分片信息
    const chunkRecords = await db.chunk.findMany({
      where: {
        fileNameHash: fileNameHash
      },
      orderBy: {
        index: 'asc'
      }
    });

    // 验证分片数量
    if (chunkRecords.length !== totalChunks) {
      return new Response(
        JSON.stringify({
          error: `Expected ${totalChunks} chunks, but found ${chunkRecords.length}`,
          details: {
            expectedChunks: totalChunks,
            actualChunks: chunkRecords.length,
            uploadedChunks: chunkRecords.map(c => c.index)
          }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 构造合并后文件在OSS中的路径，使用fileNameHash确保唯一性
    const mergedFileKey = `files/uploaded/merge/${fileNameHash}/${fileName}`;

    // 存储所有分片的etag信息，用于最后完成合并
    const parts = chunkRecords.map((chunk) => ({
      number: chunk.index + 1, // partNumber 从1开始
      etag: chunk.etag        // 使用之前保存的ETag
    }));

    // 完成分片上传，合并成完整文件
    // 注意：这里不再调用initMultipartUpload，而是直接使用已有的uploadId
    await ossClient.completeMultipartUpload(mergedFileKey, fileRecord.uploadId!, parts);

    // 更新数据库中的文件记录并删除分片记录
    const updatedFile = await db.file.update({
      where: { hash: fileNameHash },
      data: {
        uploaded: true,
        mergedAt: new Date(),
        path: mergedFileKey, // 存储OSS中的路径
      }
    });

    // 删除分片记录
    await db.chunk.deleteMany({
      where: { fileNameHash: fileNameHash }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `File merged successfully: ${fileName}`,
        filePath: mergedFileKey
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Merge error:', error);

    // 处理OSS特定错误
    if (error.code) {
      return new Response(
        JSON.stringify({
          error: 'Failed to merge file chunks',
          details: `OSS Error ${error.code}: ${error.message}`
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to merge file chunks',
        details: error.message || 'Unknown error occurred during merge process'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 禁用默认的GET方法
export async function GET() {
  return new Response('Method not allowed', { status: 405 });
}