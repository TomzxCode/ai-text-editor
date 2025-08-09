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
from litellm import completion
from pydantic import BaseModel
from dotenv import load_dotenv

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

# Helper function to call AI model via LiteLLM
def call_ai_model(prompt: str) -> str:
    response = completion(
        model="groq/openai/gpt-oss-120b",
        messages=[{ "content": prompt,"role": "user"}],
        #stream=True,
    )
    return response.choices[0].message.content

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



class GenericResponseItem(BaseModel):
    type: str  # "recommendation", "citation", "reference", "diff", "analysis", etc.
    content: Dict[str, Any]  # Flexible content structure

class GenericResponse(BaseModel):
    items: List[GenericResponseItem]
    response_type: str  # Overall response type
    prompt_name: str = "General"

@app.get("/")
async def serve_frontend():
    """Serve the main HTML file"""
    return FileResponse(BASE_DIR / "index.html")

@app.get("/api/")
async def api_root():
    return {"message": "AI Text Editor API is running"}


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

        improved_text = call_ai_model(prompt)

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

        summary = call_ai_model(prompt)

        return {"summary": summary}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error summarizing text: {str(e)}")

@app.post("/analyze-custom-prompt")
async def analyze_custom_prompt(request: CustomPromptRequest):
    """
    Analyze text using a custom prompt and return a flexible response.
    Can return recommendations, citations, references, diffs, or other types of analysis.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if not request.prompt_text.strip():
        raise HTTPException(status_code=400, detail="Prompt text cannot be empty")

    try:
        # Replace {text} placeholder in custom prompt
        custom_prompt_text = request.prompt_text.replace("{text}", request.text)

        # Add instructions for flexible JSON response format
        full_custom_prompt = f"""{custom_prompt_text}

Please respond in JSON format. You can return any type of analysis result. Here are some common formats:

For recommendations:
{{
    "response_type": "recommendations",
    "items": [
        {{
            "type": "recommendation",
            "content": {{
                "category": "Style",
                "suggestion": "Your suggestion here",
                "priority": "high"
            }}
        }}
    ]
}}

For citations/references:
{{
    "response_type": "citations",
    "items": [
        {{
            "type": "citation",
            "content": {{
                "source": "Author Name (Year)",
                "title": "Title of work",
                "url": "https://example.com",
                "relevance": "How this relates to the text"
            }}
        }}
    ]
}}

For text diffs/edits:
{{
    "response_type": "edits",
    "items": [
        {{
            "type": "diff",
            "content": {{
                "original": "original text segment",
                "suggested": "improved text segment",
                "reason": "explanation of change"
            }}
        }}
    ]
}}

For general analysis:
{{
    "response_type": "analysis",
    "items": [
        {{
            "type": "insight",
            "content": {{
                "title": "Key insight",
                "description": "Detailed analysis",
                "evidence": "Supporting evidence from text"
            }}
        }}
    ]
}}

Choose the most appropriate format for your response based on the prompt's intent."""

        # Call AI model
        response_text = call_ai_model(full_custom_prompt)

        # Try to extract JSON from response
        import json
        import re

        # Look for JSON in the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            claude_response = json.loads(json_str)

            # Handle new generic format
            if "items" in claude_response and "response_type" in claude_response:
                items = []
                for item in claude_response.get("items", []):
                    if isinstance(item, dict) and "type" in item and "content" in item:
                        items.append(GenericResponseItem(
                            type=item["type"],
                            content=item["content"]
                        ))

                return GenericResponse(
                    items=items,
                    response_type=claude_response.get("response_type", "analysis"),
                    prompt_name=request.prompt_name
                )

            # Backward compatibility: handle old recommendations format
            elif "recommendations" in claude_response:
                recommendations = claude_response.get("recommendations", [])
                items = []
                for rec in recommendations:
                    if isinstance(rec, dict) and "suggestion" in rec:
                        items.append(GenericResponseItem(
                            type="recommendation",
                            content={
                                "category": rec.get('category', 'Analysis'),
                                "suggestion": rec.get("suggestion", ""),
                                "priority": rec.get("priority", "medium")
                            }
                        ))

                return GenericResponse(
                    items=items,
                    response_type="recommendations",
                    prompt_name=request.prompt_name
                )

            else:
                # Unknown JSON format, treat as general analysis
                items = [GenericResponseItem(
                    type="analysis",
                    content={
                        "title": "Custom Analysis",
                        "description": json.dumps(claude_response),
                        "source": "custom_prompt"
                    }
                )]

                return GenericResponse(
                    items=items,
                    response_type="analysis",
                    prompt_name=request.prompt_name
                )

        else:
            # Fallback: treat entire response as general analysis
            items = [GenericResponseItem(
                type="analysis",
                content={
                    "title": "Text Analysis",
                    "description": response_text[:500] + "..." if len(response_text) > 500 else response_text,
                    "source": "custom_prompt"
                }
            )]

            return GenericResponse(
                items=items,
                response_type="analysis",
                prompt_name=request.prompt_name
            )

    except json.JSONDecodeError:
        # If JSON parsing fails, create a general analysis
        items = [GenericResponseItem(
            type="analysis",
            content={
                "title": "Analysis Result",
                "description": "Unable to parse structured response. Raw analysis available.",
                "source": "custom_prompt"
            }
        )]

        return GenericResponse(
            items=items,
            response_type="analysis",
            prompt_name=request.prompt_name
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing with custom prompt: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
    logger.info(f"Using Claude CLI at: {claude_path}")
    uvicorn.run(app, host=os.environ.get("HOST", "0.0.0.0"), port=int(os.environ.get("PORT", 8000)))
