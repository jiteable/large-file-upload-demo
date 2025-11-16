"use client";

import FileUpload from "@/components/upload";
import Link from "next/link";

export default function UploadFilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <Link href="/" className="inline-block text-blue-600 hover:text-blue-800 mb-4">&larr; 返回首页</Link>
        </header>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden mx-auto max-w-2xl">
          <div className="p-1 bg-gradient-to-r from-green-500 to-teal-600"></div>
          <div className="p-6">
            <FileUpload />
          </div>
        </div>

        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} 大文件上传演示. 使用 Next.js 和 React 构建.</p>
        </footer>
      </div>
    </div>
  );
}