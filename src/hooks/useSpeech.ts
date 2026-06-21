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
      return '' // user-initiated stop; not a real error
    default:
      return `Speech recognition error: ${code}`
  }
}

// Web Speech API wrapper. Uses non-continuous recognition (one utterance per
// tap), which is the most reliable mode on iOS Safari, where dictation tends to
// end after each phrase. Always pair with manual text editing as a fallback.
export function useSpeech() {
  const ctor = useMemo(getCtor, [])
  const recRef = useRef<SpeechRecognitionInstance | null>(null)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  const start = useCallback(
    (onFinal: (text: string) => void, lang = 'en-US') => {
      if (!ctor) return
      // Tear down any previous instance so only one mic session runs at a time.
      recRef.current?.abort()

      const rec = new ctor()
      rec.lang = lang
      rec.interimResults = true
      rec.continuous = false
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
          onFinal(finalText)
          setInterim('')
        }
      }
      rec.onerror = (e) => {
        const msg = friendlyError(e.error)
        if (msg) setError(msg)
      }
      rec.onend = () => {
        setListening(false)
        setInterim('')
      }

      recRef.current = rec
      setError(null)
      setInterim('')
      try {
        rec.start()
        setListening(true)
      } catch {
        // Calling start() twice quickly can throw; surface a soft message.
        setError('Could not start the microphone — try again.')
        setListening(false)
      }
    },
    [ctor],
  )

  useEffect(() => () => recRef.current?.abort(), [])

  return { supported: ctor !== null, listening, interim, error, start, stop }
}
