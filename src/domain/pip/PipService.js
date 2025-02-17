export class PipService {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.video = document.createElement('video');
        this.startTime = null;
        this.animationFrameId = null;
        this.calendarService = null;
        this.calendarInitPromise = null;
        this.mediaStream = null;
        
        // Set canvas size
        this.canvas.width = 320;
        this.canvas.height = 180;
        
        // Configure video element
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.autoplay = true;
        
        // Draw initial frame and set up stream
        this.drawEmptyFrame();
        this.setupVideoStream();

        // Initialize calendar service immediately
        this.calendarInitPromise = this.initializeCalendarService().catch(error => {
            console.error('Failed to initialize calendar service:', error);
            // Don't throw here, let the error be handled by the caller
            return null;
        });
    }

    setupVideoStream() {
        // Create a new stream from canvas
        const stream = this.canvas.captureStream(30);
        this.video.srcObject = stream;
        
        // Ensure video starts playing
        this.video.play().catch(error => {
            console.error('Error playing video:', error);
        });
    }

    drawEmptyFrame() {
        // Draw black background with a border to ensure visibility
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
        
        // Draw initial text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('00:00:00', this.canvas.width / 2, this.canvas.height / 2);
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    drawTimer(forcedElapsedTime = null, title = "") {
        const elapsedTime = forcedElapsedTime || (Date.now() - this.startTime);
        const formattedTime = this.formatTime(elapsedTime);

        // Clear the canvas and draw black background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the timer text
        this.ctx.font = '46px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(formattedTime, this.canvas.width / 2, this.canvas.height / 2);

        // Draw the title text
        if (title) {
            this.ctx.font = '16px Arial';
            this.ctx.fillStyle = '#ffffff'; // Changed to white for better visibility
            this.ctx.fillText(title, this.canvas.width / 2, this.canvas.height / 2 + 40);
        }

        // Request the next frame
        this.animationFrameId = requestAnimationFrame(() => this.drawTimer(null, title));
    }

    async startScreenCapture() {
        if (this.mediaStream) {
            this.stopScreenCapture();
        }
        
        this.mediaStream = await navigator.mediaDevices.getDisplayMedia({ 
            video: true,
            audio: false
        });
        return this.mediaStream;
    }

    stopScreenCapture() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }

    async startPictureInPicture() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            }

            // Ensure video is playing
            await this.video.play();

            // Start the timer immediately
            this.startTime = Date.now();
            this.drawTimer();
            
            // Request PiP
            await this.video.requestPictureInPicture();
        } catch (error) {
            this.stopPictureInPicture();
            throw new Error(`Failed to start Picture in Picture: ${error.message}`);
        }
    }

    async enterPictureInPicture() {
        try {
            if (!this.startTime) {
                throw new Error('Timer is not running');
            }

            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            }

            // Ensure video is playing
            await this.video.play();
            
            // Request PiP (timer is already running)
            await this.video.requestPictureInPicture();
        } catch (error) {
            throw new Error(`Failed to enter Picture in Picture: ${error.message}`);
        }
    }

    stopPictureInPicture() {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        }
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.startTime = null;
        this.drawEmptyFrame();
    }

    async initializeCalendarService() {
        if (this.calendarService) {
            return this.calendarService;
        }

        try {
            console.log('Initializing calendar service...');
            const { GoogleCalendarService } = await import('../../domain/calendar/GoogleCalendarService.js');
            this.calendarService = new GoogleCalendarService();
            await this.calendarService.initializeGoogleApi();
            console.log('Calendar service initialized');
            return this.calendarService;
        } catch (error) {
            console.error('Calendar service initialization failed:', error);
            throw error;
        }
    }

    async ensureCalendarService() {
        try {
            if (this.calendarInitPromise) {
                await this.calendarInitPromise;
            }
            if (!this.calendarService) {
                await this.initializeCalendarService();
            }
            return this.calendarService;
        } catch (error) {
            console.error('Failed to ensure calendar service:', error);
            throw error;
        }
    }

    async signIn(forcePrompt = false) {
        try {
            const calendarService = await this.ensureCalendarService();
            await calendarService.authenticate(forcePrompt);
        } catch (error) {
            console.error('Sign in failed:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            const calendarService = await this.ensureCalendarService();
            await calendarService.signOut();
        } catch (error) {
            console.error('Sign out failed:', error);
            throw error;
        }
    }

    isAuthenticated() {
        return this.calendarService?.isAuthenticated() || false;
    }

    getCurrentUser() {
        return this.calendarService?.getCurrentUser() || null;
    }

    async saveToCalendar(title, colorId = '5') {
        if (!this.startTime) {
            throw new Error('No active session to save');
        }

        try {
            const calendarService = await this.ensureCalendarService();
            if (!calendarService.isAuthenticated()) {
                await this.signIn();
            }
            const endTime = Date.now();
            await calendarService.createCalendarEvent(this.startTime, endTime, title, colorId);
            return true;
        } catch (error) {
            console.error('Failed to save to calendar:', error);
            throw new Error(`Failed to save to calendar: ${error.message}`);
        }
    }
} 