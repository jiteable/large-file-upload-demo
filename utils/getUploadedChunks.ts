
export async function getUploadedChunks(fileNameHash: string): Promise<{ uploadedChunks: number; uploadedChunkIndices: number[] }> {
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
    return {
      uploadedChunks: data.uploadedChunks || 0,
      uploadedChunkIndices: data.uploadedChunkIndices || []
    };
  } catch (error) {
    console.error('Error getting uploaded chunks:', error);
    // 出错时返回默认值，重新开始上传
    return {
      uploadedChunks: 0,
      uploadedChunkIndices: []
    };
  }
}