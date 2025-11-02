(async () => {
console.log("Hello from main.js");

const MODEL_URL = '/static/weights';

document.addEventListener('DOMContentLoaded', () => {

    const video = document.getElementById('webcam');
    const snapButton = document.getElementById('snapButton');
    const snapshotImage = document.getElementById('snapshot');

    const canvas = document.createElement('canvas');

    async function loadModels() {
        console.log("Loading models...");
        try {
            await faceapi.nets.mtcnn.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

            console.log("Models loaded successfully");
            snapButton.disabled = false;
        } catch (err) {
            console.error("Error loading models: ", err);
            alert("Could not load face detection models. Please refresh the page.");
        }
    }

    const constraints = {
        audio: false,
        video: {
            width: 640,
            height: 480
        }
    };

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
            };
        } catch (err) {
            console.error("Camera access error: ", err);
            alert("Check an access to your camera.");
        }
    }

    async function sendFaceToServer(faceBlob, type) {
        console.log("Sending face to server...");
        const formData = new FormData();
        formData.append('image', faceBlob);
        formData.append('type', type);

        try {
            const response = await fetch('/login', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log("Server response:", result);
            alert(`Recognition result: ${result.name || 'Unknown'}`);

        } catch (err) {
            console.error("Error sending data to server: ", err);
            alert("Could not send face for recognition.");
        }
    }

    async function detectAndSendFace() {
    console.log("Detecting face...");

    const mtcnnOptions = new faceapi.MtcnnOptions({
        minFaceSize: 100
    });

    const detection = await faceapi.detectSingleFace(video, mtcnnOptions)
                                 .withFaceLandmarks();

    if (!detection) {
        console.log("No face detected.");
        alert("No face detected. Please try again.");
        return;
    }

    console.log("Face detected!", {detection});

    const canvas = document.getElementById('canvas');
    const box = detection.detection._box;

    canvas.width = box.width;
    canvas.height = box.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.drawImage(
        video,
        box.x,
        box.y,
        box.width,
        box.height,
        0,
        0,
        box.width,
        box.height
    );

    const imageDataURL = canvas.toDataURL('image/png');

    snapshotImage.src = imageDataURL;
    snapshotImage.style.display = 'block';

    canvas.toBlob(async (blob) => {
                if (blob) {
                    const imageDataURL = URL.createObjectURL(blob);
                    snapshotImage.src = imageDataURL;
                    snapshotImage.style.display = 'block';

                    await sendFaceToServer(blob, 'biometric');

                    URL.revokeObjectURL(imageDataURL);

                } else {
                    console.error("Failed to create blob from canvas.");
                    alert("Failed to capture face for sending.");
                }
            }, 'image/png');
}

    snapButton.disabled = true;

    loadModels();

    startCamera();

    snapButton.addEventListener('click', detectAndSendFace);

});
})();
