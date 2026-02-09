import { useState, useEffect, useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'

// ---- CONFIG ----
const WORKER_URL = 'https://wylders-trivia-api.vancliefmedia.workers.dev'
const MAX_WEEKLY_GENS = 10
const QUESTIONS_PER_QUIZ = 35

const TOPICS = [
  { id: 'science', icon: '🔬', label: 'Science & Nature' },
  { id: 'history', icon: '🏛️', label: 'History & Geography' },
  { id: 'animals', icon: '🦊', label: 'Animals & Wildlife' },
  { id: 'space', icon: '🚀', label: 'Space & Astronomy' },
  { id: 'books', icon: '📚', label: 'Books & Mythology' },
  { id: 'math', icon: '🧩', label: 'Math & Logic' },
  { id: 'random', icon: '🎲', label: 'Surprise Me!' },
]

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', color: 'easy' },
  { id: 'medium', label: 'Medium', color: 'medium' },
  { id: 'hard', label: 'Hard', color: 'hard' },
  { id: 'expert', label: 'Expert', color: 'expert' },
]

const LOADING_MESSAGES = [
  'Exploring the universe of knowledge...',
  'Crafting brain-tickling questions...',
  'Searching through ancient scrolls...',
  'Consulting the oracle of trivia...',
  'Gathering fascinating facts...',
  'Assembling your adventure...',
]

// ---- HELPERS ----
function getWeekKey() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7)
  return `trivia_week_${now.getFullYear()}_${week}`
}

function getGenCount() {
  const key = getWeekKey()
  return parseInt(localStorage.getItem(key) || '0', 10)
}

function incrementGenCount() {
  const key = getWeekKey()
  const count = getGenCount() + 1
  localStorage.setItem(key, count.toString())
  return count
}

function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#f6c445', '#34d399', '#38bdf8', '#a78bfa', '#fb7185'],
  })
}

function fireBigConfetti() {
  const duration = 2000
  const end = Date.now() + duration
  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#f6c445', '#34d399', '#38bdf8'],
    })
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#a78bfa', '#fb7185', '#f6c445'],
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

