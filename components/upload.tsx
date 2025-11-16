/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { handleFileUpload, calculateFileNameHash, resumeFileUpload } from '@/utils/uploadFile';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

      // 检查是否存在与此文件匹配的未完成上传任务
      const matchingIncompleteUpload = incompleteUploads.find(
        (dbFile) => dbFile.filename === selectedFile.name && dbFile.size === selectedFile.size
      );

      if (matchingIncompleteUpload) {
        const shouldResume = window.confirm(
          `检测到文件 "${selectedFile.name}" 有一个未完成的上传任务，是否要恢复上传？`
        );

        if (shouldResume) {
          // 延迟执行以确保state已更新
          setTimeout(() => {
            handleResumeIncomplete(matchingIncompleteUpload);
          }, 0);
        }
      }
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

  // 浏览器不支持 文件句柄或定时轮询 所以只能通过选择文件的方式 完成恢复未完成上传 功能
  const handleResumeIncomplete = async (dbFile: DatabaseFile) => {
    // 实现恢复未完成上传的功能
    console.log('恢复未完成的上传:', dbFile);

    // 检查是否已经有对应的文件在待上传区域
    if (file && file.name === dbFile.filename && file.size === dbFile.size) {
      // 直接使用已选择的文件进行恢复上传
      await resumeUploadWithFile(dbFile, file);
      return;
    }

    // 如果没有对应文件，提示用户选择文件
    alert(`请先选择文件 "${dbFile.filename}" 来恢复上传`);

    // 自动触发文件选择
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }

    // 设置一个标志，表示我们正在等待特定文件的选择
    const waitForFileSelection = new Promise<File | null>((resolve) => {
      const originalOnChange = fileInputRef.current?.onchange;

      fileInputRef.current!.onchange = (e: any) => {
        // 执行原始的onChange处理
        if (originalOnChange && fileInputRef.current) {
          originalOnChange.call(fileInputRef.current, e);
        }

        const selectedFile = e.target.files?.[0] || null;

        // 检查选择的文件是否是我们需要的文件
        if (selectedFile && selectedFile.name === dbFile.filename && selectedFile.size === dbFile.size) {
          resolve(selectedFile);
        } else if (selectedFile) {
          alert(`请选择正确的文件: ${dbFile.filename}`);
          // 重要修复：清除文件输入，避免重复触发change事件
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          resolve(null);
        } else {
          resolve(null);
        }

        // 重要修复：恢复原始的onchange处理器
        fileInputRef.current!.onchange = originalOnChange || null;
      };
    });

    try {
      const selectedFile = await waitForFileSelection;

      if (selectedFile) {
        await resumeUploadWithFile(dbFile, selectedFile);
      } else {
        // 重要修复：如果用户没有选择正确的文件，则退出流程
        console.log('用户取消了文件选择或选择了错误的文件');
      }
    } catch (error) {
      console.error('等待文件选择时出错:', error);
    }
  };

  const resumeUploadWithFile = async (dbFile: DatabaseFile, selectedFile: File) => {
    // 创建一个新的上传任务
    const resumeTask: UploadTask = {
      id: `${dbFile.filename}-${dbFile.id}`,
      file: selectedFile,
      progress: Math.round((dbFile.uploadChunks / dbFile.totalChunks) * 100),
      status: 'pending',
      controller: null
    };

    setUploadTasks(prev => [...prev, resumeTask]);

    // 创建 AbortController 用于控制请求的中止
    const controller = new AbortController();

    // 更新任务状态为上传中
    setUploadTasks(prev => prev.map(task =>
      task.id === resumeTask.id
        ? { ...task, status: 'uploading', controller }
        : task
    ));

    try {
      // 特殊处理：为已存在的文件恢复上传
      await resumeFileUpload(
        dbFile.filename,
        dbFile.hash, // fileNameHash
        dbFile.size,
        dbFile.uploadChunks, // 已上传的分片数
        dbFile.totalChunks, // 总分片数
        (progress) => {
          setUploadTasks(prev => prev.map(task =>
            task.id === resumeTask.id
              ? { ...task, progress }
              : task
          ));
        },
        controller.signal
      );

      // 完成后更新任务状态
      setUploadTasks(prev => prev.map(task =>
        task.id === resumeTask.id
          ? { ...task, status: 'completed', progress: 100 }
          : task
      ));

      // 从incompleteUploads中移除已完成的任务
      setIncompleteUploads(prev => prev.filter(file => file.id !== dbFile.id));

      // 清空文件选择
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setUploadTasks(prev => prev.map(task =>
          task.id === resumeTask.id
            ? { ...task, status: 'paused' }
            : task
        ));
      } else {
        console.error('恢复上传失败:', error);
        setUploadTasks(prev => prev.map(task =>
          task.id === resumeTask.id
            ? { ...task, status: 'failed' }
            : task
        ));
      }
    }
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
    <div className="w-full max-w-3xl mx-auto p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">文件上传</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">选择并上传您的文件</p>
            </div>
            <Button
              onClick={removeCompletedTasks}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              清除已完成
            </Button>
          </div>

          <div className="grid gap-6">
            {/* 文件选择区域 */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center transition-colors hover:border-gray-400 dark:hover:border-gray-500">
              <div className="flex flex-col items-center justify-center gap-3">
                <svg
                  className="w-10 h-10 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
                <div className="space-y-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {file ? file.name : '拖拽文件到此处或点击选择'}
                  </p>
                  {!file && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      支持所有文件类型
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <Input
                    id="file-upload-input"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Label
                    htmlFor="file-upload-input"
                    className="cursor-pointer"
                  >
                    <Button variant="outline" className="w-full">
                      选择文件
                    </Button>
                  </Label>
                  <Button
                    onClick={handleUpload}
                    disabled={!file}
                    className="w-full"
                  >
                    开始上传
                  </Button>
                </div>
              </div>
            </div>

            {/* 文件信息卡片 */}
            {file && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  待上传文件
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400">文件名</span>
                    <span className="font-medium text-gray-900 dark:text-white truncate" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400">文件大小</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.round(file.size / 1024)} KB
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 dark:text-gray-400">文件类型</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {file.type || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 上传任务列表 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">上传任务</h3>

              {uploadTasks.length === 0 && incompleteUploads.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    ></path>
                  </svg>
                  <h3 className="mt-4 font-medium text-gray-900 dark:text-white">暂无上传任务</h3>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">
                    选择文件开始上传
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 显示未完成的上传任务 */}
                  {incompleteUploads.map((dbFile) => (
                    <div
                      key={`incomplete-${dbFile.id}`}
                      className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                    >
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-medium text-gray-900 dark:text-yellow-100 truncate"
                            title={dbFile.filename}
                          >
                            {dbFile.filename}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200 rounded-full">
                              未完成
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {dbFile.totalChunks ? Math.round((dbFile.uploadChunks / dbFile.totalChunks) * 100) : 0}% 完成
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleResumeIncomplete(dbFile)}
                            size="sm"
                            className="bg-yellow-500 hover:bg-yellow-600 text-white"
                          >
                            恢复上传
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Progress
                          value={dbFile.totalChunks ? (dbFile.uploadChunks / dbFile.totalChunks) * 100 : 0}
                          className="w-full h-2"
                        />
                      </div>
                    </div>
                  ))}

                  {/* 显示当前上传任务 */}
                  {uploadTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                    >
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4
                            className="font-medium text-gray-900 dark:text-white truncate"
                            title={task.file.name}
                          >
                            {task.file.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${task.status === 'completed'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                : task.status === 'failed'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                  : task.status === 'paused'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              }`}>
                              {task.status === 'completed' && '上传成功'}
                              {task.status === 'failed' && '上传失败'}
                              {task.status === 'paused' && '已暂停'}
                              {task.status === 'uploading' && '上传中...'}
                              {task.status === 'pending' && '等待中...'}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {Math.round(task.progress)}% 完成
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.status === 'uploading' && (
                            <Button
                              onClick={() => handlePause(task.id)}
                              variant="outline"
                              size="sm"
                            >
                              暂停
                            </Button>
                          )}
                          {task.status === 'paused' && (
                            <Button
                              onClick={() => handleResume(task.id)}
                              size="sm"
                            >
                              继续
                            </Button>
                          )}
                          {(task.status === 'paused' || task.status === 'pending') && (
                            <Button
                              onClick={() => handleCancel(task.id)}
                              variant="outline"
                              size="sm"
                            >
                              取消
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <Progress value={task.progress} className="w-full h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;