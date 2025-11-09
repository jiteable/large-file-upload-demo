import SparkMD5 from 'spark-md5'

export async function calculateChunkHash(chunk: Blob, index: number, total: number, chunkSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const target: Blob[] = []
    const spark = new SparkMD5.ArrayBuffer()
    const fileReader = new FileReader()

    if (index === 0 || index < total - 1) {
      target.push(chunk)
    } else {
      target.push(chunk.slice(0, 2))
      target.push(chunk.slice(chunkSize / 2, chunkSize / 2 + 2))
      target.push(chunk.slice(chunkSize - 2, chunkSize))
    }

    fileReader.readAsArrayBuffer(new Blob(target))
    fileReader.onload = (e) => {
      const result = e.target?.result
      if (result && result instanceof ArrayBuffer) {
        spark.append(result)
        const hash = spark.end()
        console.log('hash: ' + hash)
        resolve(hash)
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'))
      }
    }

    fileReader.onerror = () => {
      reject(new Error('File reading error'))
    }
  })
}