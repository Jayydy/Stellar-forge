import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Button } from './UI'
import { useToast } from '../context/ToastContext'
import { ipfsService } from '../services/ipfs'
import { isIpfsConfigured } from '../config/env'
import { isValidImageFile } from '../utils/validation'

interface MetadataUploadFormProps {
  onUploadComplete: (metadataUri: string) => void
  isLoading?: boolean
}

export const MetadataUploadForm: React.FC<MetadataUploadFormProps> = ({
  onUploadComplete,
  isLoading = false,
}) => {
  const { t } = useTranslation()
  const { addToast } = useToast()

  const [tokenName, setTokenName] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const ipfsReady = isIpfsConfigured()

  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      return
    }

    const validation = isValidImageFile(file)
    if (!validation.valid) {
      addToast(validation.error || 'Invalid image file', 'error')
      setImageFile(null)
      setImagePreview(null)
      return
    }

    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    // Reset the input
    const input = document.getElementById('image') as HTMLInputElement
    if (input) input.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ipfsReady) {
      addToast('IPFS is not configured', 'error')
      return
    }

    if (!imageFile) {
      addToast('Please select an image file', 'error')
      return
    }

    if (!tokenName.trim()) {
      addToast('Please enter a token name', 'error')
      return
    }

    setIsUploading(true)
    try {
      const metadataUri = await ipfsService.uploadMetadata(
        imageFile,
        description,
        tokenName,
        (progress) => setUploadProgress(progress),
      )

      addToast('Metadata uploaded successfully!', 'success')
      onUploadComplete(metadataUri)

      // Reset form
      setTokenName('')
      setDescription('')
      setImageFile(null)
      setUploadProgress(0)
    } catch (error) {
      console.error('Upload error:', error)
      addToast(
        error instanceof Error ? error.message : 'Failed to upload metadata',
        'error',
      )
    } finally {
      setIsUploading(false)
    }
  }

  if (!ipfsReady) {
    return (
      <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          IPFS upload is disabled. Set{' '}
          <code className="font-mono bg-yellow-100 dark:bg-yellow-900 px-1 rounded">
            VITE_IPFS_API_KEY
          </code>{' '}
          and{' '}
          <code className="font-mono bg-yellow-100 dark:bg-yellow-900 px-1 rounded">
            VITE_IPFS_API_SECRET
          </code>{' '}
          to enable metadata uploads.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          label={t('tokenForm.nameLabel')}
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
          placeholder={t('tokenForm.namePlaceholder')}
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('tokenForm.descriptionLabel')}
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('tokenForm.descriptionPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          rows={3}
        />
      </div>

      <div>
        <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Token Image (JPEG, PNG, GIF - max 5MB)
        </label>
        <input
          id="image"
          type="file"
          accept="image/jpeg,image/png,image/gif"
          onChange={handleImageChange}
          disabled={isUploading || isLoading}
          className="block w-full text-sm text-gray-500 dark:text-gray-400
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            dark:file:bg-blue-900/30 dark:file:text-blue-300
            hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
        />
        {imagePreview && (
          <div className="mt-4 flex flex-col items-center space-y-2">
            <img
              src={imagePreview}
              alt="Token preview"
              className="max-w-32 max-h-32 object-contain border border-gray-300 dark:border-gray-600 rounded-md"
            />
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {imageFile?.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {(imageFile?.size || 0) / 1024 / 1024 < 1
                  ? `${Math.round((imageFile?.size || 0) / 1024)} KB`
                  : `${((imageFile?.size || 0) / 1024 / 1024).toFixed(2)} MB`}
              </p>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove image
              </button>
            </div>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
            <span className="font-medium text-gray-900 dark:text-white">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={!imageFile || isUploading || isLoading}
        className="w-full"
      >
        {isUploading ? 'Uploading...' : 'Upload Metadata'}
      </Button>
    </form>
  )
}
