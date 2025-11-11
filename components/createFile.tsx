// component/createFile.tsx
"use client";

import React, { useState } from 'react';
import { createFakeFile, downloadFile } from '@/utils/createFakeFile';

interface CreateFileProps {
  onFileCreated: (file: File) => void;
}

const CreateFile: React.FC<CreateFileProps> = ({ onFileCreated }) => {
  const [fileName, setFileName] = useState<string>('fake-file.txt');
  const [fileSize, setFileSize] = useState<number>(1);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');

  const handleCreateFile = () => {
    if (fileSize <= 0) {
      setStatus('文件大小必须大于0');
      return;
    }

    setIsCreating(true);
    setStatus('正在创建文件...');

    try {
      // 使用setTimeout避免阻塞UI
      setTimeout(() => {
        const fakeFile = createFakeFile(fileSize, fileName);
        onFileCreated(fakeFile);

        // 提供下载选项
        downloadFile(fakeFile);

        setStatus(`成功创建 ${fileSize}MB 的文件: ${fileName}。文件已开始下载，请保存到 testFile 文件夹。`);
        setIsCreating(false);
      }, 100);
    } catch (error) {
      setStatus(`创建文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">创建测试文件</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
            文件名
          </label>
          <input
            id="fileName"
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入文件名"
          />
        </div>

        <div>
          <label htmlFor="fileSize" className="block text-sm font-medium text-gray-700 mb-1">
            文件大小 (MB)
          </label>
          <input
            id="fileSize"
            type="number"
            min="1"
            value={fileSize}
            onChange={(e) => setFileSize(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={handleCreateFile}
          disabled={isCreating}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${isCreating
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
        >
          {isCreating ? '创建中...' : '创建并下载文件'}
        </button>

        {status && (
          <div className={`p-3 rounded-md text-sm ${status.includes('成功')
            ? 'bg-green-100 text-green-700'
            : status.includes('失败') || status.includes('必须大于0')
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
            }`}>
            {status}
          </div>
        )}

        <div className="text-xs text-gray-500 mt-2">
          <p>提示：创建的文件会自动下载，请在浏览器下载设置中选择保存到 testFile 文件夹</p>
        </div>
      </div>
    </div>
  );
};

export default CreateFile;