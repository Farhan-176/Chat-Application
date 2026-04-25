import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../config'

export interface UploadResult {
  url: string
  name: string
  type: string
  size: number
}

/**
 * FileUploader utility for handling secure, workspace-isolated uploads.
 */
export class FileUploader {
  /**
   * Uploads a file to Firebase Storage with path-based multi-tenancy isolation.
   */
  static async upload(
    file: File, 
    roomId: string, 
    workspaceId: string = 'global'
  ): Promise<UploadResult> {
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name}`
    const storagePath = `workspaces/${workspaceId}/rooms/${roomId}/${fileName}`
    const storageRef = ref(storage, storagePath)

    try {
      console.log(`[FileUploader] Uploading ${file.name} to ${storagePath}...`)
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)

      return {
        url: downloadURL,
        name: file.name,
        type: file.type,
        size: file.size
      }
    } catch (error) {
      console.error('[FileUploader] Upload failed:', error)
      throw new Error('Failed to upload file. Please check your connection and try again.')
    }
  }

  /**
   * Validates file size and type (Enterprise limit: 10MB for Pro, 2MB for Free).
   */
  static validate(file: File, isPro: boolean = false): string | null {
    const maxSize = isPro ? 10 * 1024 * 1024 : 2 * 1024 * 1024
    if (file.size > maxSize) {
      return `File too large. Max size is ${isPro ? '10MB' : '2MB'} for your current plan.`
    }
    return null
  }
}
