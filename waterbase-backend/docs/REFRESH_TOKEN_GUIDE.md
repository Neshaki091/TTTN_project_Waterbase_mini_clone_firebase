# Refresh Token Implementation Guide

## Overview

Waterbase Auth Service hiện đã hỗ trợ **automatic token refresh** để duy trì phiên đăng nhập mà không yêu cầu người dùng đăng nhập lại.

## Token Strategy

### Access Token
- **Expiration:** 15 minutes
- **Purpose:** Xác thực API requests
- **Storage:** Client memory (không lưu localStorage)
- **Payload:** Full user info (id, email, role, apps/appId)

### Refresh Token
- **Expiration:** 7 days
- **Purpose:** Làm mới access token khi hết hạn
- **Storage:** Secure HTTP-only cookie (recommended) hoặc localStorage
- **Payload:** Minimal (id, type: 'refresh')

## API Endpoints

### 1. Owner Refresh Token

**Endpoint:** `POST /api/v1/auth/owners/refresh-token`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Access token refreshed successfully"
}
```

**Error Responses:**
- `400`: Missing refresh token
- `401`: Invalid or expired refresh token
- `403`: Refresh token revoked
- `404`: Owner not found

### 2. User Refresh Token

**Endpoint:** `POST /api/v1/auth/users/refresh-token`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Access token refreshed successfully"
}
```

## Client Implementation

### React Example (Axios Interceptor)

```javascript
import axios from 'axios';

// Store tokens
let accessToken = null;
let refreshToken = localStorage.getItem('refreshToken');

// Axios instance
const api = axios.create({
  baseURL: 'https://api.waterbase.click/api/v1'
});

// Request interceptor - attach access token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - auto refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh access token
        const { data } = await axios.post(
          'https://api.waterbase.click/api/v1/auth/owners/refresh-token',
          { refreshToken }
        );

        // Update access token
        accessToken = data.accessToken;

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Login function
export const login = async (email, password) => {
  const { data } = await api.post('/auth/owners/login', { email, password });
  
  // Store tokens
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;
  localStorage.setItem('refreshToken', refreshToken);
  
  return data;
};

// Logout function
export const logout = async () => {
  try {
    await api.post('/auth/owners/logout');
  } finally {
    accessToken = null;
    refreshToken = null;
    localStorage.removeItem('refreshToken');
  }
};

export default api;
```

### React Native Example

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

let accessToken = null;

const api = axios.create({
  baseURL: 'https://api.waterbase.click/api/v1'
});

api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        const { data } = await axios.post(
          'https://api.waterbase.click/api/v1/auth/users/refresh-token',
          { refreshToken }
        );

        accessToken = data.accessToken;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.removeItem('refreshToken');
        // Navigate to login screen
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## Security Considerations

### ✅ Best Practices Implemented

1. **Short-lived Access Tokens:** 15 minutes expiration
2. **Refresh Token Validation:** Verified against database
3. **Token Type Check:** Ensures refresh token is not used as access token
4. **Database Revocation:** Tokens can be revoked via logout

### ⚠️ Important Notes

1. **Never expose refresh token in URL or logs**
2. **Store refresh token securely:**
   - Web: HTTP-only cookie (recommended) or localStorage
   - Mobile: Secure storage (Keychain/Keystore)
3. **Implement token rotation:** Generate new refresh token on each refresh (future enhancement)
4. **Monitor suspicious activity:** Track refresh token usage patterns

## Testing

### Manual Test with cURL

```bash
# 1. Login
curl -X POST https://api.waterbase.click/api/v1/auth/owners/login \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@example.com", "password": "password123"}'

# Response:
# {
#   "owner": {...},
#   "accessToken": "eyJ...",
#   "refreshToken": "eyJ..."
# }

# 2. Wait 15 minutes or decode token to check expiration

# 3. Refresh token
curl -X POST https://api.waterbase.click/api/v1/auth/owners/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJ..."}'

# Response:
# {
#   "accessToken": "eyJ...",
#   "message": "Access token refreshed successfully"
# }

# 4. Use new access token
curl -X GET https://api.waterbase.click/api/v1/apps \
  -H "Authorization: Bearer NEW_ACCESS_TOKEN"
```

## Flow Diagram

```
┌─────────┐                                    ┌─────────┐
│ Client  │                                    │  Server │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  1. POST /login (email, password)           │
     ├────────────────────────────────────────────►│
     │                                              │
     │  2. {accessToken, refreshToken}             │
     │◄────────────────────────────────────────────┤
     │                                              │
     │  Store tokens                                │
     │                                              │
     │  3. API Request + accessToken                │
     ├────────────────────────────────────────────►│
     │                                              │
     │  4. 401 Unauthorized (token expired)         │
     │◄────────────────────────────────────────────┤
     │                                              │
     │  5. POST /refresh-token (refreshToken)       │
     ├────────────────────────────────────────────►│
     │                                              │
     │     - Verify refresh token                   │
     │     - Check database                         │
     │     - Generate new access token              │
     │                                              │
     │  6. {accessToken}                            │
     │◄────────────────────────────────────────────┤
     │                                              │
     │  7. Retry API Request + new accessToken      │
     ├────────────────────────────────────────────►│
     │                                              │
     │  8. Success Response                         │
     │◄────────────────────────────────────────────┤
     │                                              │
```

## Future Enhancements

1. **Token Rotation:** Generate new refresh token on each refresh
2. **Refresh Token Expiration Extension:** Extend refresh token expiry on use
3. **Device Tracking:** Track which devices have active refresh tokens
4. **Suspicious Activity Detection:** Alert on unusual refresh patterns
5. **Rate Limiting:** Limit refresh token requests to prevent abuse

## Troubleshooting

### Issue: "Refresh token revoked or not found"

**Cause:** Token was deleted from database (logout) or never existed

**Solution:** User must login again

### Issue: "Refresh token expired"

**Cause:** Refresh token has passed 7-day expiration

**Solution:** User must login again

### Issue: "Invalid token type"

**Cause:** Client sent access token instead of refresh token

**Solution:** Ensure client sends correct token type

---

**Updated:** 2025-12-10  
**Version:** 1.0.0
