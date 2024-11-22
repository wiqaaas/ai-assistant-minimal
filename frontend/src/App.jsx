import { useState, useRef, useEffect } from 'react'
import { Input } from './components/ui/input'
import { Button } from './components/ui/button'
import { Textarea } from './components/ui/textarea'
import { Card, CardContent } from './components/ui/card'
import { cn } from './lib/utils'
import { processVideo, askQuestion, askQuestionWithoutImage, processLocalVideo } from './lib/api'
import { Send, Upload, Camera } from 'lucide-react'
import wcdLogo from './assets/logo.png'
import html2canvas from 'html2canvas'
import { QuizModal } from './components/QuizModal'
import demoVideo from './assets/demo.mp4'


function App() {
  const [summary, setSummary] = useState('')
  const [question, setQuestion] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAsking, setIsAsking] = useState(false)
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [messages, setMessages] = useState([])
  const [currentScreenshot, setCurrentScreenshot] = useState(null)
  const [defaultScreenshot, setDefaultScreenshot] = useState(null)
  const [localVideo, setLocalVideo] = useState(null)
  const [isLocalVideo, setIsLocalVideo] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [currentQuiz, setCurrentQuiz] = useState(null)
  const [completedQuizzes, setCompletedQuizzes] = useState(new Set())
  const videoRef = useRef(null)

  const markerStyles = `
    .video-with-markers::-webkit-media-controls-timeline {
      background: linear-gradient(to right,
        ${quizQuestions.map(quiz => {
          const timestampPercent = (quiz.timestamp / videoRef.current?.duration || 1) * 100;
          return `
            transparent calc(${timestampPercent}% - 2px),
            ${completedQuizzes.has(quiz.timestamp) ? '#22c55e' : '#eab308'} calc(${timestampPercent}% - 2px),
            ${completedQuizzes.has(quiz.timestamp) ? '#22c55e' : '#eab308'} calc(${timestampPercent}% + 2px),
            transparent calc(${timestampPercent}% + 2px)
          `;
        }).join(',')}) !important;
      background-size: 100% 3px !important;
      background-repeat: no-repeat !important;
      background-position: center 0 !important;
    }
  `

  useEffect(() => {
    setLocalVideo(demoVideo)
    setIsLocalVideo(true)
    setIsAnalyzing(true)
    
    processLocalVideo(demoVideo)
      .then(data => {
        setSummary(data.summary)
        setTranscript(data.transcript)
        setQuizQuestions(data.quizQuestions)
        console.log('Quiz questions with timestamps:', data.quizQuestions)
      })
      .catch(error => {
        console.error(error)
        setError('Failed to process video. Please try again.')
      })
      .finally(() => {
        setIsAnalyzing(false)
      })
  }, [])

  const takeSnapshot = async () => {
    try {
      if (videoRef.current) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const screenshot = canvas.toDataURL('image/jpeg').split(',')[1];
        setCurrentScreenshot(screenshot);
        console.log('Snapshot captured:', screenshot.substring(0, 100) + '...');
        console.log('Preview URL:', `data:image/jpeg;base64,${screenshot}`);
      }
    } catch (error) {
      console.error('Snapshot error:', error);
    }
  };

  const handleQuestionSubmit = async () => {
    if (!question.trim()) return
    
    const currentQuestion = question
    setIsAsking(true)
    
    try {
      let response;
      
      // If we have a screenshot, use GPT-4 Vision
      if (currentScreenshot) {
        console.log('Using GPT-4 Vision with screenshot');
        response = await askQuestion(currentQuestion, summary, currentScreenshot, messages);
        // Add visual context to the question in chat
        setMessages(prev => [...prev, { 
          type: 'question', 
          content: currentQuestion,
          hasScreenshot: true // Add this flag
        }]);
      } else {
        // If no screenshot, use GPT-3.5 with just text context
        console.log('Using GPT-3.5 without screenshot');
        response = await askQuestionWithoutImage(currentQuestion, summary, messages);
        setMessages(prev => [...prev, { 
          type: 'question', 
          content: currentQuestion,
          hasScreenshot: false
        }]);
      }
      
      setQuestion('');
      setError('');
      
      if (response && response.answer) {
        setMessages(prev => [...prev, { 
          type: 'answer', 
          content: response.answer,
          hasScreenshot: currentScreenshot !== null
        }]);
      } else if (response && response.error) {
        setMessages(prev => [...prev, { 
          type: 'answer', 
          content: `Error: ${response.error}`,
          hasScreenshot: currentScreenshot !== null
        }]);
      }
    } catch (error) {
      console.error('Error details:', error.response?.data || error);
      const errorMessage = error.response?.data?.error || 'Failed to process question. Please try again.';
      setMessages(prev => [...prev, { 
        type: 'answer', 
        content: `Error: ${errorMessage}`,
        hasScreenshot: currentScreenshot !== null
      }]);
      setError(errorMessage);
    } finally {
      setIsAsking(false);
    }
  }
  const handleTimeUpdate = (e) => {
    const video = e.target
    const progress = (video.currentTime / video.duration) * 100
    
    const nextQuiz = quizQuestions.find(q => {
      const timestampPercent = (q.timestamp / video.duration) * 100
      const timeMatch = Math.abs(progress - timestampPercent) < 0.5
      const notCurrent = q !== currentQuiz
      const notCompleted = !completedQuizzes.has(q.timestamp)
      
      if (timeMatch) {
        console.log('Found matching time for quiz:', {
          currentProgress: progress,
          quizTimestamp: timestampPercent,
          difference: Math.abs(progress - timestampPercent)
        })
      }
      
      return timeMatch && notCurrent && notCompleted
    })
    
    if (nextQuiz) {
      console.log('Triggering quiz:', nextQuiz)
      video.pause()
      setCurrentQuiz(nextQuiz)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] overflow-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white/80 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center gap-4">
          <div className="flex flex-col items-center justify-center -space-y-1">
            <img src={wcdLogo} alt="WeCloudData Logo" className="h-6 w-auto" />
            <span className="text-[10px] font-medium text-primary">WeCloudData</span>
          </div>
          <h1 className="text-lg font-semibold text-primary ml-2">AI Tutorial Assistant</h1>
        </div>
      </nav>

      <div className="fixed top-14 left-0 right-80 bottom-0 overflow-auto">
        <div className="container py-8">
          {error && (
            <Card className="p-4 bg-white/80 shadow-lg border-muted/50 backdrop-blur-sm">
              <p className="text-sm text-destructive">{error}</p>
            </Card>
          )}

          <Card className="mt-8">
            <CardContent className="p-0 youtube-container relative" style={{ height: '400px' }}>
              {isLocalVideo ? (
                <div className="relative h-full group">
                  <video
                    ref={videoRef}
                    src={localVideo}
                    controls
                    className={cn("w-full h-full video-with-markers")}
                    onTimeUpdate={handleTimeUpdate}
                    style={{ [`--marker-styles`]: markerStyles }}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-muted">
                  <p className="text-muted-foreground font-medium">Upload a video</p>
                  <p className="text-muted-foreground/60 text-sm mt-1">The video will appear here</p>
                </div>
              )}
              {currentQuiz && (
                <QuizModal
                  question={currentQuiz.question}
                  context={transcript}
                  onClose={() => setCurrentQuiz(null)}
                  onContinue={() => {
                    const timestamp = currentQuiz.timestamp
                    setCompletedQuizzes(prev => new Set([...prev, timestamp]))
                    setCurrentQuiz(null)
                    const videoElement = document.querySelector('video')
                    if (videoElement) videoElement.play()
                  }}
                />
              )}
            </CardContent>
          </Card>

          <div className="mt-8">
            <div className="bg-muted/50 rounded-lg p-4 border border-muted">
              <h3 className="text-xs font-semibold text-primary mb-2">Video Summary</h3>
              <p className="text-muted-foreground text-[11px] whitespace-pre-wrap">
                {summary || "Video summary will appear here"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="fixed right-0 top-14 bottom-0 w-80 rounded-none border-l bg-white/70 backdrop-blur-md">
        <div className="flex h-full flex-col">
          <CardContent className="flex-1 overflow-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <p className="text-muted-foreground text-sm font-medium">No message yet :( </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Let's get started, ask me anything you want !
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={cn(
                  "flex",
                  message.type === 'question' ? "justify-end" : "justify-start"
                )}>
                  <div className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2",
                    message.type === 'question' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  )}>
                    <p className="text-[11px] whitespace-pre-wrap">
                      {message.content}
                    </p>
                    {message.hasScreenshot && (
                      <div className="flex items-center gap-1 mt-1 opacity-70 text-[10px]">
                        <Camera className="h-3 w-3" />
                        With screenshot
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
          <div className="border-t bg-muted/30 p-4">
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                handleQuestionSubmit()
              }}
              className="flex flex-col gap-2"
            >
              <div className="flex gap-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={currentQuiz ? "Please complete the quiz first..." : "Start typing here..."}
                  rows={3}
                  disabled={isAsking || currentQuiz}
                  className="resize-none bg-white/90 shadow-sm flex-1 disabled:opacity-50"
                />
                <div className="flex flex-col gap-2 self-center">
                  <Button
                    type="button"
                    onClick={() => {
                      if (currentScreenshot) {
                        // If there's a screenshot, clear it
                        setCurrentScreenshot(null);
                        console.log('Screenshot cleared');
                      } else {
                        // If no screenshot, take one
                        takeSnapshot();
                      }
                    }}
                    size="sm"
                    className={cn(
                      "w-10 h-10 rounded-full shadow-md p-0 disabled:opacity-50",
                      currentScreenshot 
                        ? "bg-green-500 hover:bg-green-600" // Active state
                        : "bg-primary hover:bg-primary/90"  // Default state
                    )}
                    title={currentScreenshot ? "Clear screenshot" : "Take snapshot"}
                  >
                    <Camera className="h-4 w-4 text-white" />
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isAsking || currentQuiz}
                    size="sm"
                    className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90 text-white shadow-md p-0 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </Card>

      <style>
        {markerStyles}
      </style>
    </div>
  )
}

export default App
