/**
 * Cloudinary unsigned uploads.
 *
 * Only the cloud name and an *unsigned* upload preset are used here — both are
 * safe to ship in a frontend bundle. The Cloudinary API secret must never
 * appear in this file or anywhere else under src/.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'ny5jllmz';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export interface UploadedMedia {
  url: string;
  thumbnailUrl?: string;
  type: 'IMAGE' | 'VIDEO';
}

/** Upload a file straight from the browser to Cloudinary. */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedMedia> {
  const isVideo = file.type.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  if (file.size > limit) {
    throw new Error(
      isVideo ? 'Video must be smaller than 100 MB.' : 'Image must be smaller than 10 MB.'
    );
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const json = await new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: any = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // fall through to the generic error below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
        resolve(body);
      } else {
        reject(new Error(body?.error?.message || `Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error while uploading.'));
    xhr.send(form);
  });

  return {
    url: json.secure_url as string,
    thumbnailUrl: isVideo
      ? (json.secure_url as string).replace(/\.[^.]+$/, '.jpg')
      : buildThumbnail(json.secure_url as string),
    type: isVideo ? 'VIDEO' : 'IMAGE',
  };
}

/** Ask Cloudinary for a smaller, auto-formatted variant of an image it hosts. */
export function buildThumbnail(url: string, width = 600): string {
  if (!url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/c_limit,w_${width},q_auto,f_auto/`);
}

export const cloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);
