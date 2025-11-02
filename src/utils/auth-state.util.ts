/**
 * Auth State Storage
 * In-memory storage for VK ID OAuth 2.1 PKCE parameters
 * Stores state, code_verifier, and device_id with automatic TTL cleanup
 */

interface AuthStateData {
  state: string;
  codeVerifier: string;
  deviceId: string;
  timestamp: number;
}

/**
 * In-memory Map for storing temporary auth state
 * Key: state token
 * Value: AuthStateData with timestamp
 */
const authStateStorage = new Map<string, AuthStateData>();

/**
 * TTL for auth state entries (10 minutes in milliseconds)
 */
const STATE_TTL = 10 * 60 * 1000;

/**
 * Stores auth state data with automatic cleanup after TTL
 *
 * @param state - CSRF protection state token
 * @param codeVerifier - PKCE code verifier
 * @param deviceId - Unique device identifier for VK ID
 */
export const setAuthState = (
  state: string,
  codeVerifier: string,
  deviceId: string
): void => {
  const data: AuthStateData = {
    state,
    codeVerifier,
    deviceId,
    timestamp: Date.now(),
  };

  authStateStorage.set(state, data);

  // Auto-cleanup after TTL
  setTimeout(() => {
    authStateStorage.delete(state);
  }, STATE_TTL);
};

/**
 * Retrieves and removes auth state data by state token
 * This ensures each state can only be used once (prevents replay attacks)
 *
 * @param state - CSRF protection state token
 * @returns AuthStateData if found and valid, null otherwise
 */
export const getAuthState = (state: string): AuthStateData | null => {
  const data = authStateStorage.get(state);

  if (!data) {
    return null;
  }

  // Check if entry has expired
  const isExpired = Date.now() - data.timestamp > STATE_TTL;
  if (isExpired) {
    authStateStorage.delete(state);
    return null;
  }

  // Remove entry after retrieval (one-time use)
  authStateStorage.delete(state);

  return data;
};

/**
 * Manually deletes an auth state entry
 * Used for cleanup in error scenarios
 *
 * @param state - CSRF protection state token
 */
export const deleteAuthState = (state: string): void => {
  authStateStorage.delete(state);
};

/**
 * Clears all auth state entries
 * Useful for testing or maintenance
 */
export const clearAllAuthStates = (): void => {
  authStateStorage.clear();
};

/**
 * Gets the current count of stored auth states
 * Useful for monitoring and debugging
 *
 * @returns Number of active auth states
 */
export const getAuthStateCount = (): number => {
  return authStateStorage.size;
};
