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
        
        // Update scopes to include all required permissions
        this.SCOPES = [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ].join(' ');
        
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
        this.initPromise = null;
        this.currentUser = null;
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
                    discoveryDocs: [
                        'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
                        'https://www.googleapis.com/discovery/v1/apis/oauth2/v2/rest'
                    ],
                });

                // Check for stored session
                const sessionStr = localStorage.getItem('pipTimerSession');
                if (sessionStr) {
                    try {
                        const session = JSON.parse(sessionStr);
                        if (Date.now() - session.timestamp <= 3500000) {
                            console.log('Setting stored token in gapi client...');
                            gapi.client.setToken({
                                access_token: session.access_token
                            });
                            // Verify token immediately
                            try {
                                await gapi.client.oauth2.userinfo.get();
                                this.currentUser = session.user;
                            } catch (e) {
                                console.log('Stored token invalid, clearing...');
                                this.clearSession();
                            }
                        } else {
                            console.log('Stored session expired, clearing...');
                            this.clearSession();
                        }
                    } catch (e) {
                        console.error('Failed to parse stored session:', e);
                        this.clearSession();
                    }
                }

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
                    prompt: ''
                });
                console.log('Token client initialized');

                this.gapiInited = true;
                this.gisInited = true;
                console.log('Google API initialization complete');

                return this.isAuthenticated();
            } catch (error) {
                console.error('Google API initialization failed:', error.message);
                this.initPromise = null;
                throw new Error(`Failed to initialize Google API: ${error.message}`);
            }
        })();

        return this.initPromise;
    }

    async authenticate(forcePrompt = false) {
        console.log('Starting authentication...');
        await this.initializeGoogleApi();
        console.log('Google API initialized, requesting access token...');

        return new Promise((resolve, reject) => {
            try {
                this.tokenClient.callback = async (response) => {
                    if (response.error) {
                        console.error('Authentication failed:', response.error);
                        this.clearSession();
                        reject(response);
                        return;
                    }
                    try {
                        console.log('Authentication successful');
                        await this.handleSuccessfulAuth(response);
                        resolve(response);
                    } catch (error) {
                        reject(error);
                    }
                };

                if (forcePrompt) {
                    this.tokenClient.requestAccessToken({ prompt: 'consent' });
                } else {
                    this.tokenClient.requestAccessToken({ prompt: '' });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    async handleSuccessfulAuth(response) {
        try {
            // Set the token first
            gapi.client.setToken({
                access_token: response.access_token
            });

            // Get user info
            const userResponse = await gapi.client.oauth2.userinfo.get();
            this.currentUser = userResponse.result;
            
            // Store session
            const session = {
                access_token: response.access_token,
                user: this.currentUser,
                timestamp: Date.now()
            };
            localStorage.setItem('pipTimerSession', JSON.stringify(session));

            // Dispatch event for UI updates
            window.dispatchEvent(new CustomEvent('userLoggedIn', { 
                detail: this.currentUser 
            }));
        } catch (error) {
            console.error('Failed to handle successful auth:', error);
            this.clearSession();
            throw error;
        }
    }

    async restoreSession() {
        const sessionStr = localStorage.getItem('pipTimerSession');
        if (!sessionStr) {
            console.log('No session found in localStorage');
            return false;
        }

        try {
            console.log('Found session, attempting to restore...');
            const session = JSON.parse(sessionStr);
            const tokenAge = Date.now() - session.timestamp;
            
            // Token typically expires in 1 hour (3600000 ms)
            if (tokenAge > 3500000) { // Check slightly before expiration
                console.log('Session expired, clearing...');
                this.clearSession();
                return false;
            }

            // Set the token in gapi
            if (!gapi?.client) {
                console.error('gapi.client not available during session restore');
                return false;
            }

            console.log('Setting token in gapi client...');
            gapi.client.setToken({
                access_token: session.access_token
            });

            this.currentUser = session.user;
            
            // Verify token is still valid
            try {
                console.log('Verifying token validity...');
                const userResponse = await gapi.client.oauth2.userinfo.get();
                
                // Update user info
                this.currentUser = userResponse.result;
                
                // Update session with fresh user info
                session.user = this.currentUser;
                localStorage.setItem('pipTimerSession', JSON.stringify(session));
                
                console.log('Token verified, dispatching login event...');
                window.dispatchEvent(new CustomEvent('userLoggedIn', { 
                    detail: this.currentUser 
                }));
                return true;
            } catch (error) {
                console.log('Token validation failed, attempting silent refresh...');
                try {
                    // Try silent token refresh with a new token client
                    const tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: this.CLIENT_ID,
                        scope: this.SCOPES,
                        prompt: '',
                        callback: async (response) => {
                            if (response.error) {
                                throw response;
                            }
                            await this.handleSuccessfulAuth(response);
                        }
                    });
                    
                    await new Promise((resolve, reject) => {
                        tokenClient.requestAccessToken({
                            prompt: ''
                        });
                        // Set a timeout for the silent refresh
                        setTimeout(() => reject(new Error('Silent refresh timeout')), 5000);
                    });
                    return true;
                } catch (refreshError) {
                    console.log('Silent refresh failed, clearing session...');
                    this.clearSession();
                    return false;
                }
            }
        } catch (error) {
            console.error('Failed to restore session:', error);
            this.clearSession();
            return false;
        }
    }

    clearSession() {
        try {
            localStorage.removeItem('pipTimerSession');
            this.currentUser = null;
            if (gapi?.client) {
                gapi.client.setToken(null);
            }
            window.dispatchEvent(new CustomEvent('userLoggedOut'));
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    }

    async signOut() {
        try {
            const token = gapi.client.getToken();
            if (token !== null) {
                await google.accounts.oauth2.revoke(token.access_token);
            }
        } catch (error) {
            console.error('Error revoking token:', error);
        } finally {
            this.clearSession();
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async createCalendarEvent(startTime, endTime, title = 'PiP Timer Session', colorId = '5') {
        try {
            if (!this.isAuthenticated()) {
                throw new Error('Not authenticated');
            }

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
            if (error.status === 401) {
                // Token expired, try to reauthenticate
                try {
                    await this.authenticate();
                    // Retry the create event
                    return await this.createCalendarEvent(startTime, endTime, title, colorId);
                } catch (retryError) {
                    throw new Error('Authentication failed. Please sign in again.');
                }
            }
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