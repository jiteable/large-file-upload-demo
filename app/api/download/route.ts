/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { db } from '@/db/db';
import { getStream } from '../utils';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

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
    const result = await getStream(file.path);

    // 设置响应头
    const headers = new Headers();
    headers.append('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
    headers.append('Content-Type', 'application/octet-stream');
    headers.append('Content-Length', (result.res.headers as Record<string, string>)['content-length'] || '0');

    // 对于Node.js Readable流，我们需要将其转换为Web ReadableStream
    const nodeStream = result.stream;

    // 创建Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: any) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        nodeStream.on('end', () => {
          controller.close();
        });

        nodeStream.on('error', (err: any) => {
          controller.error(err);
        });
      },

      cancel() {
        nodeStream.destroy();
      }
    });

    // 返回文件流
    return new Response(webStream, {
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