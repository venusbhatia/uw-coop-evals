"use client";

import { useCallback, useRef, useState } from "react";

type STTStatus = "idle" | "connecting" | "listening" | "error";

const TARGET_SAMPLE_RATE = 16000;

function floatTo16kPcm(input: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === TARGET_SAMPLE_RATE) {
    const pcm = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm;
  }

  const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
  const outLength = Math.max(1, Math.floor(input.length / ratio));
  const pcm = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = Math.min(input.length - 1, Math.floor(i * ratio));
    const s = Math.max(-1, Math.min(1, input[srcIdx]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm;
}

/** Called with the full text that should appear in the answer field. */
export function useDeepgramSTT(onTranscript: (fullText: string) => void) {
  const [status, setStatus] = useState<STTStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const listeningRef = useRef(false);
  const committedRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);

  onTranscriptRef.current = onTranscript;

  const emitDisplayText = useCallback((interim: string) => {
    const base = committedRef.current.trim();
    const part = interim.trim();
    const full =
      base && part ? `${base} ${part}` : base || part;
    onTranscriptRef.current(full);
  }, []);

  const cleanup = useCallback(() => {
    listeningRef.current = false;
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "CloseStream" }));
      listeningRef.current = false;
      setTimeout(() => {
        cleanup();
        setStatus("idle");
        emitDisplayText("");
      }, 400);
      return;
    }
    cleanup();
    setStatus("idle");
  }, [cleanup, emitDisplayText]);

  const startListening = useCallback(
    async (seedText = "") => {
      setError(null);
      setStatus("connecting");
      committedRef.current = seedText.trim();

      try {
        const tokenRes = await fetch("/api/deepgram/stt-token", { method: "POST" });
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || !tokenData.enabled || !tokenData.token) {
          setEnabled(false);
          setError(tokenData.error ?? "Voice input unavailable.");
          setStatus("error");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
          },
        });
        streamRef.current = stream;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const inputSampleRate = audioContext.sampleRate;

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        gainRef.current = silentGain;

        const params = new URLSearchParams({
          model: "nova-2",
          encoding: "linear16",
          sample_rate: String(TARGET_SAMPLE_RATE),
          channels: "1",
          interim_results: "true",
          punctuate: "true",
          smart_format: "true",
          endpointing: "300",
        });

        const socket = new WebSocket(
          `wss://api.deepgram.com/v1/listen?${params.toString()}`,
          ["token", tokenData.token],
        );
        socketRef.current = socket;

        socket.onopen = () => {
          listeningRef.current = true;
          setStatus("listening");
          onTranscriptRef.current(committedRef.current);

          source.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(audioContext.destination);

          processor.onaudioprocess = (e) => {
            if (!listeningRef.current || socket.readyState !== WebSocket.OPEN) return;
            const input = e.inputBuffer.getChannelData(0);
            const pcm = floatTo16kPcm(input, inputSampleRate);
            socket.send(pcm.buffer);
          };
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string);

            if (data.type === "Metadata" || data.type === "SpeechStarted") return;

            const transcript =
              data.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
            if (!transcript) return;

            const isFinal =
              data.is_final === true ||
              data.speech_final === true ||
              data.type === "UtteranceEnd";

            if (isFinal) {
              committedRef.current = committedRef.current.trim()
                ? `${committedRef.current.trim()} ${transcript}`
                : transcript;
              emitDisplayText("");
            } else {
              emitDisplayText(transcript);
            }
          } catch {
            /* ignore malformed frames */
          }
        };

        socket.onerror = () => {
          setError("Speech connection failed.");
          setStatus("error");
          cleanup();
        };

        socket.onclose = () => {
          if (listeningRef.current) {
            listeningRef.current = false;
            setStatus("idle");
          }
        };
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Could not access microphone.";
        setError(msg);
        setStatus("error");
        cleanup();
      }
    },
    [cleanup, emitDisplayText],
  );

  return {
    status,
    error,
    enabled,
    isListening: status === "listening",
    startListening,
    stopListening,
  };
}
