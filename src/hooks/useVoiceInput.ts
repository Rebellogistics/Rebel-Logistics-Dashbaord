import { useEffect, useRef, useState } from 'react';

// The browser API ships under two names depending on vendor. We treat both
// as the same loose interface — we only need start/stop/onresult.
interface SpeechRecognitionEventLike {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface UseVoiceInputResult {
  /** True when the API is available in this browser. */
  supported: boolean;
  /** True while recording. */
  listening: boolean;
  /** Begin listening; calls onTranscript with the running transcript. */
  start: () => void;
  /** Stop listening (also auto-stops on a long pause). */
  stop: () => void;
}

/**
 * Wraps the browser's SpeechRecognition API. Calls `onTranscript` with the
 * final transcript when the user stops speaking. Used for the voice-to-text
 * mic on the notes textarea.
 */
export function useVoiceInput(onTranscript: (text: string) => void): UseVoiceInputResult {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const ctor = getSpeechRecognitionCtor();
  const supported = !!ctor;

  // Keep latest callback in a ref so we don't have to recreate the recogniser
  // every render.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const start = () => {
    if (!ctor) return;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    const rec = new ctor();
    rec.lang = 'en-AU';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onTranscriptRef.current(transcript);
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const stop = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  };

  return { supported, listening, start, stop };
}
