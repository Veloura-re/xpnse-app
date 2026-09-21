import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PERMISSION_KEY = '@spndy_storage_permission_consent';
const CAMERA_PERMISSION_KEY = '@spndy_camera_permission_consent';

// ---------------------------------------------------------------------------
// Cloudinary configuration
// ---------------------------------------------------------------------------
const CLOUDINARY_CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'ljvvyaar';
const CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'spndy11';

export interface PermissionCheckResult {
  granted: boolean;
  canAskAgain: boolean;
  status: ImagePicker.PermissionStatus;
}

/**
 * Check active permission status for media library and camera.
 */
export const getStoragePermissionStatus = async (): Promise<{
  mediaLibraryGranted: boolean;
  cameraGranted: boolean;
}> => {
  try {
    if (Platform.OS === 'web') {
      return { mediaLibraryGranted: true, cameraGranted: true };
    }
    const storedMedia = await AsyncStorage.getItem(STORAGE_PERMISSION_KEY);
    const storedCam = await AsyncStorage.getItem(CAMERA_PERMISSION_KEY);
    const media = await ImagePicker.getMediaLibraryPermissionsAsync();
    const camera = await ImagePicker.getCameraPermissionsAsync();
    return {
      mediaLibraryGranted: (storedMedia === 'granted' || media.granted) && media.granted,
      cameraGranted: (storedCam === 'granted' || camera.granted) && camera.granted,
    };
  } catch (error) {
    console.error('Error checking permission status:', error);
    return { mediaLibraryGranted: false, cameraGranted: false };
  }
};

/**
 * Inspect device media library permissions without displaying system prompts or alerts.
 */
export const checkMediaLibraryPermission = async (): Promise<PermissionCheckResult> => {
  if (Platform.OS === 'web') {
    return { granted: true, canAskAgain: true, status: ImagePicker.PermissionStatus.GRANTED };
  }
  try {
    const res = await ImagePicker.getMediaLibraryPermissionsAsync();
    return {
      granted: res.granted,
      canAskAgain: res.canAskAgain,
      status: res.status,
    };
  } catch (error) {
    console.error('Error checking media library permission:', error);
    return { granted: false, canAskAgain: true, status: ImagePicker.PermissionStatus.UNDETERMINED };
  }
};

/**
 * Inspect device camera permissions without displaying system prompts or alerts.
 */
export const checkCameraPermission = async (): Promise<PermissionCheckResult> => {
  if (Platform.OS === 'web') {
    return { granted: true, canAskAgain: true, status: ImagePicker.PermissionStatus.GRANTED };
  }
  try {
    const res = await ImagePicker.getCameraPermissionsAsync();
    return {
      granted: res.granted,
      canAskAgain: res.canAskAgain,
      status: res.status,
    };
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return { granted: false, canAskAgain: true, status: ImagePicker.PermissionStatus.UNDETERMINED };
  }
};

/**
 * Direct system request for photo library permission.
 */
export const requestMediaLibraryDirect = async (): Promise<PermissionCheckResult> => {
  if (Platform.OS === 'web') {
    return { granted: true, canAskAgain: true, status: ImagePicker.PermissionStatus.GRANTED };
  }
  try {
    const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (res.granted) {
      await AsyncStorage.setItem(STORAGE_PERMISSION_KEY, 'granted');
    }
    return {
      granted: res.granted,
      canAskAgain: res.canAskAgain,
      status: res.status,
    };
  } catch (error) {
    console.error('Error requesting media library direct:', error);
    return { granted: false, canAskAgain: false, status: ImagePicker.PermissionStatus.DENIED };
  }
};

/**
 * Direct system request for camera permission.
 */
export const requestCameraDirect = async (): Promise<PermissionCheckResult> => {
  if (Platform.OS === 'web') {
    return { granted: true, canAskAgain: true, status: ImagePicker.PermissionStatus.GRANTED };
  }
  try {
    const res = await ImagePicker.requestCameraPermissionsAsync();
    if (res.granted) {
      await AsyncStorage.setItem(CAMERA_PERMISSION_KEY, 'granted');
    }
    return {
      granted: res.granted,
      canAskAgain: res.canAskAgain,
      status: res.status,
    };
  } catch (error) {
    console.error('Error requesting camera direct:', error);
    return { granted: false, canAskAgain: false, status: ImagePicker.PermissionStatus.DENIED };
  }
};

