'use client';

import { useState } from 'react';
import { uploadToImageKit } from '@/utils/imagekit';

export default function ImagePicker({ label = 'Photos', folder, images, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setError('');
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        uploaded.push(await uploadToImageKit(file, folder));
      }
      onChange([...(images || []), ...uploaded]);
    } catch (err) {
      setError(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url) => {
    onChange((images || []).filter((item) => item !== url));
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <p className="text-xs text-gray-500 mb-2">Add one or more photos. The first photo is the cover.</p>

      {(images || []).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {images.map((url, index) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="h-20 w-20 rounded object-cover border border-gray-200" />
              {index === 0 && (
                <span className="absolute left-1 top-1 px-1.5 py-0.5 text-[10px] font-semibold bg-white rounded">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-red-600 text-white text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
        className="block w-full text-sm text-gray-600"
      />
      {uploading && <p className="mt-2 text-xs text-gray-500">Uploading...</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
