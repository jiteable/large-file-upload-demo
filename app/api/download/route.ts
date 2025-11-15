/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { db } from '@/db/db';
import { ossClient } from '@/lib/oss';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return new Response('Missing file id parameter', { status: 400 });
    }

    // 从数据库获取文件信息
    const file = await db.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return new Response('File not found', { status: 404 });
    }

    if (!file.uploaded || !file.path) {
      return new Response('File not available for download', { status: 400 });
    }

    // 从OSS获取文件流
    const result = await ossClient.get(file.path);

    // 设置响应头
    const headers = new Headers();
    headers.append('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    headers.append('Content-Type', (result.res.headers as Record<string, string>)['content-type'] || 'application/octet-stream');

    // 返回文件流
    return new Response(result.content, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('Download error:', error);

    if (error.code === 'NoSuchKey') {
      return new Response('File not found in storage', { status: 404 });
    }

    return new Response('Failed to download file', { status: 500 });
  }
}