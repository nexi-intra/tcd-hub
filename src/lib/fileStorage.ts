export interface StoredFile {
  url: string
  filename: string
  size: number
  uploadedAt: number
}

class FileStorageService {
  private async storeInKV(file: File): Promise<StoredFile> {
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const base64Data = this.arrayBufferToBase64(bytes)
    
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await window.spark.kv.set(fileId, {
      data: base64Data,
      filename: file.name,
      contentType: file.type,
      size: file.size,
      uploadedAt: Date.now()
    })

    return {
      url: `kv://${fileId}`,
      filename: file.name,
      size: file.size,
      uploadedAt: Date.now()
    }
  }

  async uploadFile(file: File): Promise<StoredFile> {
    return this.storeInKV(file)
  }

  async downloadFile(fileUrl: string): Promise<Blob> {
    if (fileUrl.startsWith('kv://')) {
      const fileId = fileUrl.replace('kv://', '')
      const fileData = await window.spark.kv.get<{
        data: string
        filename: string
        contentType: string
        size: number
        uploadedAt: number
      }>(fileId)

      if (!fileData) {
        throw new Error('File not found in storage')
      }

      const bytes = this.base64ToUint8Array(fileData.data)
      return new Blob([bytes as BlobPart], { 
        type: fileData.contentType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
    } else if (fileUrl.startsWith('http')) {
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error('Failed to download file from URL')
      }
      return await response.blob()
    } else {
      const bytes = this.base64ToUint8Array(fileUrl)
      return new Blob([bytes as BlobPart], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (fileUrl.startsWith('kv://')) {
      const fileId = fileUrl.replace('kv://', '')
      await window.spark.kv.delete(fileId)
    }
  }

  private arrayBufferToBase64(bytes: Uint8Array): string {
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
    return btoa(binary)
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
  }
}

export const fileStorage = new FileStorageService()
