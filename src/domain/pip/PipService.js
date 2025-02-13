export class PipService {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.video = document.createElement('video');
        this.startTime = null;
        this.animationFrameId = null;
        this.calendarService = null;
        
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

    drawTimer() {
        if (!this.startTime) return;
        
        // Draw background with border
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
        
        // Calculate elapsed time
        const elapsedTime = Date.now() - this.startTime;
        const timeString = this.formatTime(elapsedTime);
        
        // Draw time with improved visibility
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(timeString, this.canvas.width / 2, this.canvas.height / 2);
        
        // Request next frame
        this.animationFrameId = requestAnimationFrame(() => this.drawTimer());
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
        if (!this.calendarService) {
            const { GoogleCalendarService } = await import('../../domain/calendar/GoogleCalendarService.js');
            this.calendarService = new GoogleCalendarService();
            await this.calendarService.initializeGoogleApi();
        }
    }

    async saveToCalendar(title, colorId = '5') {
        if (!this.startTime) {
            throw new Error('No active session to save');
        }

        try {
            await this.initializeCalendarService();
            await this.calendarService.authenticate();
            const endTime = Date.now();
            await this.calendarService.createCalendarEvent(this.startTime, endTime, title, colorId);
            return true;
        } catch (error) {
            console.error('Failed to save to calendar:', error);
            throw new Error(`Failed to save to calendar: ${error.message}`);
        }
    }
} 