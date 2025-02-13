import { PipService } from "/src/domain/pip/PipService.js";

class App {
    constructor() {
        this.pipService = new PipService();
        this.video = document.getElementById('video');
        this.selectButton = document.getElementById('selectButton');
        this.startButton = document.getElementById('startButton');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.selectButton.addEventListener('click', () => this.handleSelectScreen());
        this.startButton.addEventListener('click', () => this.handleStartPiP());

        // Clean up when leaving picture in picture mode
        this.video.addEventListener('leavepictureinpicture', () => {
            this.pipService.stopScreenCapture();
            this.video.srcObject = null;
        });
    }

    async handleSelectScreen() {
        try {
            await this.pipService.startScreenCapture();
            this.video.srcObject = this.pipService.mediaStream;
            this.startButton.disabled = false;
        } catch (error) {
            console.error(error);
            alert('Failed to start screen capture. Please try again.');
        }
    }

    async handleStartPiP() {
        try {
            await this.pipService.startPictureInPicture(this.video);
        } catch (error) {
            console.error(error);
            alert('Failed to start Picture in Picture. Please try again.');
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new App();
}); 