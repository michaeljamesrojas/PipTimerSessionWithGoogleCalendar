export class PipService {
    constructor() {
        this.mediaStream = null;
        this.video = null;
    }

    async startScreenCapture() {
        try {
            this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always"
                },
                audio: false
            });
            return this.mediaStream;
        } catch (error) {
            throw new Error(`Failed to start screen capture: ${error.message}`);
        }
    }

    async startPictureInPicture(videoElement) {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            }
            
            if (!videoElement.srcObject && this.mediaStream) {
                videoElement.srcObject = this.mediaStream;
            }

            await videoElement.requestPictureInPicture();
            videoElement.play();
        } catch (error) {
            throw new Error(`Failed to start Picture in Picture: ${error.message}`);
        }
    }

    stopScreenCapture() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
    }
} 