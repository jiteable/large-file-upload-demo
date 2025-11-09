"use client"

import FileUpload from "@/component/upload";
import CreateFile from "@/component/createFile";
import { useState } from "react";

export default function Home() {
  const [createdFile, setCreatedFile] = useState<File | null>(null);

  const handleFileCreated = (file: File) => {
    setCreatedFile(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            文件上传演示
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            测试大文件上传功能，可以创建测试文件或上传本地文件
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 创建虚假文件组件 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <div className="p-6">
              <CreateFile onFileCreated={handleFileCreated} />
            </div>
          </div>

          {/* 文件上传组件 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-1 bg-gradient-to-r from-green-500 to-teal-600"></div>
            <div className="p-6">
              <FileUpload initialFile={createdFile} />
            </div>
          </div>
        </div>

        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} 大文件上传演示. 使用 Next.js 和 React 构建.</p>
        </footer>
      </div>
    </div>
  );
}
