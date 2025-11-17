/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { db } from '@/db/db';
import { genSuccessData, genErrorData } from '@/app/api/utils/gen-res-data';

// 自定义 JSON 序列化函数来处理 BigInt
function serialize(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

export async function POST(request: NextRequest) {
  try {
    const { fileNameHash, uploadChunks } = await request.json();

    if (!fileNameHash) {
      return new Response(
        serialize(genErrorData('Missing fileNameHash')),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 更新数据库中的uploadChunks字段
    const updatedFile = await db.file.update({
      where: {
        hash: fileNameHash
      },
      data: {
        uploadChunks: uploadChunks
      }
    });

    // 转换 BigInt 字段为字符串
    const serializedFile = {
      ...updatedFile,
      lastModified: updatedFile.lastModified.toString()
    };

    return new Response(
      serialize(genSuccessData({
        message: 'Upload progress updated successfully',
        file: serializedFile
      })),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating upload progress:', error);

    // 如果是记录不存在的错误
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return new Response(
        serialize(genErrorData('File record not found')),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      serialize(genErrorData('Failed to update upload progress')),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}