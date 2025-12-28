import * as ImagePicker from 'expo-image-picker';
import { storage } from '@/config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Alert, Platform } from 'react-native';

/**
 * Request camera and media library permissions
 */
export const requestPermissions = async (): Promise<boolean> => {
    try {
        if (Platform.OS !== 'web') {
            const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
            const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
                Alert.alert(
                    'Permissions Required',
                    'Please grant camera and photo library permissions to attach images.'
                );
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error('Error requesting permissions:', error);
        return false;
    }
};

/**
 * Pick an image from the device's photo library
 */
export const pickImage = async (): Promise<string | null> => {
    try {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return null;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,  // Allow direct upload without cropping
            quality: 0.8, // Good quality compression
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
 * Take a photo using the device camera
 */
export const takePhoto = async (): Promise<string | null> => {
    try {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return null;

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,  // Allow direct upload without cropping
            quality: 0.8, // Good quality compression
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
 * Upload image to Firebase Storage
 * @param uri Local URI of the image
 * @param path Storage path (e.g., 'businesses/businessId/entries/entryId/imageId.jpg')
 * @returns Download URL of the uploaded image
 */
export const uploadImage = async (uri: string, path: string): Promise<string | null> => {
    if (!storage) {
        Alert.alert('Error', 'Firebase Storage is not initialized');
        return null;
    }

    try {
        // Fetch the image as a blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // Create a reference to the storage location
        const storageRef = ref(storage, path);

        // Upload the blob
        await uploadBytes(storageRef, blob);

        // Get and return the download URL
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error: any) {
        console.error('❌ Error uploading image:', error);
        console.error('Error code:', error?.code);
        console.error('Error message:', error?.message);
        console.error('Full error:', JSON.stringify(error, null, 2));

        let errorMessage = 'Failed to upload image. Please try again.';

        if (error?.code === 'storage/unauthorized') {
            errorMessage = 'Permission denied. Please check Firebase Storage rules.';
            console.error('💡 FIX: Update Firebase Storage rules to allow authenticated uploads');
        } else if (error?.code === 'storage/canceled') {
            errorMessage = 'Upload was canceled.';
        } else if (error?.code === 'storage/unknown') {
            errorMessage = 'Unknown storage error. Check your internet connection.';
        } else if (error?.message?.includes('Firebase Storage is not initialized')) {
            errorMessage = 'Storage is not configured. Please check Firebase setup.';
        }

        Alert.alert('Upload Error', errorMessage);
        return null;
    }
};

/**
 * Delete image from Firebase Storage
 * @param downloadURL The download URL of the image to delete
 */
export const deleteImage = async (downloadURL: string): Promise<boolean> => {
    if (!storage) {
        console.error('Firebase Storage is not initialized');
        return false;
    }

    try {
        // Extract the path from the download URL
        const pathMatch = downloadURL.match(/\/o\/(.+?)\?/);
        if (!pathMatch || !pathMatch[1]) {
            console.error('Invalid download URL');
            return false;
        }

        const path = decodeURIComponent(pathMatch[1]);
        const storageRef = ref(storage, path);

        await deleteObject(storageRef);
        return true;
    } catch (error) {
        console.error('Error deleting image:', error);
        return false;
    }
};

/**
 * Generate a unique filename for an image
 * @param businessId Business ID
 * @param entryId Entry ID
 * @param index Image index
 * @returns Storage path
 */
export const generateImagePath = (businessId: string, entryId: string, index: number): string => {
    const timestamp = Date.now();
    return `businesses/${businessId}/entries/${entryId}/image_${index}_${timestamp}.jpg`;
};
