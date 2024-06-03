import React, { useState, useRef, useEffect } from 'react';

const VoiceRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [permission, setPermission] = useState('idle'); // idle, granted, denied
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioElementRef = useRef(null);
  const animationIdRef = useRef(null);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermission('granted');
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately after permission is granted
    } catch (error) {
      setPermission('denied');
      console.error('Microphone access denied', error);
    }
  };

  const startRecording = async () => {
    if (recording || permission !== 'granted') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        audioChunksRef.current = [];
        cancelAnimationFrame(animationIdRef.current);
        audioContext.close();
      };

      mediaRecorder.start();
      setRecording(true);
      visualize(analyser);
    } catch (error) {
      console.error('Error accessing microphone', error);
    }
  };

  const stopRecording = () => {
    if (!recording) return;

    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const visualize = (analyser) => {
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = 'rgb(0, 0, 0)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
        x += barWidth + 1;
      }

      animationIdRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const handlePlayback = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audioElementRef.current);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    visualize(analyser);
  };

  const stopVisualization = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    cancelAnimationFrame(animationIdRef.current);
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      cancelAnimationFrame(animationIdRef.current);
    };
  }, []);

  return (
    <div>
      <h1>Voice Recorder</h1>
      {permission === 'idle' && (
        <button onClick={requestMicrophonePermission}>
          Request Microphone Permission
        </button>
      )}
      {permission === 'denied' && (
        <p>Microphone access denied. Please allow access in your browser settings.</p>
      )}
      {permission === 'granted' && (
        <div>
          <button onClick={startRecording} disabled={recording}>
            Start Recording
          </button>
          <button onClick={stopRecording} disabled={!recording}>
            Stop Recording
          </button>
        </div>
      )}
      {audioURL && (
        <div>
          <h2>Recorded Audio</h2>
          <audio
            ref={audioElementRef}
            controls
            src={audioURL}
            onPlay={handlePlayback}
            onPause={stopVisualization}
            onEnded={stopVisualization}
          ></audio>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width="600"
        height="200"
        style={{ border: '1px solid black' }}
      ></canvas>
    </div>
  );
};

export default VoiceRecorder;
