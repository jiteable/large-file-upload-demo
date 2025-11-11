
export async function getUploadedChunks(fileNameHash: string): Promise<number> {
  try {
    const response = await fetch('/api/upload-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileNameHash }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.uploadedChunks || 0;
  } catch (error) {
    console.error('Error getting uploaded chunks:', error);
    // 出错时返回0，重新开始上传
    return 0;
  }
}