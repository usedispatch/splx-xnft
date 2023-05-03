import { ApiRequestConfig } from '../api';
import { ModuleApi } from '@dispatch-services/store/vuestand';

export type ThisImage = ModuleApi<ModuleImageState, ModuleImageComputed, ModuleImageGetters, ModuleImageActions>;
type This = ThisImage;

export interface ImageStateValue {
  b64: string;
  // uploaded url
  url: string;
  isValid: boolean;
  isLoaded: boolean;
}

export interface ModuleImageState {
  images: {
    // key is either uploadKey or external url
    [key: string]: ImageStateValue;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleImageComputed {}

export interface ModuleImageGetters {
  isImageUrlValid: () => (url: string) => boolean;
  isImageUrlLoaded: () => (url: string) => boolean;
  getEncodedImage: () => (url: string) => string;
  getImageUrl: () => (url: string) => string;
  getPreviewImageForFile: () => (fileKey: string) => string;
  getImageRequestConfig: () => (url: string) => ApiRequestConfig;
  getImageUploadConfig: () => (form: FormData) => ApiRequestConfig;
}

export interface ModuleImageActions {
  _uploadImage: (this: This, contentName: string) => Promise<void>;
  downloadImageFromUrl: (this: This, url: string) => Promise<void>;
  fileToB64: (this: This, file: File, key: string) => Promise<void>;
  uploadImageFromFile: (this: This, file: File, key: string) => Promise<void>;
  uploadImageFromUrl: (this: This, url: string) => Promise<void>;
  verifyUrlIsImage: (this: This, url: string, key: string) => Promise<void>;
}
