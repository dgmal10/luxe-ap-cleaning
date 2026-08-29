/**
 * Firebase Storage service — gallery image upload/delete with offline fallback.
 */
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage, isFirebaseConfigured } from './firebase';

/**
 * Upload a gallery image and return its public URL + storage path.
 */
export async function uploadGalleryImage(
  file: File
): Promise<{ url: string; storagePath: string }> {
  if (!isFirebaseConfigured) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          storagePath: '',
        });
      };
      reader.readAsDataURL(file);
    });
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const storagePath = `gallery/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return { url, storagePath };
}

/**
 * Delete a file from Storage by its path.
 */
export async function deleteStorageFile(storagePath: string): Promise<void> {
  if (!isFirebaseConfigured || !storagePath) return;
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}
