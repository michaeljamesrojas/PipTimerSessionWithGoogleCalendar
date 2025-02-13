export const config = {
    googleCalendar: {
        apiKey: window.env?.GOOGLE_API_KEY || '',
        clientId: window.env?.GOOGLE_CLIENT_ID || ''
    }
}; 