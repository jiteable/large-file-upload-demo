"use client";

import React, { useState, useRef, ChangeEvent } from 'react';
import { handleFileUpload } from '@/utils/uploadFile';
import { Progress } from '@/components/ui/progress';

interface FileUploadProps {
  initialFile?: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ initialFile = null }) => {
  const [file, setFile] = useState<File | null>(() => initialFile);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setUploadStatus('');
  };

  const handleUpload = () => {
    if (!file) {
      setUploadStatus('请选择一个文件');
      return;
    }

    setUploadStatus('上传中...');
    setUploadProgress(0);
    setIsPaused(false);

    // 创建 AbortController 用于控制请求的中止
    const controller = new AbortController();
    uploadControllerRef.current = controller;

    // 在点击上传按钮时才开始真正的上传过程
    handleFileUpload(file, setUploadProgress, controller.signal)
      .then(() => {
        setUploadStatus('上传成功!');
        setUploadProgress(100);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setFile(null);
        uploadControllerRef.current = null;
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          setUploadStatus('上传已暂停');
        } else {
          console.error('文件处理出错:', error);
          setUploadStatus(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
        uploadControllerRef.current = null;
      });
  };

  const handlePause = () => {
    if (uploadControllerRef.current) {
      uploadControllerRef.current.abort();
      setIsPaused(true);
      setUploadStatus('上传已暂停');
    }
  };

  const handleResume = () => {
    if (file) {
      setUploadStatus('上传中...');
      setIsPaused(false);

      // 创建新的 AbortController
      const controller = new AbortController();
      uploadControllerRef.current = controller;

      // 重新开始上传过程
      handleFileUpload(file, setUploadProgress, controller.signal)
        .then(() => {
          setUploadStatus('上传成功!');
          setUploadProgress(100);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setFile(null);
          uploadControllerRef.current = null;
        })
        .catch(error => {
          if (error.name === 'AbortError') {
            setUploadStatus('上传已暂停');
          } else {
            console.error('文件处理出错:', error);
            setUploadStatus(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
          }
          uploadControllerRef.current = null;
        });
    }
  };

  const handleCancel = () => {
    if (uploadControllerRef.current) {
      uploadControllerRef.current.abort();
    }
    setFile(null);
    setUploadStatus('');
    setIsPaused(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">文件上传</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="file-upload-input" className="block text-sm font-medium text-gray-700 mb-1">
            选择文件
          </label>
          <input
            id="file-upload-input"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        {file && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">已选择文件:</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">名称:</span> {file.name}</p>
              <p><span className="font-medium">大小:</span> {Math.round(file.size / 1024)} KB</p>
              <p><span className="font-medium">类型:</span> {file.type || 'N/A'}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {!isPaused ? (
            <>
              <button
                onClick={handleUpload}
                disabled={uploadStatus === '上传中...'}
                className={`px-5 py-2 rounded-md font-medium ${uploadStatus === '上传中...'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
              >
                上传
              </button>
              {uploadStatus === '上传中...' && (
                <button
                  onClick={handlePause}
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md font-medium"
                >
                  暂停
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleResume}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium"
            >
              继续
            </button>
          )}
          <button
            onClick={handleCancel}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium text-gray-700"
          >
            取消
          </button>
        </div>

        {uploadStatus && (
          <div className={`p-3 rounded-md text-sm ${uploadStatus.includes('成功')
            ? 'bg-green-100 text-green-700'
            : uploadStatus.includes('暂停')
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
            }`}>
            {uploadStatus}
          </div>
        )}

        {uploadStatus === '上传中...' && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-center text-sm text-gray-600">{Math.round(uploadProgress)}%</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;