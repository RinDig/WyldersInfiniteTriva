import { useState, useEffect, useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'
import questionBank from './data/questions.json'

// ---- CONFIG ----
const WORKER_URL = 'https://wylders-trivia-api.vancliefmedia.workers.dev'
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

// ---- PROGRESS TRACKING ----
function getProgress() {
  const data = localStorage.getItem('wylder_progress')
  if (!data) return { totalQuizzes: 0, topicStats: {}, achievements: [] }
  return JSON.parse(data)
}

function saveProgress(progress) {
  localStorage.setItem('wylder_progress', JSON.stringify(progress))
}

function updateProgress(topic, difficulty, score, total) {
  const progress = getProgress()
  progress.totalQuizzes = (progress.totalQuizzes || 0) + 1

  if (!progress.topicStats[topic]) {
    progress.topicStats[topic] = { played: 0, totalCorrect: 0, totalQuestions: 0 }
  }
  progress.topicStats[topic].played++
  progress.topicStats[topic].totalCorrect += score
  progress.topicStats[topic].totalQuestions += total

  // Check for achievements
  const pct = Math.round((score / total) * 100)
  if (pct === 100 && !progress.achievements.includes('perfect')) {
    progress.achievements.push('perfect')
  }
  if (progress.totalQuizzes === 10 && !progress.achievements.includes('explorer')) {
    progress.achievements.push('explorer')
  }
  if (difficulty === 'expert' && pct >= 80 && !progress.achievements.includes('expert')) {
    progress.achievements.push('expert')
  }

  saveProgress(progress)
  return progress
}

// ---- HELPERS ----
function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
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
function Results({ correct, total, bestStreak, aiMessage, onPlayAgain }) {
  const pct = Math.round((correct / total) * 100)

  useEffect(() => {
    if (pct >= 70) fireBigConfetti()
  }, [pct])

  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🌟' : pct >= 50 ? '👏' : '💪'

  return (
    <div className="results-container">
      <span className="results-emoji">{emoji}</span>
      <h2 className="results-title">Quiz Complete!</h2>
      <div className="results-score">{pct}%</div>

      {aiMessage && (
        <div className="ai-message">
          <div className="ai-coach-header">🤖 Your AI Coach Says:</div>
          <div className="ai-coach-text">{aiMessage}</div>
        </div>
      )}

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
  const [screen, setScreen] = useState('home') // home, quiz, results, error
  const [topic, setTopic] = useState('random')
  const [difficulty, setDifficulty] = useState('medium')
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [error, setError] = useState('')
  const [aiMessage, setAiMessage] = useState('')
  const [progress] = useState(getProgress())

  const generateQuiz = useCallback(() => {
    setQuestions([])
    setCurrentQ(0)
    setAnswers([])
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setAiMessage('')

    try {
      // Get questions from the bank
      let availableQuestions = []

      if (topic === 'random') {
        // Mix from all topics
        TOPICS.filter(t => t.id !== 'random').forEach(t => {
          const topicQuestions = questionBank[t.id]?.[difficulty] || []
          availableQuestions.push(...topicQuestions)
        })
      } else {
        availableQuestions = questionBank[topic]?.[difficulty] || []
      }

      if (availableQuestions.length === 0) {
        throw new Error('No questions available for this topic/difficulty!')
      }

      // Shuffle and select
      const shuffled = shuffleArray(availableQuestions)
      const selected = shuffled.slice(0, Math.min(QUESTIONS_PER_QUIZ, shuffled.length))

      // If we need more questions, cycle through again
      while (selected.length < QUESTIONS_PER_QUIZ) {
        selected.push(...shuffled.slice(0, QUESTIONS_PER_QUIZ - selected.length))
      }

      setQuestions(selected)
      setAnswers(new Array(selected.length).fill(null))
      setScreen('quiz')
    } catch (err) {
      console.error('Quiz generation failed:', err)
      setError(err.message || 'Something went wrong generating the quiz.')
      setScreen('error')
    }
  }, [topic, difficulty])

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
      finishQuiz()
    }
  }

  const finishQuiz = async () => {
    const pct = Math.round((score / questions.length) * 100)
    const updatedProgress = updateProgress(topic, difficulty, score, questions.length)

    // Generate AI personalized message
    const topicLabel = TOPICS.find(t => t.id === topic)?.label || 'various topics'
    const prompt = `You are an enthusiastic AI coach for Wylder, a smart 8-year-old who just finished a ${difficulty} trivia quiz on ${topicLabel}.

She got ${score} out of ${questions.length} correct (${pct}%).
Her best streak was ${bestStreak} in a row.
She's completed ${updatedProgress.totalQuizzes} total quizzes.

Write a SHORT (2-3 sentences max), personalized, encouraging message for Wylder. Make it:
- Specific to her performance
- Encouraging but honest
- Fun and enthusiastic
- Suggest what she might try next (harder difficulty, new topic, etc.)

Just the message, no labels or formatting.`

    setScreen('results')

    // Get AI message in background
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (res.ok) {
        const data = await res.json()
        let text = ''
        if (data.content && Array.isArray(data.content)) {
          text = data.content.map((c) => c.text || '').join('')
        }
        setAiMessage(text.trim())
      }
    } catch (err) {
      console.log('AI message failed, continuing without it:', err)
    }
  }

  const goHome = () => {
    setScreen('home')
    setQuestions([])
    setCurrentQ(0)
    setAnswers([])
    setAiMessage('')
  }

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
          {progress.totalQuizzes > 0 && (
            <div className="gen-counter">
              ⭐ {progress.totalQuizzes} quizzes completed!
            </div>
          )}
        </header>

        {/* HOME SCREEN */}
        {screen === 'home' && (
          <>
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
            >
              🚀 Start Quiz
            </button>
          </>
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
            aiMessage={aiMessage}
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
