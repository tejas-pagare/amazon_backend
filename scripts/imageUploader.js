'use strict';

const https    = require('https');
const { v2: cloudinary } = require('cloudinary');

/**
 * ImageUploader
 * OOP helper that:
 *  1. Fetches a product image URL from Unsplash Search API
 *  2. Uploads it directly to Cloudinary from the remote URL
 *  3. Returns the secure Cloudinary URL
 *
 * Usage:
 *   const uploader = new ImageUploader();
 *   const urls = await uploader.getAndUploadProductImages('airpods', 'electronics/airpods', 3);
 */
class ImageUploader {
  constructor() {
    cloudinary.config({
      cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
      api_key:     process.env.CLOUDINARY_API_KEY,
      api_secret:  process.env.CLOUDINARY_API_SECRET,
    });

    this.unsplashKey   = process.env.UNSPLASH_ACCESS_KEY;
    this.cloudinaryDir = 'amazon-clone';

    this.fetchUnsplashUrls       = this.fetchUnsplashUrls.bind(this);
    this.uploadFromUrl            = this.uploadFromUrl.bind(this);
    this.getAndUploadProductImages = this.getAndUploadProductImages.bind(this);
  }

  /**
   * Makes an HTTPS GET request and returns parsed JSON.
   * @param {string} url
   * @returns {Promise<object>}
   */
  _httpsGet(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'amazon-clone-seeder/1.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${data.slice(0, 200)}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Searches Unsplash for a query and returns `count` image URLs.
   * Uses the `regular` size (~1080px) for good quality.
   * @param {string} query   - search term e.g. "airpods"
   * @param {number} count   - number of images to fetch (default 3)
   * @returns {Promise<string[]>} array of Unsplash image URLs
   */
  async fetchUnsplashUrls(query, count = 3) {
    const encoded = encodeURIComponent(query);
    const url     = `https://api.unsplash.com/search/photos?query=${encoded}&per_page=${count}&orientation=landscape&client_id=${this.unsplashKey}`;

    const data = await this._httpsGet(url);

    if (!data.results || data.results.length === 0) {
      throw new Error(`No Unsplash results for query: "${query}"`);
    }

    // Return `regular` URL which is ~1080px wide — good balance of quality/size
    return data.results.slice(0, count).map((r) => r.urls.regular);
  }

  /**
   * Uploads a single image from a remote URL to Cloudinary.
   * @param {string} imageUrl  - source URL to upload from
   * @param {string} publicId  - Cloudinary public_id (e.g. "amazon-clone/electronics/airpods_1")
   * @returns {Promise<string>} secure Cloudinary URL
   */
  async uploadFromUrl(imageUrl, publicId) {
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id:    publicId,
      folder:       this.cloudinaryDir,
      overwrite:    true,
      resource_type: 'image',
    });

    return result.secure_url;
  }

  /**
   * Fetches `count` images from Unsplash for the given search query,
   * uploads each one to Cloudinary, and returns all secure Cloudinary URLs.
   *
   * @param {string} searchQuery  - Unsplash search term
   * @param {string} productSlug  - Used as Cloudinary public_id base (e.g. "electronics/airpods")
   * @param {number} count        - Number of images (default 3)
   * @returns {Promise<string[]>} array of Cloudinary secure URLs
   */
  async getAndUploadProductImages(searchQuery, productSlug, count = 3) {
    const unsplashUrls = await this.fetchUnsplashUrls(searchQuery, count);
    const cloudinaryUrls = [];

    for (let i = 0; i < unsplashUrls.length; i++) {
      const publicId = `${productSlug}_${i + 1}`;
      const url = await this.uploadFromUrl(unsplashUrls[i], publicId);
      cloudinaryUrls.push(url);
    }

    return cloudinaryUrls;
  }
}

module.exports = ImageUploader;
