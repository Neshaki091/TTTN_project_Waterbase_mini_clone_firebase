import API_ENDPOINTS from '../config/api.config';

// Debug utility to check authentication state
export const debugAuth = () => {
    const token = localStorage.getItem('ownerToken');
    const ownerData = localStorage.getItem('ownerData');

    console.group('🔍 Auth Debug Info');
    console.log('Token exists:', !!token);
    console.log('Token value:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('Owner data:', ownerData ? JSON.parse(ownerData) : 'null');
    console.groupEnd();

    return {
        hasToken: !!token,
        token: token,
        ownerData: ownerData ? JSON.parse(ownerData) : null
    };
};

// Test API call with explicit token
export const testAuthenticatedCall = async () => {
    const token = localStorage.getItem('ownerToken');

    if (!token) {
        console.error('❌ No token found in localStorage');
        return;
    }

    try {
        const response = await fetch(API_ENDPOINTS.APPS.BASE, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Response status:', response.status);
        const data = await response.json();
        console.log('✅ Response data:', data);
        return data;
    } catch (error) {
        console.error('❌ API call failed:', error);
    }
};

// Add to window for easy access in browser console
if (typeof window !== 'undefined') {
    window.debugAuth = debugAuth;
    window.testAuthenticatedCall = testAuthenticatedCall;
}
