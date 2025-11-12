import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);

/**
 * Storage abstraction layer for file operations
 * This interface allows easy migration from local file system to cloud storage (S3, GCS, Azure Blob, etc.)
 */
export interface IStorageProvider {
    /**
     * Store a file
     * @param key - Unique identifier/path for the file
     * @param data - File data (Buffer or string)
     * @returns Promise with the storage URL or path
     */
    put(key: string, data: Buffer | string): Promise<string>;

    /**
     * Retrieve a file
     * @param key - Unique identifier/path for the file
     * @returns Promise with file data as Buffer
     */
    get(key: string): Promise<Buffer>;

    /**
     * Delete a file
     * @param key - Unique identifier/path for the file
     */
    delete(key: string): Promise<void>;

    /**
     * Check if a file exists
     * @param key - Unique identifier/path for the file
     */
    exists(key: string): Promise<boolean>;

    /**
     * Get the public URL for a file (if applicable)
     * @param key - Unique identifier/path for the file
     */
    getUrl(key: string): string;
}

/**
 * Local file system storage provider
 * Use this for development and single-server deployments
 */
export class LocalStorageProvider implements IStorageProvider {
    private basePath: string;

    constructor(basePath: string = path.join(process.cwd(), 'uploads')) {
        this.basePath = basePath;
    }

    private getFullPath(key: string): string {
        return path.join(this.basePath, key);
    }

    async put(key: string, data: Buffer | string): Promise<string> {
        const fullPath = this.getFullPath(key);
        const dir = path.dirname(fullPath);

        // Ensure directory exists
        await mkdirAsync(dir, { recursive: true });

        // Write file
        await writeFileAsync(fullPath, data);

        return fullPath;
    }

    async get(key: string): Promise<Buffer> {
        const fullPath = this.getFullPath(key);
        return await readFileAsync(fullPath);
    }

    async delete(key: string): Promise<void> {
        const fullPath = this.getFullPath(key);
        await unlinkAsync(fullPath);
    }

    async exists(key: string): Promise<boolean> {
        const fullPath = this.getFullPath(key);
        return await existsAsync(fullPath);
    }

    getUrl(key: string): string {
        // For local storage, return the file path
        // In production with a cloud provider, this would return a public URL
        return `/uploads/${key}`;
    }
}

/**
 * Cloud storage provider (placeholder for S3, GCS, Azure Blob, etc.)
 * Implement this when migrating to cloud storage
 *
 * Example implementation for AWS S3:
 * ```typescript
 * import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
 *
 * export class S3StorageProvider implements IStorageProvider {
 *     private client: S3Client;
 *     private bucket: string;
 *
 *     constructor(bucket: string, region: string) {
 *         this.client = new S3Client({ region });
 *         this.bucket = bucket;
 *     }
 *
 *     async put(key: string, data: Buffer | string): Promise<string> {
 *         await this.client.send(new PutObjectCommand({
 *             Bucket: this.bucket,
 *             Key: key,
 *             Body: data
 *         }));
 *         return this.getUrl(key);
 *     }
 *
 *     async get(key: string): Promise<Buffer> {
 *         const response = await this.client.send(new GetObjectCommand({
 *             Bucket: this.bucket,
 *             Key: key
 *         }));
 *         return Buffer.from(await response.Body!.transformToByteArray());
 *     }
 *
 *     async delete(key: string): Promise<void> {
 *         await this.client.send(new DeleteObjectCommand({
 *             Bucket: this.bucket,
 *             Key: key
 *         }));
 *     }
 *
 *     async exists(key: string): Promise<boolean> {
 *         try {
 *             await this.client.send(new HeadObjectCommand({
 *                 Bucket: this.bucket,
 *                 Key: key
 *             }));
 *             return true;
 *         } catch {
 *             return false;
 *         }
 *     }
 *
 *     getUrl(key: string): string {
 *         return `https://${this.bucket}.s3.amazonaws.com/${key}`;
 *     }
 * }
 * ```
 */

// Factory function to get the appropriate storage provider
export function getStorageProvider(): IStorageProvider {
    const storageType = process.env.STORAGE_TYPE || 'local';

    switch (storageType) {
        case 'local':
            return new LocalStorageProvider();
        // Add more providers as needed:
        // case 's3':
        //     return new S3StorageProvider(
        //         process.env.S3_BUCKET!,
        //         process.env.AWS_REGION!
        //     );
        // case 'gcs':
        //     return new GCSStorageProvider(process.env.GCS_BUCKET!);
        // case 'azure':
        //     return new AzureBlobStorageProvider(process.env.AZURE_STORAGE_ACCOUNT!, process.env.AZURE_CONTAINER!);
        default:
            console.warn(`Unknown storage type: ${storageType}, falling back to local storage`);
            return new LocalStorageProvider();
    }
}

// Export a singleton instance
export const storage = getStorageProvider();
