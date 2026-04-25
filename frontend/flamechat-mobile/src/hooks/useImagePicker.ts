import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'

export interface PickedImage {
  uri: string
  name: string
  size: number | undefined
  type: string
}

export function useImagePicker() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickImage = async (): Promise<PickedImage | null> => {
    try {
      setLoading(true)
      setError(null)

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        setError('Permission to access media library was denied')
        return null
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (result.canceled) {
        return null
      }

      const asset = result.assets[0]
      const filename = asset.uri.split('/').pop() || 'photo.jpg'
      
      return {
        uri: asset.uri,
        name: filename,
        size: asset.fileSize,
        type: asset.type === 'image' ? 'image/jpeg' : 'image/*',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pick image'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  const takePhoto = async (): Promise<PickedImage | null> => {
    try {
      setLoading(true)
      setError(null)

      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        setError('Permission to access camera was denied')
        return null
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (result.canceled) {
        return null
      }

      const asset = result.assets[0]
      const filename = asset.uri.split('/').pop() || `photo-${Date.now()}.jpg`

      return {
        uri: asset.uri,
        name: filename,
        size: asset.fileSize,
        type: asset.type === 'image' ? 'image/jpeg' : 'image/*',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to take photo'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { pickImage, takePhoto, loading, error }
}
