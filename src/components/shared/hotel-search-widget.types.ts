import { HotelSearchResult } from '@/types/hotel'

export interface ImageInfo {
  width: number
  height: number
  size: number // bytes
  format: string
  loading: boolean
  error: string | null
}

export interface StorageFolderInfo {
  exists: boolean
  slug: string
  folderPath: string
  path: string
  fileCount?: number
  loading: boolean
  error: string | null
  // Originals 폴더 정보
  originalsExists?: boolean
  originalsPath?: string
  originalsFileCount?: number
}

export interface StorageImage {
  name: string
  url: string
  size?: number
  lastModified?: string
  contentType?: string
  role?: string
  seq: number
  isPublic?: boolean
  storagePath?: string
}

export interface SortableImageCardProps {
  image: StorageImage
  hotelId: string
  hotel: HotelSearchResult
  onDelete: () => Promise<void> | void
  onRenameSuccess: (params: { oldPath: string; newPath: string; newName: string }) => void
  hotelVersion: number
}

export interface ImageManagementPanelProps {
  hotel: HotelSearchResult
  hotelId: string
  state: {
    loading: boolean
    saving: boolean
    error: string | null
    success: string | null
    editingImages: boolean
    imageUrls: {
      image_1: string
      image_2: string
      image_3: string
      image_4: string
      image_5: string
    }
    imageInfos: {
      image_1: ImageInfo | null
      image_2: ImageInfo | null
      image_3: ImageInfo | null
      image_4: ImageInfo | null
      image_5: ImageInfo | null
    }
    storageFolder: StorageFolderInfo | null
    storageImages: StorageImage[] | null
    savingImages: {
      [key: string]: boolean
    }
  } | undefined
  onToggleEditMode?: (hotelId: string) => void
  onSaveImageUrls?: (hotelId: string, sabreId: string) => void
  onCreateStorageFolder: (hotelId: string, sabreId: string) => void
  onCheckStorageFolder: (hotelId: string, sabreId: string) => void
  onLoadStorageImages: (hotelId: string, sabreId: string) => void
}

export interface HotelSearchWidgetProps {
  showSearch?: boolean
  showDetails?: boolean
  showRatePlans?: boolean
  showImages?: boolean
  showImageStorage?: boolean
  onSabreIdChange?: (sabreId: string) => void
}

