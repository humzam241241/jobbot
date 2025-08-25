# Usage Tracking Improvements

## Overview

This document outlines the improvements made to fix the Google button in the ModelSelector component and implement proper user-specific usage tracking with a limit of 24 kits per user.

## Changes Made

### 1. Fixed Google Button

- Updated the ModelSelector component to correctly display "Google" for the Gemini provider
- Added explicit provider check to avoid potential issues with unknown providers

### 2. User-Specific Usage Tracking

- Implemented a robust usage tracking system in `apps/web/lib/usage/counter.ts`
- Added user identification via cookies
- Set a default usage limit of 24 kits per user
- Added functions to:
  - Get current user usage
  - Increment usage
  - Check if user has reached their limit
  - Reset usage (for admin purposes)
  - Get total usage across all users

### 3. API Enhancements

- Added usage limit check at the beginning of the resume generation route
- Returns a 429 status code with helpful message when limit is reached
- Added usage information to successful responses
- Created a new `/api/usage` endpoint to check current usage

### 4. UI Components

- Created a UsageIndicator component to display:
  - Current usage count
  - Usage limit
  - Remaining uses
  - Visual progress bar that changes color based on usage level

## How It Works

1. **User Identification**:
   - Users are identified by a unique ID stored in cookies
   - If no cookie exists, a new ID is generated

2. **Usage Tracking**:
   - Usage is tracked per user ID in an in-memory store
   - Each time a resume kit is generated, the count is incremented
   - The system enforces a limit of 24 kits per user

3. **Limit Enforcement**:
   - When a user reaches their limit, they receive a 429 error
   - The error includes a helpful message and their current usage stats

4. **Usage Display**:
   - The UsageIndicator component provides visual feedback
   - Progress bar changes color as usage increases:
     - Green: < 70% used
     - Yellow: 70-90% used
     - Red: > 90% used

## Implementation Notes

- In a production environment, the in-memory store would be replaced with a database
- The cookie setting would be handled properly with appropriate expiration
- Additional admin features could be added for managing user limits

## Testing

To test the implementation:
1. Generate multiple resume kits
2. Observe the usage count increasing
3. Verify that the UsageIndicator updates correctly
4. Confirm that you cannot generate more than 24 kits
