"use client";

import { useCallStateHooks } from "@stream-io/video-react-sdk";
import { useEffect, useRef, useState } from "react";
import { pipeline } from "@huggingface/transformers";

const Mic = () => {
  const { useMicrophoneState } = useCallStateHooks();
  const { microphone, isMute, mediaStream } = useMicrophoneState();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const whisperRef = useRef<any>(null);
  const processingRef = useRef(false);
  const queueRef = useRef<Blob[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadLocalWhisper = async () => {
      try {
        setLoading(true);

        try {
          whisperRef.current = await pipeline(
            "automatic-speech-recognition",
            "onnx-community/whisper-tiny",
            { device: "webgpu" }
          );
        } catch {
          whisperRef.current = await pipeline(
            "automatic-speech-recognition",
            "onnx-community/whisper-tiny",
            { device: "wasm", dtype: "q8" }
          );
        }

        if (isMounted) {
          console.log("Whisper tiny initialized successfully.");
        }
      } catch (err) {
        console.error("Failed to load local Whisper model:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLocalWhisper();

    return () => {
      isMounted = false;
    };
  }, []);

  const processAudioQueue = async () => {
    if (processingRef.current || !whisperRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsTranscribing(true);

    const chunkBlob = queueRef.current.shift();

    if (chunkBlob) {
      let audioContext: AudioContext | null = null;
      try {
        const arrayBuffer = await chunkBlob.arrayBuffer();

        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

        audioContext = new AudioContextClass({ sampleRate: 16000 });
        const decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
        const float32Data = decodedAudio.getChannelData(0);

        const result = await whisperRef.current(float32Data, {
          task: "transcribe",
          language: "english",
        });

        const recognizedText = result?.text?.trim();

        if (recognizedText) {
          setText((prev) => `${prev} ${recognizedText}`.trim());
        }
      } catch (err) {
        console.error("Audio processing/transcription error:", err);
      } finally {
        if (audioContext && audioContext.state !== "closed") {
          await audioContext.close();
        }
      }
    }

    processingRef.current = false;

    if (queueRef.current.length > 0) {
      await processAudioQueue();
    } else {
      setIsTranscribing(false);
    }
  };

  useEffect(() => {
    if (!mediaStream || isMute || loading) {
      return;
    }

    const audioTracks = mediaStream.getAudioTracks();
    if (!audioTracks.length) return;

    const stream = new MediaStream(audioTracks);

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "";

    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        queueRef.current.push(event.data);
        processAudioQueue();
      }
    };

    recorder.start(3000);

    return () => {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
    };
  }, [mediaStream, isMute, loading]);

  const handleToggle = async () => {
    try {
      await microphone.toggle();
    } catch (err) {
      console.error("Failed to toggle microphone:", err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 max-w-md mx-auto rounded-xl border bg-card text-card-foreground shadow-sm">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
          loading
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : isMute
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
        }`}
      >
        {loading ? "Loading Whisper..." : isMute ? "🎤 Unmute Mic" : "🔴 Mute Mic"}
      </button>

      {isTranscribing && (
        <span className="text-xs text-amber-500 font-medium animate-pulse">
          Transcribing voice...
        </span>
      )}

      <div className="w-full min-h-[120px] max-h-[250px] overflow-y-auto p-4 rounded-md border bg-muted/30 text-sm">
        {loading ? (
          <span className="text-muted-foreground italic">Downloading and preparing Whisper ONNX model...</span>
        ) : text ? (
          <p className="leading-relaxed text-foreground whitespace-pre-wrap">{text}</p>
        ) : (
          <span className="text-muted-foreground italic">
            {isMute ? "Microphone is muted." : "Speak something, listening to stream..."}
          </span>
        )}
      </div>
    </div>
  );
};

export default Mic;