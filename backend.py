import json
import logging
import os
import subprocess
from typing import List, Dict, Any
from pathlib import Path
import shutil

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel


logger = logging.getLogger(__name__)

app = FastAPI(title="AI Text Editor API", version="1.0.0")

# Get the directory where this script is located
BASE_DIR = Path(__file__).parent

# Mount static files (CSS, JS, etc.)
app.mount("/static", StaticFiles(directory=BASE_DIR), name="static")

# Get the path to the Claude CLI
claude_path = shutil.which("claude")

# Helper function to call Claude CLI
async def call_claude_cli(prompt: str) -> str:
    """Call the Claude CLI with the given prompt and return the response."""
    try:
        result = subprocess.run(
            [claude_path, "--print"],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=60,  # 60 second timeout
            check=True,
        )
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Claude CLI request timed out")
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Claude CLI error: {e.stderr}")
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Claude CLI not found. Please install Claude CLI first.")

class CustomPrompt(BaseModel):
    id: str
    name: str
    prompt: str
    enabled: bool = True

class TextRequest(BaseModel):
    text: str
    custom_prompts: List[CustomPrompt] = []

class CustomPromptRequest(BaseModel):
    text: str
    prompt_name: str
    prompt_text: str

class Recommendation(BaseModel):
    category: str
    suggestion: str
    priority: str

class RecommendationsResponse(BaseModel):
    recommendations: List[Recommendation]
    word_count: int
    character_count: int
    prompt_name: str = "General"

@app.get("/")
async def serve_frontend():
    """Serve the main HTML file"""
    return FileResponse(BASE_DIR / "index.html")

@app.get("/api/")
async def api_root():
    return {"message": "AI Text Editor API is running"}

@app.post("/analyze-text", response_model=RecommendationsResponse)
async def analyze_text(request: TextRequest):
    """
    Analyze text and generate improvement recommendations using Claude CLI.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        # Default analysis prompt
        prompt = f"""Please analyze the following text and provide 3-5 specific recommendations for improvement.
        Focus on areas like style, grammar, syntax, vocabulary, clarity, and structure.

        For each recommendation, provide:
        1. Category (e.g., "Style", "Grammar", "Vocabulary", "Structure", "Clarity")
        2. Specific suggestion for improvement
        3. Priority level ("high", "medium", "low")

        Text to analyze:
        "{request.text}"

        Please respond in JSON format with an array of recommendations:
        {{
            "recommendations": [
                {{
                    "category": "Style",
                    "suggestion": "Specific improvement suggestion here",
                    "priority": "high"
                }}
            ]
        }}"""

        # Call Claude CLI
        response_text = await call_claude_cli(prompt)

        # Process default recommendations
        import json
        import re

        # Look for JSON in the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            claude_response = json.loads(json_str)
            recommendations = claude_response.get("recommendations", [])
        else:
            # Fallback: create recommendations from text response
            recommendations = [
                {
                    "category": "AI Analysis",
                    "suggestion": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                    "priority": "medium"
                }
            ]

        # Ensure we have valid recommendation objects
        validated_recommendations = []
        for rec in recommendations:
            if isinstance(rec, dict) and "category" in rec and "suggestion" in rec:
                validated_recommendations.append(Recommendation(
                    category=rec.get('category', 'Analysis'),
                    suggestion=rec.get("suggestion", ""),
                    priority=rec.get("priority", "medium")
                ))

        # Calculate text statistics
        word_count = len(request.text.split())
        character_count = len(request.text)

        return RecommendationsResponse(
            recommendations=validated_recommendations,
            word_count=word_count,
            character_count=character_count,
            prompt_name="General"
        )

    except json.JSONDecodeError:
        # If JSON parsing fails, create a general recommendation
        return RecommendationsResponse(
            recommendations=[
                Recommendation(
                    category="AI Analysis",
                    suggestion="Unable to parse detailed recommendations. Consider reviewing text for clarity and structure.",
                    priority="medium"
                )
            ],
            word_count=len(request.text.split()),
            character_count=len(request.text),
            prompt_name="General"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing text: {str(e)}")

@app.post("/improve-text")
async def improve_text(request: TextRequest):
    """
    Improve the provided text using Claude CLI.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        prompt = f"""Please improve the following text while maintaining its original meaning and tone.
        Focus on clarity, grammar, style, and readability:

        "{request.text}"

        Please provide only the improved version of the text without additional commentary."""

        improved_text = await call_claude_cli(prompt)

        return {"improved_text": improved_text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error improving text: {str(e)}")

@app.post("/summarize-text")
async def summarize_text(request: TextRequest):
    """
    Summarize the provided text using Claude CLI.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        prompt = f"""Please provide a concise summary of the following text, capturing the main points and key information:

        "{request.text}"

        Please provide a clear, well-structured summary."""

        summary = await call_claude_cli(prompt)

        return {"summary": summary}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error summarizing text: {str(e)}")

@app.post("/analyze-custom-prompt", response_model=RecommendationsResponse)
async def analyze_custom_prompt(request: CustomPromptRequest):
    """
    Analyze text using a custom prompt and return recommendations.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if not request.prompt_text.strip():
        raise HTTPException(status_code=400, detail="Prompt text cannot be empty")

    try:
        # Replace {text} placeholder in custom prompt
        custom_prompt_text = request.prompt_text.replace("{text}", request.text)

        # Add instructions for JSON response format
        full_custom_prompt = f"""{custom_prompt_text}

Please respond in JSON format with an array of recommendations:
{{
    "recommendations": [
        {{
            "category": "Analysis",
            "suggestion": "Your specific suggestion here",
            "priority": "medium"
        }}
    ]
}}"""

        # Call Claude CLI
        response_text = await call_claude_cli(full_custom_prompt)

        # Try to extract JSON from response
        import json
        import re

        # Look for JSON in the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            claude_response = json.loads(json_str)
            recommendations = claude_response.get("recommendations", [])
        else:
            # Fallback: treat entire response as suggestion
            recommendations = [
                {
                    "category": "Analysis",
                    "suggestion": response_text[:200] + "..." if len(response_text) > 200 else response_text,
                    "priority": "medium"
                }
            ]

        # Ensure we have valid recommendation objects
        validated_recommendations = []
        for rec in recommendations:
            if isinstance(rec, dict) and "suggestion" in rec:
                validated_recommendations.append(Recommendation(
                    category=rec.get('category', 'Analysis'),
                    suggestion=rec.get("suggestion", ""),
                    priority=rec.get("priority", "medium")
                ))

        # Calculate text statistics
        word_count = len(request.text.split())
        character_count = len(request.text)

        return RecommendationsResponse(
            recommendations=validated_recommendations,
            word_count=word_count,
            character_count=character_count,
            prompt_name=request.prompt_name
        )

    except json.JSONDecodeError:
        # If JSON parsing fails, create a general recommendation
        return RecommendationsResponse(
            recommendations=[
                Recommendation(
                    category="Analysis",
                    suggestion="Unable to parse detailed recommendations. Consider reviewing text for clarity and structure.",
                    priority="medium"
                )
            ],
            word_count=len(request.text.split()),
            character_count=len(request.text),
            prompt_name=request.prompt_name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing with custom prompt: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(level=logging.INFO)
    logger.info(f"Using Claude CLI at: {claude_path}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
