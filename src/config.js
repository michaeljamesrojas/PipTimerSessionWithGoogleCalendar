export const config = {
    googleCalendar: {
        get apiKey() {
            const apiKey = window.env?.GOOGLE_API_KEY;
            if (!apiKey) {
                console.error('Missing GOOGLE_API_KEY in environment variables');
                throw new Error('Missing required environment variable: GOOGLE_API_KEY');
            }
            return apiKey;
        },
        get clientId() {
            const clientId = window.env?.GOOGLE_CLIENT_ID;
            if (!clientId) {
                console.error('Missing GOOGLE_CLIENT_ID in environment variables');
                throw new Error('Missing required environment variable: GOOGLE_CLIENT_ID');
            }
            return clientId;
        }
    }
}; 