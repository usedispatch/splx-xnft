import { ModuleImageGetters, ThisImage as This } from './types';

import { ApiRequestConfig } from '../api';
import { ModuleGetter } from '@dispatch-services/store';

const isImageUrlValid: ModuleGetter<This> = function () {
  return (url: string) => {
    return !!this.state.images[url]?.isValid;
  };
};

const isImageUrlLoaded: ModuleGetter<This> = function () {
  return (url: string) => {
    return !!this.state.images[url]?.isLoaded;
  };
};

const getEncodedImage: ModuleGetter<This> = function () {
  return (url: string) => {
    return this.state.images[url]?.b64 ?? '';
  };
};

const getImageUrl: ModuleGetter<This> = function () {
  return (url: string) => {
    return this.state.images[url]?.url ?? '';
  };
};

const getPreviewImageForFile: ModuleGetter<This> = function () {
  return (fileKey: string) => {
    return this.getters.isImageUrlLoaded(fileKey)
      ? this.getters.getImageUrl(fileKey)
      : this.getters.getEncodedImage(fileKey);
  };
};

const getImageRequestConfig: ModuleGetter<This> = function () {
  return (url: string) => {
    const config: ApiRequestConfig = {
      url,
      responseType: 'blob',
    };
    return config;
  };
};

const getImageUploadConfig: ModuleGetter<This> = function () {
  return (form: FormData) => {
    const config: ApiRequestConfig = {
      url: `https://api.imgbb.com/1/upload`,
      params: { key: process.env.NEXT_PUBLIC_IMGBB_KEY },
      method: 'POST',
      data: form,
      headers: { 'Content-Type': `multipart/form-data` },
    };
    return config;
  };
};

export const getters: ModuleImageGetters = {
  isImageUrlValid,
  isImageUrlLoaded,
  getEncodedImage,
  getImageUrl,
  getImageRequestConfig,
  getImageUploadConfig,
  getPreviewImageForFile,
};
