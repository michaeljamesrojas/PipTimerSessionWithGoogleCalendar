import { config } from '../../config.js';

export class GoogleCalendarService {
    constructor() {
        this.API_KEY = config.googleCalendar.apiKey;
        this.CLIENT_ID = config.googleCalendar.clientId;
        this.SCOPES = 'https://www.googleapis.com/auth/calendar.events';
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
        this.initPromise = null;
    }

    async initializeGoogleApi() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                // Load the Google API client library
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://apis.google.com/js/api.js';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });

                // Load the Google Identity Services library
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://accounts.google.com/gsi/client';
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });

                // Wait for gapi to be available
                if (!window.gapi) {
                    throw new Error('Failed to load Google API client');
                }

                await new Promise((resolve) => {
                    gapi.load('client', resolve);
                });

                await gapi.client.init({
                    apiKey: this.API_KEY,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                });

                // Wait for google.accounts to be available
                if (!window.google?.accounts?.oauth2) {
                    throw new Error('Failed to load Google Identity Services');
                }

                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.CLIENT_ID,
                    scope: this.SCOPES,
                    callback: '', // Will be set later
                    prompt: 'consent'
                });

                this.gapiInited = true;
                this.gisInited = true;
            } catch (error) {
                this.initPromise = null;
                throw new Error(`Failed to initialize Google API: ${error.message}`);
            }
        })();

        return this.initPromise;
    }

    async authenticate() {
        await this.initializeGoogleApi();

        return new Promise((resolve, reject) => {
            this.tokenClient.callback = async (response) => {
                if (response.error) {
                    reject(response);
                }
                resolve(response);
            };
            this.tokenClient.requestAccessToken();
        });
    }

    async createCalendarEvent(startTime, endTime) {
        try {
            const duration = this.formatDuration(endTime - startTime);
            
            const event = {
                summary: 'PiP Timer Session',
                description: `Total duration: ${duration}`,
                start: {
                    dateTime: new Date(startTime).toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                    dateTime: new Date(endTime).toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };

            const response = await gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event
            });

            return response.result;
        } catch (error) {
            throw new Error(`Failed to create calendar event: ${error.message}`);
        }
    }

    formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        const parts = [];
        if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        if (seconds > 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
        
        return parts.join(', ');
    }
} 