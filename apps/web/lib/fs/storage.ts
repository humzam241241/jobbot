import fs from "fs/promises";
import path from "path";
import { createLogger } from '@/lib/logger';

const logger = createLogger('storage');

/**
 * Gets the directory path for a kit
 * @param kitId The ID of the kit
 * @returns The absolute path to the kit directory
 */
export function kitDir(kitId: string): string {
  return path.join(process.cwd(), "storage", "kits", kitId);
}

/**
 * Ensures the kit directory exists
 * @param kitId The ID of the kit
 * @returns The absolute path to the kit directory
 */
export async function ensureKitDir(kitId: string): Promise<string> {
  const dir = kitDir(kitId);
  try {
    await fs.mkdir(dir, { recursive: true });
    logger.info(`Ensured kit directory exists: ${dir}`);
  } catch (error) {
    logger.error(`Failed to create kit directory: ${dir}`, { error });
    throw new Error(`Failed to create kit directory: ${error}`);
  }
  return dir;
}

/**
 * Gets the public URL for a kit file
 * @param kitId The ID of the kit
 * @param filename The name of the file
 * @returns The public URL for the file
 */
export function kitFileUrl(kitId: string, filename: string): string {
  return `/api/kits/${kitId}/downloads?file=${encodeURIComponent(filename)}`;
}

/**
 * Checks if a file exists in the kit directory
 * @param kitId The ID of the kit
 * @param filename The name of the file
 * @returns True if the file exists, false otherwise
 */
export async function kitFileExists(kitId: string, filename: string): Promise<boolean> {
  const filePath = path.join(kitDir(kitId), filename);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lists all files in a kit directory
 * @param kitId The ID of the kit
 * @returns Array of filenames
 */
export async function listKitFiles(kitId: string): Promise<string[]> {
  const dir = kitDir(kitId);
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

/**
 * Reads a file from the kit directory
 * @param kitId The ID of the kit
 * @param filename The name of the file
 * @returns The file buffer
 */
export async function readKitFile(kitId: string, filename: string): Promise<Buffer> {
  const filePath = path.join(kitDir(kitId), filename);
  return fs.readFile(filePath);
}

/**
 * Writes a file to the kit directory
 * @param kitId The ID of the kit
 * @param filename The name of the file
 * @param data The file data
 */
export async function writeKitFile(kitId: string, filename: string, data: Buffer | string): Promise<void> {
  const dir = kitDir(kitId);
  await ensureKitDir(kitId);
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, data);
}
