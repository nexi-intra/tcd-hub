export interface StoredFile {
  url: string
  filename: string
  size: number
  uploadedAt: number
}

class FileStorageService {
  private async storeInKV(file: File): Promise<StoredFile> {
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Filen er for stor (max 10MB). Din fil er ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    }

    if (!file.name.match(/\.(docx?|DOCX?)$/)) {
      throw new Error('Kun Word-dokumenter (.doc, .docx) understøttes')
    }

    console.log('[FileStorage] Starting upload:', {
      name: file.name,
      size: file.size,
      type: file.type
    })
    
    const arrayBuffer = await file.arrayBuffer()
    console.log('[FileStorage] File read as ArrayBuffer, size:', arrayBuffer.byteLength)
    
    const bytes = new Uint8Array(arrayBuffer)
    console.log('[FileStorage] Converted to Uint8Array, length:', bytes.length)
    
    const base64Data = this.arrayBufferToBase64(bytes)
    console.log('[FileStorage] Converted to base64, length:', base64Data.length)
    
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    
    const fileData = {
      data: base64Data,
      filename: file.name,
      contentType: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: file.size,
      uploadedAt: Date.now()
    }
    
    console.log('[FileStorage] Saving to KV with key:', fileId)
    
    try {
      await window.spark.kv.set(fileId, fileData)
      console.log('[FileStorage] File saved successfully to KV')
      
      const verification = await window.spark.kv.get(fileId)
      if (!verification) {
        throw new Error('Fil blev ikke gemt korrekt - verification failed')
      }
      console.log('[FileStorage] Verification successful')
    } catch (kvError) {
      console.error('[FileStorage] KV storage error:', kvError)
      throw new Error('Kunne ikke gemme fil i storage')
    }

    return {
      url: `kv://${fileId}`,
      filename: file.name,
      size: file.size,
      uploadedAt: Date.now()
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
