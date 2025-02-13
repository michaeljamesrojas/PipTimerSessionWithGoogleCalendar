import { config } from '../../config.js';

export class GoogleCalendarService {
    constructor() {
        // Safely log config presence without exposing values
        console.log('GoogleCalendarService constructor - config keys:', 
            config.googleCalendar ? ['apiKey', 'clientId'].filter(key => !!config.googleCalendar[key]) : []);
        console.log('GoogleCalendarService constructor - env keys:', 
            window.env ? Object.keys(window.env) : []);
        
        this.API_KEY = config.googleCalendar.apiKey;
        this.CLIENT_ID = config.googleCalendar.clientId;
        
        console.log('GoogleCalendarService initialized with required credentials:', {
            API_KEY: this.API_KEY ? '[HIDDEN]' : undefined,
            CLIENT_ID: this.CLIENT_ID ? '[HIDDEN]' : undefined
        });
        
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
                console.log('Starting Google API initialization');
                
                // Load the Google API client library
                await new Promise((resolve, reject) => {
                    console.log('Loading Google API client library...');
                    const script = document.createElement('script');
                    script.src = 'https://apis.google.com/js/api.js';
                    script.onload = () => {
                        console.log('Google API client library loaded');
                        resolve();
                    };
                    script.onerror = (error) => {
                        console.error('Failed to load Google API client library');
                        reject(new Error('Script loading failed'));
                    };
                    document.head.appendChild(script);
                });

                // Load the Google Identity Services library
                await new Promise((resolve, reject) => {
                    console.log('Loading Google Identity Services...');
                    const script = document.createElement('script');
                    script.src = 'https://accounts.google.com/gsi/client';
                    script.onload = () => {
                        console.log('Google Identity Services loaded');
                        resolve();
                    };
                    script.onerror = (error) => {
                        console.error('Failed to load Google Identity Services');
                        reject(new Error('Script loading failed'));
                    };
                    document.head.appendChild(script);
                });

                // Wait for gapi to be available
                if (!window.gapi) {
                    console.error('gapi not available after loading script');
                    throw new Error('Failed to load Google API client');
                }

                console.log('Loading gapi client...');
                await new Promise((resolve) => {
                    gapi.load('client', resolve);
                });

                console.log('Initializing gapi client...');
                await gapi.client.init({
                    apiKey: this.API_KEY,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                });
                console.log('gapi client initialized');

                // Wait for google.accounts to be available
                if (!window.google?.accounts?.oauth2) {
                    console.error('google.accounts.oauth2 not available after loading script');
                    throw new Error('Failed to load Google Identity Services');
                }

                console.log('Initializing token client...');
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.CLIENT_ID,
                    scope: this.SCOPES,
                    callback: '', // Will be set later
                    prompt: 'consent'
                });
                console.log('Token client initialized');

                this.gapiInited = true;
                this.gisInited = true;
                console.log('Google API initialization complete');
            } catch (error) {
                console.error('Google API initialization failed:', error.message);
                this.initPromise = null;
                throw new Error(`Failed to initialize Google API: ${error.message}`);
            }
        })();

        return this.initPromise;
    }

    async authenticate() {
        console.log('Starting authentication...');
        await this.initializeGoogleApi();
        console.log('Google API initialized, requesting access token...');

        return new Promise((resolve, reject) => {
            this.tokenClient.callback = async (response) => {
                if (response.error) {
                    console.error('Authentication failed:', response.error);
                    reject(response);
                }
                console.log('Authentication successful');
                resolve(response);
            };
            this.tokenClient.requestAccessToken();
        });
    }

    async createCalendarEvent(startTime, endTime, title = 'PiP Timer Session', colorId = '5') {
        try {
            const duration = this.formatDuration(endTime - startTime);
            
            const event = {
                summary: title,
                description: `Total duration: ${duration}`,
                start: {
                    dateTime: new Date(startTime).toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                    dateTime: new Date(endTime).toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                colorId: colorId
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