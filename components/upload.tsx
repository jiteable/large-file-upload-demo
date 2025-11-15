"use client";

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { handleFileUpload, calculateFileNameHash } from '@/utils/uploadFile';
import { Progress } from '@/components/ui/progress';

interface FileUploadProps {
  initialFile?: File | null;
}

interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  controller: AbortController | null;
}

interface DatabaseFile {
  id: string;
  filename: string;
  size: number;
  uploadChunks: number;
  totalChunks: number;
  uploaded: boolean;
  hash: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ initialFile = null }) => {
  const [file, setFile] = useState<File | null>(() => initialFile);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [incompleteUploads, setIncompleteUploads] = useState<DatabaseFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取未完成的上传任务
  useEffect(() => {
    const fetchIncompleteUploads = async () => {
      try {
        const response = await fetch('/api/files');
        const data = await response.json();

        if (data.success) {
          const incomplete = data.files.filter((file: DatabaseFile) => !file.uploaded);
          setIncompleteUploads(incomplete);
        }
      } catch (error) {
        console.error('获取未完成上传任务失败:', error);
      }
    };

    fetchIncompleteUploads();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);

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
      alert('请选择一个文件');
      return;
    }

    const taskId = `${file.name}-${Date.now()}`;
    const newTask: UploadTask = {
      id: taskId,
      file,
      progress: 0,
      status: 'pending',
      controller: null
    };

    setUploadTasks(prev => [...prev, newTask]);

    // 创建 AbortController 用于控制请求的中止
    const controller = new AbortController();

    // 更新任务状态为上传中
    setUploadTasks(prev => prev.map(task =>
      task.id === taskId
        ? { ...task, status: 'uploading', controller }
        : task
    ));

    // 计算文件名哈希
    const fileNameHash = calculateFileNameHash(file.name, file.size, file.lastModified);

    // 在点击上传按钮时才开始真正的上传过程
    handleFileUpload(
      file,
      (progress) => {
        setUploadTasks(prev => prev.map(task =>
          task.id === taskId
            ? { ...task, progress }
            : task
        ));
      },
      controller.signal,
      async (uploadedChunks) => {
        // 更新数据库中的进度
        try {
          await fetch('/api/update-progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileNameHash,
              uploadChunks: uploadedChunks
            })
          });
        } catch (error) {
          console.error('更新数据库进度失败:', error);
        }
      }
    )
      .then(() => {
        setUploadTasks(prev => prev.map(task =>
          task.id === taskId
            ? { ...task, status: 'completed', progress: 100 }
            : task
        ));
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setFile(null);
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          setUploadTasks(prev => prev.map(task =>
            task.id === taskId
              ? { ...task, status: 'paused' }
              : task
          ));
        } else {
          console.error('文件处理出错:', error);
          setUploadTasks(prev => prev.map(task =>
            task.id === taskId
              ? { ...task, status: 'failed' }
              : task
          ));
        }
      });
  };
  const handleResumeIncomplete = (dbFile: DatabaseFile) => {
    // 这里应该实现恢复未完成上传的逻辑
    // 由于我们无法从数据库重建 File 对象，所以需要特殊处理
    console.log('恢复未完成的上传:', dbFile);
    alert(`恢复上传功能需要额外实现，文件: ${dbFile.filename}`);
  };

  const handlePause = (taskId: string) => {
    setUploadTasks(prev => {
      return prev.map(task => {
        if (task.id === taskId && task.controller) {
          task.controller.abort();
          return { ...task, status: 'paused' };
        }
        return task;
      });
    });
  };

  const handleResume = (taskId: string) => {
    const task = uploadTasks.find(t => t.id === taskId);
    if (!task) return;

    const controller = new AbortController();

    // 更新任务状态为上传中
    setUploadTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: 'uploading', controller }
        : t
    ));

    // 重新开始上传过程
    handleFileUpload(
      task.file,
      (progress) => {
        setUploadTasks(prev => prev.map(t =>
          t.id === taskId
            ? { ...t, progress }
            : t
        ));
      },
      controller.signal
    )
      .then(() => {
        setUploadTasks(prev => prev.map(t =>
          t.id === taskId
            ? { ...t, status: 'completed', progress: 100 }
            : t
        ));
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setFile(null);
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          setUploadTasks(prev => prev.map(t =>
            t.id === taskId
              ? { ...t, status: 'paused' }
              : t
          ));
        } else {
          console.error('文件处理出错:', error);
          setUploadTasks(prev => prev.map(t =>
            t.id === taskId
              ? { ...t, status: 'failed' }
              : t
          ));
        }
      });
  };

  const handleCancel = (taskId: string) => {
    setUploadTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (task && task.controller) {
        task.controller.abort();
      }
      return prev.filter(t => t.id !== taskId);
    });
  };

  const removeCompletedTasks = () => {
    setUploadTasks(prev => prev.filter(task => task.status !== 'completed'));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">文件上传</h2>
        <div className="flex items-center space-x-2">
          <input
            id="file-upload-input"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="file-upload-input"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium text-gray-700 cursor-pointer"
          >
            选择文件
          </label>
          <button
            onClick={handleUpload}
            disabled={!file}
            className={`px-4 py-2 rounded-md font-medium ${!file
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-shadow duration-300'
              }`}
          >
            上传
          </button>
        </div>
      </div>

      {file && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <h3 className="font-medium text-gray-700 mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            待上传文件:
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

      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-gray-700">上传任务</h3>
          <button
            onClick={removeCompletedTasks}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            清除已完成
          </button>
        </div>

        {uploadTasks.length === 0 && incompleteUploads.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无上传任务</p>
        ) : (
          <div className="space-y-4">
            {/* 显示未完成的上传任务 */}
            {incompleteUploads.map((dbFile) => (
              <div key={dbFile.id} className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-700 truncate max-w-xs" title={dbFile.filename}>
                    {dbFile.filename}
                  </h4>
                  <button
                    onClick={() => handleResumeIncomplete(dbFile)}
                    className="text-xs px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                  >
                    恢复上传
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">未完成</span>
                    <span className="text-gray-600">
                      ({dbFile.totalChunks ? Math.round((dbFile.uploadChunks / dbFile.totalChunks) * 100) : 0}%)
                    </span>
                  </div>
                  <Progress
                    value={dbFile.totalChunks ? (dbFile.uploadChunks / dbFile.totalChunks) * 100 : 0}
                    className="w-full h-2"
                  />
                </div>
              </div>
            ))}

            {/* 显示当前上传任务 */}
            {uploadTasks.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-700 truncate max-w-xs" title={task.file.name}>
                    {task.file.name}
                  </h4>
                  <div className="flex space-x-1">
                    {task.status === 'uploading' && (
                      <button
                        onClick={() => handlePause(task.id)}
                        className="text-xs px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                      >
                        暂停
                      </button>
                    )}
                    {task.status === 'paused' && (
                      <button
                        onClick={() => handleResume(task.id)}
                        className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
                      >
                        继续
                      </button>
                    )}
                    {(task.status === 'paused' || task.status === 'pending') && (
                      <button
                        onClick={() => handleCancel(task.id)}
                        className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        取消
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {task.status === 'completed' && '上传成功'}
                      {task.status === 'failed' && '上传失败'}
                      {task.status === 'paused' && '已暂停'}
                      {task.status === 'uploading' && '上传中...'}
                      {task.status === 'pending' && '等待中...'}
                    </span>
                    <span className="text-gray-600">{Math.round(task.progress)}%</span>
                  </div>
                  <Progress value={task.progress} className="w-full h-2" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;