import json
import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from litellm import completion
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(title="AI Text Editor API", version="1.0.0")

# Get the directory where this script is located
BASE_DIR = Path(__file__).parent

# Mount static files (CSS, JS, etc.)
app.mount("/static", StaticFiles(directory=BASE_DIR), name="static")

# Get the path to the Claude CLI
claude_path = shutil.which("claude")


def escape_html(text):
    """Escape HTML special characters"""
    if not isinstance(text, str):
        text = str(text)
    return (text.replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#x27;'))


def strip_style_tags(html_text):
    """Strip <style> tags and their content from HTML"""
    import re
    # Remove <style>...</style> tags and their content (case insensitive)
    return re.sub(r'<style[^>]*>.*?</style>', '', html_text, flags=re.IGNORECASE | re.DOTALL)


# Helper function to call AI model via LiteLLM
def call_ai_model(prompt: str) -> str:
    response = completion(
        model="groq/openai/gpt-oss-120b",
        messages=[{"content": prompt, "role": "user"}],
        # stream=True,
    )
    return response.choices[0].message.content


class Prompt(BaseModel):
    id: str
    name: str
    prompt: str
    enabled: bool = True


class TextRequest(BaseModel):
    text: str
    prompts: List[Prompt] = []


class PromptRequest(BaseModel):
    prompt_name: str
    prompt_text: str


@app.get("/")
async def serve_frontend():
    """Serve the main HTML file"""
    return FileResponse(BASE_DIR / "index.html")


@app.get("/api/")
async def api_root():
    return {"message": "AI Text Editor API is running"}




@app.post("/analyze-prompt")
async def analyze_prompt(request: PromptRequest):
    """
    Analyze text using a prompt and return a flexible response.
    Can return feedback, citations, references, diffs, or other types of analysis.
    """

    if not request.prompt_text.strip():
        raise HTTPException(status_code=400, detail="Prompt text cannot be empty")

    try:
        # Use the processed prompt text directly (placeholders already replaced in frontend)
        prompt_text = request.prompt_text

        # Give the LLM freedom to respond in any format
        full_prompt = f"""{prompt_text}

Please provide your response in whatever format best serves the analysis. You have complete freedom to present information as you see fit - whether that's structured analysis, creative suggestions, detailed explanations, examples, or any other format that would be most helpful. Your response should be in HTML format directly, no ```html``` markdown container."""

        # Call AI model
        response_text = call_ai_model(full_prompt)

        # Strip any <style> tags from the response
        cleaned_response = strip_style_tags(response_text)

        # Format response as HTML directly
        html_response = f'''
        <div class="feedback-item">
            <h4>✨ {escape_html(request.prompt_name)}</h4>
            <div class="category-section">
                <h5>Analysis</h5>
                <div class="analysis-content">
                    {cleaned_response}
                </div>
            </div>
        </div>
        '''
        return HTMLResponse(content=html_response)
    except Exception as e:
        error_html = f"""
        <div class="feedback-item">
            <h4>❌ Error - {escape_html(request.prompt_name)}</h4>
            <div class="category-section">
                <h5>Error</h5>
                <p class="feedback-high">
                    • Error analyzing with prompt: {escape_html(str(e))}
                    <span class="priority-badge high">high</span>
                </p>
            </div>
        </div>
        """
        raise HTTPException(status_code=500, detail=error_html)


if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
    logger.info(f"Using Claude CLI at: {claude_path}")
    uvicorn.run(
        app,
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", 8000)),
    )
