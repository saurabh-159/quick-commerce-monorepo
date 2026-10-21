import { api } from '@/utils/api';

export async function uploadToImageKit(file, folder) {
  const auth = await api('/admin/imagekit-auth');
  const body = new FormData();
  body.append('file', file);
  body.append('fileName', file.name);
  body.append('folder', folder);
  body.append('publicKey', auth.publicKey);
  body.append('signature', auth.signature);
  body.append('expire', String(auth.expire));
  body.append('token', auth.token);

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body,
  });
  const data = await response.json();
  if (!response.ok || !data.url) {
    throw new Error(data.message || 'Image upload failed');
  }
  return data.url;
}
