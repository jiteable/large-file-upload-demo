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

export async function GET(request: NextRequest) {
  try {
    // 从数据库获取所有已上传的文件，按创建时间倒序排列
    const files = await db.file.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 转换 BigInt 字段为字符串
    const serializedFiles = files.map(file => ({
      ...file,
      lastModified: file.lastModified.toString()
    }));

    return new Response(
      serialize(genSuccessData({ files: serializedFiles })),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取文件列表失败:', error);
    return new Response(
      serialize(genErrorData('获取文件列表失败')),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}