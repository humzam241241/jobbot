import { Profile } from "@/lib/schemas/profile";

/**
 * Sanitizes a profile to remove any potentially sensitive information
 * @param profile The profile to sanitize
 * @returns A sanitized profile
 */
export function sanitizeProfile(profile: Profile): Partial<Profile> {
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    website: profile.website,
    skills: profile.skills,
    // Include only the count of experience and education items
    experienceCount: profile.experience.length,
    educationCount: profile.education.length,
  };
}

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes The file size in bytes
 * @returns A formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}