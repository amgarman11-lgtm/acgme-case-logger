import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Minimal local typings for the Web Speech API (avoids depending on whether the
// installed lib.dom.d.ts ships SpeechRecognition, and avoids global redeclare).
interface SpeechResultAlt {
  transcript: string
}
interface SpeechResult {
  isFinal: boolean
  readonly length: number
  [index: number]: SpeechResultAlt
}
interface SpeechResultList {
  readonly length: number
  [index: number]: SpeechResult
}
interface SpeechRecognitionEvt {
  resultIndex: number
  results: SpeechResultList
}
interface SpeechRecognitionErrEvt {
  error: string
}
interface SpeechRecognitionInstance {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEvt) => void) | null
  onerror: ((e: SpeechRecognitionErrEvt) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

interface StartOptions {
  continuous?: boolean
  lang?: string
}

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function friendlyError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access denied. Allow it in your browser/site settings.'
    case 'no-speech':
      return 'No speech detected — tap the mic and try again.'
    case 'audio-capture':
      return 'No microphone found.'
    case 'network':
      return 'Network error during speech recognition.'
    case 'aborted':
      return ''
    default:
      return `Speech recognition error: ${code}`
  }
}

// Web Speech API wrapper.
// - Per-field mode (default): one utterance per tap — most reliable on iOS.
// - Continuous mode (master dictation): keeps capturing across pauses by
//   auto-restarting on `end` (iOS ends after each phrase) until stop() is called.
// Always pair with manual text editing as a fallback.
export function useSpeech() {
  const ctor = useMemo(getCtor, [])
  const recRef = useRef<SpeechRecognitionInstance | null>(null)
  const keepAliveRef = useRef(false)
  const continuousRef = useRef(false)
  const langRef = useRef('en-US')
  const onFinalRef = useRef<((text: string) => void) | null>(null)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  const begin = useCallback(() => {
    if (!ctor) return
    const rec = new ctor()
    rec.lang = langRef.current
    rec.interimResults = true
    rec.continuous = continuousRef.current
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let interimText = ''
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const txt = res[0]?.transcript ?? ''
        if (res.isFinal) finalText += txt
        else interimText += txt
      }
      setInterim(interimText)
      if (finalText) {
        onFinalRef.current?.(finalText)
        setInterim('')
      }
    }
    rec.onerror = (e) => {
      // Stop auto-restarting on terminal errors (e.g. denied mic) so continuous
      // mode can't spin in a tight restart loop.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
        keepAliveRef.current = false
      }
      const msg = friendlyError(e.error)
      if (msg) setError(msg)
    }
    rec.onend = () => {
      if (keepAliveRef.current) {
        // Continuous: restart to keep listening past the utterance boundary.
        try {
          begin()
        } catch {
          keepAliveRef.current = false
          setListening(false)
          setInterim('')
        }
      } else {
        setListening(false)
        setInterim('')
      }
    }

    recRef.current = rec
    try {
      rec.start()
    } catch {
      setError('Could not start the microphone — try again.')
      keepAliveRef.current = false
      setListening(false)
    }
  }, [ctor])

  const start = useCallback(
    (onFinal: (text: string) => void, opts: StartOptions = {}) => {
      if (!ctor) return
      recRef.current?.abort()
      onFinalRef.current = onFinal
      langRef.current = opts.lang ?? 'en-US'
      continuousRef.current = !!opts.continuous
      keepAliveRef.current = !!opts.continuous
      setError(null)
      setInterim('')
      setListening(true)
      begin()
    },
    [ctor, begin],
  )

  const stop = useCallback(() => {
    keepAliveRef.current = false
    recRef.current?.stop()
  }, [])

  useEffect(
    () => () => {
      keepAliveRef.current = false
      recRef.current?.abort()
    },
    [],
  )

  return { supported: ctor !== null, listening, interim, error, start, stop }
}
