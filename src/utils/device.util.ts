/**
 * Device Utility
 * Generates unique device identifiers for VK ID OAuth 2.1 authentication
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique device ID for VK ID authentication
 * Uses UUID v4 to create a random identifier for each auth attempt
 *
 * @returns {string} A unique device identifier
 */
export const generateDeviceId = (): string => {
  return uuidv4();
};
