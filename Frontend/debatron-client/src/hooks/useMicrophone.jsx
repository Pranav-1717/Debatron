// E:\Debatron\Frontend\my-debate-arena-frontend\src\hooks\useMicrophone.js
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';

const useMicrophone = () => {
  const { socket, currentPhase } = useSocket();
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const sendIntervalRef = useRef(null);

  // Determine the preferred MIME type for audio recording (WebM with Opus codec is preferred)
  const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
    ? 'audio/ogg;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
    ? 'audio/webm'
    : 'audio/ogg'; // Fallback to basic webm/ogg if opus not supported

  console.log("Using audio MIME type:", preferredMimeType);

  // Callback to accumulate audio data chunks
  const handleDataAvailable = useCallback((event) => {
    if (event.data.size > 0) {
      audioChunksRef.current.push(event.data);
    }
  }, []);

  // Callback for when recording stops
  const handleStop = useCallback(() => {
    console.log('MediaRecorder stopped.');
  }, []);

  // Function to send accumulated audio chunks over the socket
  const sendAudioChunks = useCallback(() => {
    // Microphone is active and sending data only during the 'debate-start' phase
    const isSpeakingPhase = currentPhase === 'debate-start';
    if (audioChunksRef.current.length > 0 && socket?.connected && isSpeakingPhase) {
      const blob = new Blob(audioChunksRef.current, { type: preferredMimeType });
      socket.emit('audio-stream', { audio: blob }); // Emit audio blob to backend
      audioChunksRef.current = []; // Clear chunks after sending
    }
  }, [socket, preferredMimeType, currentPhase]);


  // Function to start microphone recording
  const startRecording = useCallback(async () => {
    if (!socket || !socket.connected) {
      console.error("Socket is not connected. Cannot start recording.");
      alert("Error: Real-time connection not established. Please refresh the page.");
      return;
    }
    if (isRecording) {
        console.warn("Already recording. Skipping startRecording call.");
        return;
    }

    try {
      // Request microphone access from the user
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream; // Store the MediaStream to stop tracks later

      // Create a new MediaRecorder instance
      const recorder = new MediaRecorder(stream, { mimeType: preferredMimeType });
      setMediaRecorder(recorder);

      recorder.ondataavailable = handleDataAvailable; // Set event handler for data availability
      recorder.onstop = handleStop; // Set event handler for when recording stops

      recorder.start(500); // Start recording, collecting data every 500ms
      console.log('MediaRecorder started.');
      setIsRecording(true); // Update recording state

      // Set up an interval to send accumulated audio chunks every 1 second
      sendIntervalRef.current = setInterval(sendAudioChunks, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert(`Could not access microphone: ${error.message}. Please check permissions in your browser settings.`);
      setIsRecording(false); // Reset recording state on error
      // Clean up any active stream or interval if an error occurs
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
        sendIntervalRef.current = null;
      }
    }
  }, [socket, isRecording, handleDataAvailable, handleStop, sendAudioChunks, preferredMimeType]);


  // Function to stop microphone recording
  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop(); // Stop the MediaRecorder
      console.log('MediaRecorder stopping.');
      setIsRecording(false); // Update recording state

      // Clear the interval for sending audio chunks
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
        sendIntervalRef.current = null;
      }
      // Stop all tracks on the MediaStream (turns off mic light)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      audioChunksRef.current = []; // Clear any remaining audio data
    }
  }, [mediaRecorder, isRecording]);

  // Effect to automatically stop recording when the phase changes and mic should no longer be active
  useEffect(() => {
    // Microphone is only active during the 'debate-start' phase for sending data
    const isSpeakingPhase = currentPhase === 'debate-start';
    if (!isSpeakingPhase && isRecording) { // If not in speaking phase but still recording
      console.log(`Stopping microphone due to phase change: ${currentPhase}`);
      stopRecording(); // Call the stop recording function
    }
  }, [currentPhase, isRecording, stopRecording]); // Dependencies for this effect


  // Cleanup effect: Ensure microphone is stopped when the component unmounts
  useEffect(() => {
    return () => {
      stopRecording(); // Clean up on component unmount
    };
  }, [stopRecording]); // Dependency array: ensure cleanup function is stable

  // Return the recording state and control functions
  return { isRecording, startRecording, stopRecording };
};

export default useMicrophone;