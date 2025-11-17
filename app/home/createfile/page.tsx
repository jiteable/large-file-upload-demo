"use client";

import CreateFile from "@/components/createFile";
import { useState } from "react";

export default function CreateFilePage() {
  const [createdFile, setCreatedFile] = useState<File | null>(null);

  const handleFileCreated = (file: File) => {
    setCreatedFile(file);
  };

  return (
    <div className="py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            创建测试文件
          </h1>
        </header>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden mx-auto max-w-md">
          <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <div className="p-6">
            <CreateFile onFileCreated={handleFileCreated} />
          </div>
        </div>

        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} 大文件上传演示. 使用 Next.js 和 React 构建.</p>
        </footer>
      </div>
    </div>
  );
}