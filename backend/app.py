from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from openai import OpenAI
from dotenv import load_dotenv
import json

app = Flask(__name__)
CORS(app)

load_dotenv()  # Load environment variables from .env file
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

@app.route('/api/ask-question', methods=['POST'])
def ask_question():
    try:
        data = request.json
        question = data.get('question')
        currentScreenshot = data.get('currentScreenshot')
        messages = data.get('messages')

        # Load transcript from transcript.txt
        with open("transcript.txt", "r") as file:
            transcript = file.read()

        if not currentScreenshot:
            return jsonify({'error': 'No screenshot available. Please pause the video first.'}), 400

        context = f"Previous Messages: {messages}\n\nVideo Transcript: {transcript}\n\n"

        try:
            # Make API call to GPT
            response = client.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {"role": "system", "content": (
                        "You are a friendly and knowledgeable instructor guiding a student watching an educational video. "
                        "Respond in a warm, conversational tone. Build a back-and-forth interaction by acknowledging their question, "
                        "providing insights, and asking follow-up questions to keep the conversation dynamic. Make it feel like a personalized and human-like interaction."
                    )},
                    {"role": "user", "content": [
                        {"type": "text", "text": f"Question: {question}\n\nContext:\n{context}"},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{currentScreenshot}"}}
                    ]}
                ]
            )
            answer = response.choices[0].message.content.strip()
            return jsonify({'answer': answer})

        except Exception as e:
            print(f"OpenAI API Error: {str(e)}")
            return jsonify({'error': 'Failed to generate answer from AI'}), 500

    except Exception as e:
        print(f"General Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ask-without-image', methods=['POST'])
def ask_without_image():
    try:
        data = request.json
        question = data.get('question')
        messages = data.get('messages')

        # Load transcript from transcript.txt
        with open("transcript.txt", "r") as file:
            transcript = file.read()

        context = f"Previous Messages: {messages}\n\nVideo Transcript: {transcript}\n\n"

        try:
            # Make API call to GPT
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": (
                        "You are a friendly and approachable instructor helping a student watching an educational video. "
                        "Your responses should feel conversational and supportive. Keep the dialogue going by inviting the student to share their understanding or ask more questions."
                    )},
                    {"role": "user", "content": f"Question: {question}\n\nContext:\n{context}"}
                ]
            )
            answer = response.choices[0].message.content.strip()
            return jsonify({'answer': answer})

        except Exception as e:
            print(f"OpenAI API Error: {str(e)}")
            return jsonify({'error': 'Failed to generate answer from AI'}), 500

    except Exception as e:
        print(f"General Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/process-local-video', methods=['POST'])
def process_local_video():
    try:
        # Load transcript from transcript.txt
        with open("transcript.txt", "r") as file:
            transcript_text = file.read()

        # Process transcript to get summary and quiz questions
        processed_data = process_transcript(transcript_text)
        if not processed_data:
            return jsonify({'error': 'Failed to process transcript'}), 500

        return jsonify({
            'transcript': transcript_text,
            **processed_data
        })

    except Exception as e:
        print(f"Error processing transcript file: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/evaluate-answer', methods=['POST'])
def evaluate_answer():
    try:
        data = request.json
        question = data.get('question')
        answer = data.get('answer')

        quiz_items = extract_quiz('quiz.txt')
        feedback = ""
        for item in quiz_items:
            if item['formatted_q'] == question:
                feedback = f"The correct answer is {item['correct_option']}. {item['short_explanation']}"
                break

        return jsonify({'feedback': feedback})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def process_transcript(transcript: str):
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": (
                    "You are a skilled educator summarizing an educational video. Use a friendly and approachable tone to create a "
                    "concise bullet-pointed summary of the key ideas, ensuring the summary feels engaging and helpful."
                )},
                {"role": "user", "content": f"Summarize the video transcript into bullet points highlighting main ideas and key takeaways:\n\n{transcript}"}
            ]
        )
        summary = response.choices[0].message.content.strip()

        quiz_items = extract_quiz('quiz.txt')
        formatted_quiz = [
            {
                'question': item['formatted_q'],
                'timestamp': sum(int(x) * 60**i for i, x in enumerate(reversed(item['timestamp'].split(':')))) + 5
            }
            for item in quiz_items
        ]

        return {'summary': summary, 'quizQuestions': formatted_quiz}

    except Exception as e:
        print(f"Transcript processing error: {str(e)}")
        return None

def extract_quiz(filename="quiz.txt"):
    with open(filename, 'r') as file:
        data = json.load(file)

    return [
        {
            'timestamp': item.get('timestamp', ''),
            'formatted_q': format_question(item),
            'correct_option': item.get('correct option', ''),
            'short_explanation': item.get('short explanation', '')
        }
        for item in data
    ]

def format_question(quiz_item):
    question = quiz_item.get('question', '')
    options = quiz_item.get('options', [])

    formatted_question = f"{question}\n\n"
    for option in options:
        formatted_question += f"{option}\n"

    return formatted_question

if __name__ == '__main__':
    app.run(debug=True, port=5000)
