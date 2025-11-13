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

    // 打印文件信息
    if (selectedFile) {
      console.log('文件信息:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        lastModified: selectedFile.lastModified
      });
    }
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            选择文件
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                </svg>
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">点击上传</span> 或拖拽文件到此处
                </p>
                <p className="text-xs text-gray-500">
                  支持任意格式文件
                </p>
              </div>
              <input
                id="file-upload-input"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {file && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-700 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              已选择文件:
            </h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p className="flex items-center">
                <span className="font-medium w-16">名称:</span>
                <span className="truncate ml-2" title={file.name}>{file.name}</span>
              </p>
              <p><span className="font-medium w-16 inline-block">大小:</span> {Math.round(file.size / 1024)} KB</p>
              <p><span className="font-medium w-16 inline-block">类型:</span> {file.type || 'N/A'}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          {!isPaused ? (
            <>
              <button
                onClick={handleUpload}
                disabled={uploadStatus === '上传中...'}
                className={`px-5 py-2 rounded-md font-medium flex items-center ${uploadStatus === '上传中...'
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-shadow duration-300'
                  }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                上传
              </button>
              {uploadStatus === '上传中...' && (
                <button
                  onClick={handlePause}
                  className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md font-medium flex items-center shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  暂停
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleResume}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium flex items-center shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              继续
            </button>
          )}
          <button
            onClick={handleCancel}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium text-gray-700 flex items-center shadow hover:shadow-md transition-shadow duration-300"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            取消
          </button>
        </div>

        {uploadStatus && (
          <div className={`p-3 rounded-md text-sm flex items-center ${uploadStatus.includes('成功')
              ? 'bg-green-100 text-green-700'
              : uploadStatus.includes('暂停')
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
            {uploadStatus.includes('成功') && (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            )}
            {uploadStatus.includes('暂停') && (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            )}
            {(!uploadStatus.includes('成功') && !uploadStatus.includes('暂停')) && (
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            )}
            {uploadStatus}
          </div>
        )}

        {uploadStatus === '上传中...' && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full h-2.5" />
            <p className="text-center text-sm text-gray-600">{Math.round(uploadProgress)}%</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;