/**
 * Standard media library permission requester (non-blocking, direct system prompt).
 */
export const requestMediaLibraryPermissions = async (_forcePrompt: boolean = false): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') return true;
    const res = await requestMediaLibraryDirect();
    return res.granted;
  } catch (error) {
    console.error('Error requesting media library permission:', error);
    return false;
  }
};

/**
 * Standard camera permission requester (non-blocking, direct system prompt).
 */
export const requestCameraPermissions = async (_forcePrompt: boolean = false): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') return true;
    const res = await requestCameraDirect();
    return res.granted;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

/**
 * Pre-flight verification for uploading attachments from a specific source.
 */
export const ensureUploadPermission = async (
  source: 'gallery' | 'camera'
): Promise<boolean> => {
  if (source === 'gallery') {
    return await requestMediaLibraryPermissions();
  }
  return await requestCameraPermissions();
};

/**
 * Request both camera and media library permissions.
 */
export const requestPermissions = async (): Promise<boolean> => {
  const mediaOk = await requestMediaLibraryPermissions();
  if (!mediaOk) return false;
  return await requestCameraPermissions();
};

/**
 * Pick an image from the device photo library.
 * Returns a local file URI or null.
 */
export const pickImage = async (directLaunch: boolean = false): Promise<string | null> => {
  try {
    if (!directLaunch) {
      const check = await checkMediaLibraryPermission();
      if (!check.granted) {
        const req = await requestMediaLibraryDirect();
        if (!req.granted) return null;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error picking image from library:', error);
    return null;
  }
};

/**
 * Take a photo using the device camera.
 * Returns a local file URI or null.
 */
export const takePhoto = async (directLaunch: boolean = false): Promise<string | null> => {
  try {
    if (!directLaunch) {
      const check = await checkCameraPermission();
      if (!check.granted) {
        const req = await requestCameraDirect();
        if (!req.granted) return null;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error taking photo with camera:', error);
    return null;
  }
};

/**
 * Upload an image to Cloudinary via the unsigned upload API.
 * Returns the secure HTTPS URL of the uploaded image, or null on failure.
 *
 * @param uri   - Local file URI returned by pickImage / takePhoto.
 * @param folder - Optional Cloudinary folder path, e.g. "businesses/biz123/entries/entry456".
 */
export const uploadImage = async (
  uri: string,
  folder?: string,
): Promise<string | null> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    console.warn('Cloudinary environment variables are missing. Storing attachment locally.');
    return uri;
  }

  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    const formData = new FormData();
    if (Platform.OS === 'web') {
      formData.append('file', blob, `upload_${Date.now()}.jpg`);
    } else {
      formData.append('file', {
        uri,
        name: `upload_${Date.now()}.jpg`,
        type: blob.type || 'image/jpeg',
      } as unknown as Blob);
    }
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    if (folder) {
      formData.append('folder', folder);
    }

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      console.error('Cloudinary upload failed:', uploadResponse.status, errorBody);
      // Return the local URI as fallback so user data is never lost offline
      return uri;
    }

    const data = await uploadResponse.json();
    return (data.secure_url as string) ?? uri;
  } catch (error: any) {
    console.error('Error uploading image to Cloudinary:', error);
    // Offline resilience: return local URI
    return uri;
  }
};

/**
 * Delete an image from Cloudinary (client-side stub).
 */
export const deleteImage = async (_downloadURL: string): Promise<boolean> => {
  return true;
};

/**
 * Generate a Cloudinary folder path for a given entry.
 */
export const generateImagePath = (
  businessId: string,
  entryId: string,
  _index: number,
): string => {
  return `businesses/${businessId}/entries/${entryId}`;
};