// ---- STARS BACKGROUND ----
function StarField() {
  const stars = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      size: Math.random() * 2 + 1,
    }))
  ).current

  return (
    <div className="stars">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

// ---- TOPIC PICKER ----
function TopicPicker({ selected, onSelect }) {
  return (
    <div className="topic-grid">
      {TOPICS.map((t) => (
        <div
          key={t.id}
          className={`topic-card ${selected === t.id ? 'selected' : ''}`}
          onClick={() => onSelect(t.id)}
        >
          <span className="topic-icon">{t.icon}</span>
          <span className="topic-label">{t.label}</span>
        </div>
      ))}
    </div>
  )
}

// ---- QUESTION COMPONENT ----
function QuestionView({ question, index, total, onAnswer, answered }) {
  const [fillInput, setFillInput] = useState('')
  const [shakeClass, setShakeClass] = useState('')
  const inputRef = useRef(null)

  const typeBadge = {
    multiple_choice: { cls: 'badge-mc', label: 'Multiple Choice' },
    true_false: { cls: 'badge-tf', label: 'True or False' },
    fill_in: { cls: 'badge-fi', label: 'Fill in the Blank' },
    image: { cls: 'badge-img', label: 'Picture Question' },
  }

  const badge = typeBadge[question.type] || typeBadge.multiple_choice

  const handleOptionClick = (optionIndex) => {
    if (answered) return
    const isCorrect = optionIndex === question.correct_index
    if (isCorrect) fireConfetti()
    else {
      setShakeClass('shake')
      setTimeout(() => setShakeClass(''), 400)
    }
    onAnswer(isCorrect, optionIndex)
  }

  const handleFillSubmit = () => {
    if (!fillInput.trim() || answered) return
    const userAnswer = fillInput.trim().toLowerCase()
    const correctAnswer = question.answer.toLowerCase()
    // flexible matching: check if answer contains the key word or vice versa
    const isCorrect =
      userAnswer === correctAnswer ||
      correctAnswer.includes(userAnswer) ||
      userAnswer.includes(correctAnswer)
    if (isCorrect) fireConfetti()
    else {
      setShakeClass('shake')
      setTimeout(() => setShakeClass(''), 400)
    }
    onAnswer(isCorrect, fillInput.trim())
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleFillSubmit()
  }

  return (
    <div className={`question-card ${shakeClass}`}>
      <span className={`question-type-badge ${badge.cls}`}>{badge.label}</span>
      <div className="question-number">Question {index + 1} of {total}</div>
      <div className="question-text">{question.question}</div>

      {question.image_query && (
        <img
          className="question-image"
          src={`https://source.unsplash.com/800x400/?${encodeURIComponent(question.image_query)}`}
          alt="Question illustration"
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )}

      {question.hint && <div className="question-hint">💡 Hint: {question.hint}</div>}

      {(question.type === 'multiple_choice' || question.type === 'true_false' || question.type === 'image') && (
        <div className="options-grid">
          {question.options.map((opt, i) => {
            let cls = 'option-btn'
            if (answered) {
              if (i === question.correct_index) cls += ' correct reveal-correct'
              else if (i === answered.selected && i !== question.correct_index) cls += ' wrong'
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => handleOptionClick(i)}
                disabled={answered !== null}
              >
                <span className="option-letter">
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {question.type === 'fill_in' && (
        <div className="fill-in-row">
          <input
            ref={inputRef}
            className={`fill-in-input ${answered ? (answered.correct ? 'correct' : 'wrong') : ''}`}
            type="text"
            placeholder="Type your answer..."
            value={fillInput}
            onChange={(e) => setFillInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={answered !== null}
            autoFocus
          />
          {!answered && (
            <button className="submit-answer-btn" onClick={handleFillSubmit}>
              Check
            </button>
          )}
        </div>
      )}

      {answered && (
        <div className={`feedback ${answered.correct ? 'correct' : 'wrong'}`}>
          <span className="feedback-emoji">{answered.correct ? '🎉' : '💫'}</span>
          {answered.correct ? 'Awesome! ' : `The answer was: ${question.type === 'fill_in' ? question.answer : question.options[question.correct_index]}. `}
          {question.explanation || ''}
        </div>
      )}
    </div>
  )
}

// ---- RESULTS SCREEN ----
function Results({ correct, total, bestStreak, onPlayAgain }) {
  const pct = Math.round((correct / total) * 100)

  useEffect(() => {
    if (pct >= 70) fireBigConfetti()
  }, [pct])

  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '👏' : '💪'
  const msg =
    pct >= 90
      ? "Incredible! You're a true trivia champion!"
      : pct >= 70
        ? 'Great job! You really know your stuff!'
        : pct >= 50
          ? "Nice work! You're learning a lot!"
          : "Keep exploring! Every question makes you smarter!"

  return (
    <div className="results-container">
      <span className="results-emoji">{emoji}</span>
      <h2 className="results-title">Quiz Complete!</h2>
      <div className="results-score">{pct}%</div>
      <p className="results-message">{msg}</p>
      <div className="results-stats">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-correct)' }}>{correct}</div>
          <div className="stat-label">Correct</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-wrong)' }}>{total - correct}</div>
          <div className="stat-label">Missed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--color-gold)' }}>{bestStreak}🔥</div>
          <div className="stat-label">Best Streak</div>
        </div>
      </div>
      <button className="play-again-btn" onClick={onPlayAgain}>
        🚀 Play Again
      </button>
    </div>
  )
}

// ---- MAIN APP ----
export default function App() {
  const [screen, setScreen] = useState('home') // home, loading, quiz, results, error
  const [topic, setTopic] = useState('random')
  const [difficulty, setDifficulty] = useState('medium')
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [genCount, setGenCount] = useState(getGenCount())
  const [error, setError] = useState('')
  const [loadingMsg, setLoadingMsg] = useState('')

  // cycle loading messages
  useEffect(() => {
    if (screen !== 'loading') return
    let i = 0
    setLoadingMsg(LOADING_MESSAGES[0])
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[i])
    }, 2500)
    return () => clearInterval(interval)
  }, [screen])

  const generateQuiz = useCallback(async () => {
    if (genCount >= MAX_WEEKLY_GENS) {
      setError("You've used all 10 quiz generations this week! Come back next week for more adventures. 🗓️")
      setScreen('error')
      return
    }

    setScreen('loading')
    setQuestions([])
    setCurrentQ(0)
    setAnswers([])
    setScore(0)
    setStreak(0)
    setBestStreak(0)

    const topicLabel = TOPICS.find((t) => t.id === topic)?.label || 'random topics'
    const diffLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1)

    const prompt = `Generate a trivia quiz for a very smart 8-year-old named Wylder who reads well above her grade level.

Topic: ${topicLabel}
Difficulty: ${diffLabel}
Number of questions: ${QUESTIONS_PER_QUIZ}

IMPORTANT: Respond with ONLY a valid JSON array, no other text. Each item must have this exact structure:

For multiple_choice questions:
{"type":"multiple_choice","question":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"...","image_query":null,"hint":null}

For true_false questions:
{"type":"true_false","question":"...","options":["True","False"],"correct_index":0,"explanation":"...","image_query":null,"hint":null}

For fill_in questions:
{"type":"fill_in","question":"...","answer":"one or two word answer","explanation":"...","image_query":null,"hint":"..."}

For image-based questions (use a descriptive Unsplash search term for image_query):
{"type":"image","question":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"...","image_query":"descriptive search term","hint":null}

Rules:
- Mix of types: ~50% multiple choice, ~15% true/false, ~15% fill in, ~20% image-based
- Questions should be genuinely interesting and teach cool facts
- Explanations should be fun and educational (1-2 sentences)
- fill_in answers must be short (1-2 words)
- image_query should be specific Unsplash search terms when used (e.g. "monarch butterfly migration" not just "butterfly")
- Include hints for harder questions
- ${difficulty === 'easy' ? 'Keep it fun and confidence-building' : difficulty === 'hard' ? 'Challenge her with deeper knowledge' : difficulty === 'expert' ? 'Make it genuinely challenging, university-level concepts explained simply' : 'A good mix of easy and challenging'}
- Make sure facts are ACCURATE
- For ${topic === 'random' ? 'random topics, pick an exciting mix of science, history, animals, space, mythology, and geography' : topicLabel}

Return ONLY the JSON array.`

    try {
      const workerUrl = WORKER_URL || localStorage.getItem('trivia_worker_url') || ''
      if (!workerUrl) {
        setError("No Worker URL configured. Add your Cloudflare Worker URL in the settings.")
        setScreen('error')
        return
      }

      const res = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`API error (${res.status}): ${errText}`)
      }

      const data = await res.json()

      // Claude returns content array, extract text
      let text = ''
      if (data.content && Array.isArray(data.content)) {
        text = data.content.map((c) => c.text || '').join('')
      } else if (typeof data === 'string') {
        text = data
      } else if (data.text) {
        text = data.text
      } else {
        text = JSON.stringify(data)
      }

      // extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('Could not parse quiz data from response')

      const parsed = JSON.parse(jsonMatch[0])
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty quiz data')

      setQuestions(parsed)
      setAnswers(new Array(parsed.length).fill(null))
      const newCount = incrementGenCount()
      setGenCount(newCount)
      setScreen('quiz')
    } catch (err) {
      console.error('Quiz generation failed:', err)
      setError(err.message || 'Something went wrong generating the quiz.')
      setScreen('error')
    }
  }, [topic, difficulty, genCount])

  const handleAnswer = (isCorrect, selected) => {
    const newAnswers = [...answers]
    newAnswers[currentQ] = { correct: isCorrect, selected }
    setAnswers(newAnswers)

    if (isCorrect) {
      const newScore = score + 1
      const newStreak = streak + 1
      setScore(newScore)
      setStreak(newStreak)
      if (newStreak > bestStreak) setBestStreak(newStreak)
    } else {
      setStreak(0)
    }
  }

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      setScreen('results')
    }
  }

  const goHome = () => {
    setScreen('home')
    setQuestions([])
    setCurrentQ(0)
    setAnswers([])
  }

  // Settings modal for worker URL
  const [showSettings, setShowSettings] = useState(false)
  const [workerInput, setWorkerInput] = useState(
    localStorage.getItem('trivia_worker_url') || ''
  )

  const saveWorkerUrl = () => {
    localStorage.setItem('trivia_worker_url', workerInput)
    setShowSettings(false)
  }

  const needsSetup = !WORKER_URL && !localStorage.getItem('trivia_worker_url')

  return (
    <>
      <div className="app-bg">
        <StarField />
      </div>

      <div className="app-container">
        <header className="header">
          <span className="header-icon">🧠</span>
          <h1>Wylder's Infinite Trivia</h1>
          <p>Explore everything. Learn anything.</p>
          <div className="gen-counter">
            ⚡ {MAX_WEEKLY_GENS - genCount} quizzes left this week
          </div>
        </header>

        {/* Settings gear */}
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 100,
            cursor: 'pointer',
            fontSize: 24,
            opacity: 0.5,
            transition: 'opacity 0.2s',
          }}
          onClick={() => setShowSettings(true)}
          onMouseEnter={(e) => (e.target.style.opacity = 1)}
          onMouseLeave={(e) => (e.target.style.opacity = 0.5)}
          title="Settings"
        >
          ⚙️
        </div>

        {/* Settings modal */}
        {showSettings && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false) }}
          >
            <div
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius)',
                padding: 28,
                maxWidth: 420,
                width: '100%',
              }}
            >
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 16, color: 'var(--color-gold)' }}>
                ⚙️ Settings
              </h3>
              <label style={{ fontSize: 14, color: 'var(--color-text-dim)', display: 'block', marginBottom: 8 }}>
                Cloudflare Worker URL
              </label>
              <input
                type="url"
                value={workerInput}
                onChange={(e) => setWorkerInput(e.target.value)}
                placeholder="https://trivia-worker.your-name.workers.dev"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '2px solid rgba(255,255,255,0.1)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  marginBottom: 16,
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: 'var(--color-text-dim)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveWorkerUrl}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'var(--color-gold)',
                    color: 'var(--color-bg)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HOME SCREEN */}
        {screen === 'home' && (
          <>
            {needsSetup && (
              <div
                style={{
                  background: 'rgba(246,196,69,0.1)',
                  border: '1px solid rgba(246,196,69,0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 18px',
                  marginBottom: 20,
                  maxWidth: 600,
                  width: '100%',
                  fontSize: 14,
                  color: 'var(--color-gold)',
                  textAlign: 'center',
                }}
              >
                👋 First time? Click ⚙️ to add your Cloudflare Worker URL
              </div>
            )}
            <TopicPicker selected={topic} onSelect={setTopic} />
            <div className="difficulty-row">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  className={`diff-btn ${difficulty === d.id ? `active-${d.color}` : ''}`}
                  onClick={() => setDifficulty(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button
              className="generate-btn"
              onClick={generateQuiz}
              disabled={genCount >= MAX_WEEKLY_GENS}
            >
              🚀 Generate Quiz
            </button>
          </>
        )}

        {/* LOADING */}
        {screen === 'loading' && (
          <div className="loading-container">
            <div className="loading-spinner" />
            <div className="loading-text">{loadingMsg}</div>
            <div className="loading-sub">This usually takes 10-15 seconds</div>
          </div>
        )}

        {/* QUIZ */}
        {screen === 'quiz' && questions.length > 0 && (
          <div className="quiz-container">
            <div className="quiz-header">
              <div className="quiz-title">
                {TOPICS.find((t) => t.id === topic)?.icon}{' '}
                {TOPICS.find((t) => t.id === topic)?.label}
              </div>
              <div className="quiz-progress">
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                  />
                </div>
                {currentQ + 1}/{questions.length}
              </div>
            </div>

            <div className="score-display">
              <span className="score-correct">✓ {score}</span>
              <span className="score-wrong">✗ {currentQ - score + (answers[currentQ] ? 0 : 0)}</span>
              {streak >= 2 && <span className="streak-display">{streak} streak 🔥</span>}
            </div>

            <QuestionView
              key={currentQ}
              question={questions[currentQ]}
              index={currentQ}
              total={questions.length}
              onAnswer={handleAnswer}
              answered={answers[currentQ]}
            />

            {answers[currentQ] && (
              <button className="next-btn" onClick={nextQuestion}>
                {currentQ < questions.length - 1 ? 'Next Question →' : '🏁 See Results'}
              </button>
            )}
          </div>
        )}

        {/* RESULTS */}
        {screen === 'results' && (
          <Results
            correct={score}
            total={questions.length}
            bestStreak={bestStreak}
            onPlayAgain={goHome}
          />
        )}

        {/* ERROR */}
        {screen === 'error' && (
          <div className="error-container">
            <div className="error-emoji">😕</div>
            <div className="error-text">Oops!</div>
            <div className="error-detail">{error}</div>
            <button className="retry-btn" onClick={goHome}>
              ← Back Home
            </button>
          </div>
        )}
      </div>
    </>
  )
}
