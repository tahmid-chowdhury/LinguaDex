import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key and model from environment variables
api_key = os.getenv("OPENROUTER_API_KEY")
model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-pro-exp-03-25:free")

print(f"Testing OpenRouter API with model: {model}")
print(f"API Key available: {'Yes' if api_key else 'No'}")

# Simple test message
headers = {
    "Authorization": f"Bearer {api_key}",
    "HTTP-Referer": "https://linguadex.app",
    "X-Title": "LinguaDex Language Learning App"
}

payload = {
    "model": model,
    "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Say hello in 3 different languages."}
    ],
    "temperature": 0.7,
    "max_tokens": 150
}

try:
    # Make the API call
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload
    )

    # Check response
    if response.status_code == 200:
        result = response.json()
        print("\nAPI call successful!")
        print("\nResponse:")
        print(result["choices"][0]["message"]["content"])
        print("\nModel used:", result.get("model", "Unknown"))
    else:
        print(f"\nError: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"\nException occurred: {e}")