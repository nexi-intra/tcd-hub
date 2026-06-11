export interface StoredFile {
  url: string
  filename: string
  size: number
  uploadedAt: number
}

class FileStorageService {
  private async storeInKV(file: File): Promise<StoredFile> {
    try {
      const MAX_FILE_SIZE = 10 * 1024 * 1024
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Filen er for stor (max 10MB). Din fil er ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      }

      console.log('Starting file upload:', file.name, 'Size:', file.size)
      
      const arrayBuffer = await file.arrayBuffer()
      console.log('File read as ArrayBuffer')
      
      const bytes = new Uint8Array(arrayBuffer)
      console.log('Converted to Uint8Array')
      
      const base64Data = this.arrayBufferToBase64(bytes)
      console.log('Converted to base64, length:', base64Data.length)
      
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const fileData = {
        data: base64Data,
        filename: file.name,
        contentType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: file.size,
        uploadedAt: Date.now()
      }
      
      console.log('Attempting to save to KV with key:', fileId)
      await window.spark.kv.set(fileId, fileData)
      console.log('File saved successfully to KV')

      return {
        url: `kv://${fileId}`,
        filename: file.name,
        size: file.size,
        uploadedAt: Date.now()
      }
    } catch (error) {
      console.error('Error in storeInKV:', error)
      if (error instanceof Error) {
        throw new Error(`Upload fejlede: ${error.message}`)
      }
      throw new Error('Upload fejlede: Ukendt fejl')
    }
  }

  async uploadFile(file: File): Promise<StoredFile> {
    try {
      return await this.storeInKV(file)
    } catch (error) {
      console.error('Upload file error:', error)
      throw error
    }
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
