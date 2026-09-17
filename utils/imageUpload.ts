import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, Linking } from 'react-native';

// ---------------------------------------------------------------------------
// Cloudinary configuration
// ---------------------------------------------------------------------------
// Create a free account at https://cloudinary.com (no credit card required).
// Then:
//   1. In the Cloudinary Console, go to Settings > Upload > Upload presets.
//   2. Create a new preset, set Signing Mode to "Unsigned".
//   3. Copy the preset name and your Cloud Name below / into .env.
// ---------------------------------------------------------------------------
const CLOUDINARY_CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'ljvvyaar';
const CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'spndy11';

/**
 * Check active permission status for media library and camera without triggering prompts.
 */
export const getStoragePermissionStatus = async (): Promise<{
  mediaLibraryGranted: boolean;
  cameraGranted: boolean;
}> => {
  try {
    if (Platform.OS === 'web') {
      return { mediaLibraryGranted: true, cameraGranted: true };
    }
    const media = await ImagePicker.getMediaLibraryPermissionsAsync();
    const camera = await ImagePicker.getCameraPermissionsAsync();
    return {
      mediaLibraryGranted: media.granted,
      cameraGranted: camera.granted,
    };
  } catch (error) {
    console.error('Error checking permission status:', error);
    return { mediaLibraryGranted: false, cameraGranted: false };
  }
};

/**
 * Request photo library / storage permissions explicitly with device settings redirect.
 */
export const requestMediaLibraryPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') return true;

    // Check existing permission state
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted) return true;

    // Request permission from the system
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (result.granted) return true;

    // Permission was denied or cannot be asked again
    Alert.alert(
      'Storage Access Required',
      'spndy requires storage permission to select and attach receipts. Please enable photo/storage access in your device settings to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings().catch(() => {
              console.warn('Unable to open device settings');
            });
          },
        },
      ]
    );
    return false;
  } catch (error) {
    console.error('Error requesting storage permissions:', error);
    return false;
  }
};

/**
 * Request camera permissions explicitly with device settings redirect.
 */
export const requestCameraPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') return true;

    // Check existing permission state
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.granted) return true;

    // Request permission from the system
    const result = await ImagePicker.requestCameraPermissionsAsync();
    if (result.granted) return true;

    // Permission was denied or cannot be asked again
    Alert.alert(
      'Camera Access Required',
      'spndy requires camera permission to capture receipt photos and invoices. Please enable camera access in your device settings to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings().catch(() => {
              console.warn('Unable to open device settings');
            });
          },
        },
      ]
    );
    return false;
  } catch (error) {
    console.error('Error requesting camera permissions:', error);
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
export const pickImage = async (): Promise<string | null> => {
  try {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('Error', 'Failed to pick image. Please try again.');
    return null;
  }
};

/**
 * Take a photo using the device camera.
 * Returns a local file URI or null.
 */
export const takePhoto = async (): Promise<string | null> => {
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
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
    Alert.alert(
      'Configuration Error',
      'Cloudinary is not configured. Please add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to your .env file.',
    );
    return null;
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
        // Do NOT set Content-Type header — let the browser/runtime set the
        // multipart boundary automatically.
      },
    );

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      console.error('Cloudinary upload failed:', uploadResponse.status, errorBody);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
      return null;
    }

    const data = await uploadResponse.json();
    return (data.secure_url as string) ?? null;
  } catch (error: any) {
    console.error('Error uploading image to Cloudinary:', error);
    Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    return null;
  }
};

/**
 * Delete an image from Cloudinary.
 * Note: deletion from client-side requires a signed request or a server-side
 * Cloud Function. For now this is a no-op — the image will simply become
 * unreferenced and Cloudinary's free tier does not charge for stored orphans.
 *
 * If you add a server endpoint later, replace this stub.
 */
export const deleteImage = async (_downloadURL: string): Promise<boolean> => {
  // Client-side deletion requires a signed Cloudinary API call (needs API secret).
  // Deletion should be handled server-side. Returning true to keep the caller happy.
  console.warn(
    'deleteImage: Cloudinary client-side deletion is not implemented. ' +
      'Remove images via the Cloudinary Console or a server-side endpoint.',
  );
  return true;
};

/**
 * Generate a Cloudinary folder path for a given entry.
 * The returned string is passed as the `folder` parameter to uploadImage.
 */
export const generateImagePath = (
  businessId: string,
  entryId: string,
  _index: number,
): string => {
  return `businesses/${businessId}/entries/${entryId}`;
};
