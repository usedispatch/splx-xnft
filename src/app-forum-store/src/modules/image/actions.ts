import { ModuleAction, useHttp } from '@dispatch-services/store';
import { ModuleImageActions, ThisImage as This } from './types';
import { sleep, tryEachAnimationFrame } from '@dispatch-services/utils-common/timers';

import { ApiRequestConfig } from '../api';
import { AxiosResponse } from 'axios';
import { b64toBlob } from '@dispatch-services/utils-common/string';

async function testImage(url, timeout): Promise<boolean> {
  return await new Promise((resolve, reject) => {
    let done = false;
    const to = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error('timeout'));
    }, timeout || 5000);
    const img = new Image();
    img.onerror = img.onabort = () => {
      clearTimeout(to);
      done = true;
      reject(new Error('Cannot load image. Try another URL.'));
    };
    img.onload = () => {
      clearTimeout(to);
      done = true;
      tryEachAnimationFrame(() => img.naturalWidth > 0 && img.naturalHeight > 0)
        .then(() => resolve(true))
        .catch(() => reject(new Error('Cannot load image.')));
    };
    img.src = url;
  });
}

const fileToB64: ModuleAction<This> = async function (file: File, key: string) {
  const b64: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reader.onabort = function () {
      throw new Error('Not a valid image');
    };
    reader.readAsDataURL(file);
  });
  if (!this.state.images[key]) {
    this.setState((state) => {
      state.images[key] = { isValid: true, b64, url: '', isLoaded: false };
    });
  } else {
    this.setState((state) => {
      state.images[key] = { ...state.images[key], b64 };
    });
  }
};

const _uploadImage: ModuleAction<This> = async function (contentName: string) {
  if (this.getters.getImageUrl(contentName)) return;
  const form = new FormData();
  const file = this.getters.getEncodedImage(contentName);

  const blob = b64toBlob(file);
  form.append('image', blob);
  const uploadConfig = this.getters.getImageUploadConfig(form);
  await sleep(2000);
  const req = await useHttp.actions.post(uploadConfig);

  if (req.data?.data) {
    const img = await req.data.data.display_url;
    this.setState((state) => {
      state.images[contentName] = { ...state.images[contentName], url: img };
    });
  } else {
    throw new Error(await req.request.response);
  }
};

const downloadImageFromUrl: ModuleAction<This> = async function (url: string) {
  if (!this.getters.isImageUrlValid(url)) {
    return;
  }
  const config = this.getters.getImageRequestConfig(url);
  const res = (await useHttp.actions.get(config)) as AxiosResponse<Blob, ApiRequestConfig>;
  const img = new File([res.data], 'image');

  await this.actions.fileToB64(img, url);
};

const uploadImageFromFile: ModuleAction<This> = async function (file: File, key: string) {
  await this.actions.fileToB64(file, key);
  await this.actions._uploadImage(key);
  await this.actions.verifyUrlIsImage(this.getters.getImageUrl(key), key);
  // console.log('uploadImageFromUrl', key, this.state.images);
};

const uploadImageFromUrl: ModuleAction<This> = async function (url: string) {
  await this.actions.verifyUrlIsImage(url, url);
  await this.actions.downloadImageFromUrl(url);
  await this.actions._uploadImage(url);
  await this.actions.verifyUrlIsImage(this.getters.getImageUrl(url), url);
};

const verifyUrlIsImage: ModuleAction<This> = async function (url: string, key: string) {
  if (!this.state.images[key]) {
    this.setState((state) => {
      state.images[key] = { isValid: false, b64: '', url: '', isLoaded: false };
    });
  }
  // console.log('verifyUrlIsImage', url, this.state.images[key]);
  const isValid = await testImage(url, 5000);

  // if already validated, this is a preload check
  if (!this.state.images[key].isValid) {
    this.setState((state) => {
      state.images[key] = { ...state.images[key], isValid };
    });
  } else if (this.state.images[key].url) {
    this.setState((state) => {
      // clear b64 to save space after preload
      state.images[key] = { ...state.images[key], isLoaded: isValid, b64: '' };
    });
  }
};

export const actions: ModuleImageActions = {
  _uploadImage,
  downloadImageFromUrl,
  fileToB64,
  uploadImageFromFile,
  uploadImageFromUrl,
  verifyUrlIsImage,
};
