import { PipService } from "/src/domain/pip/PipService.js";

class App {
    constructor() {
        this.pipService = new PipService();
        this.video = document.getElementById('video');
        this.selectButton = document.getElementById('selectButton');
        this.startButton = document.getElementById('startButton');
        
        this.handleSelectScreen = this.handleSelectScreen.bind(this);
        this.handleStartPiP = this.handleStartPiP.bind(this);
        this.handleLeavePiP = this.handleLeavePiP.bind(this);
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.selectButton.addEventListener('click', this.handleSelectScreen);
        this.startButton.addEventListener('click', this.handleStartPiP);
        this.video.addEventListener('leavepictureinpicture', this.handleLeavePiP);
    }

    cleanup() {
        this.selectButton.removeEventListener('click', this.handleSelectScreen);
        this.startButton.removeEventListener('click', this.handleStartPiP);
        this.video.removeEventListener('leavepictureinpicture', this.handleLeavePiP);
        this.pipService.stopScreenCapture();
        this.video.srcObject = null;
    }

    handleLeavePiP() {
        this.pipService.stopScreenCapture();
        this.video.srcObject = null;
        this.startButton.disabled = true;
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

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});

window.addEventListener('unload', () => {
    if (app) {
        app.cleanup();
    }
}); 