"use client"

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            文件上传演示
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            测试大文件上传功能，可以选择创建测试文件、上传本地文件或查看已上传文件
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link href="/home/createfile" className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">创建测试文件</h2>
              <p className="text-gray-600 mb-6">
                创建指定大小的测试文件用于上传测试
              </p>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300">
                前往创建文件
              </button>
            </div>
          </Link>

          <Link href="/home/uploadfile" className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="p-1 bg-gradient-to-r from-green-500 to-teal-600"></div>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">上传本地文件</h2>
              <p className="text-gray-600 mb-6">
                上传本地的大文件，支持断点续传
              </p>
              <button className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-300">
                前往上传文件
              </button>
            </div>
          </Link>

          <Link href="/home/uploaded" className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="p-1 bg-gradient-to-r from-orange-500 to-red-600"></div>
            <div className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">查看上传文件</h2>
              <p className="text-gray-600 mb-6">
                查看和管理已上传的文件
              </p>
              <button className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors duration-300">
                查看文件列表
              </button>
            </div>
          </Link>
        </div>

        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} 大文件上传演示. 使用 Next.js 和 React 构建.</p>
        </footer>
      </div>
    </div>
  );
}