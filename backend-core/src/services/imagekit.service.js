const ImageKit = require('imagekit');

function getUploadAuth() {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey || !urlEndpoint) return null;

  const imagekit = new ImageKit({ publicKey, privateKey, urlEndpoint });
  const auth = imagekit.getAuthenticationParameters();
  return {
    token: auth.token,
    expire: auth.expire,
    signature: auth.signature,
    publicKey
  };
}

module.exports = { getUploadAuth };
