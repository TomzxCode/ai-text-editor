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


def format_content_to_html(items, response_type, prompt_name):
    """Convert AI response items to HTML format"""
    html_parts = []
    
    # Group items by category
    categories = {}
    for item in items:
        category = item.get("content", {}).get("category", "Analysis")
        if category not in categories:
            categories[category] = []
        categories[category].append(item)
    
    for category, category_items in categories.items():
        html_parts.append(f'<div class="category-section">')
        html_parts.append(f'<h5>{escape_html(category)}</h5>')
        
        for item in category_items:
            item_type = item.get("type", "analysis")
            content = item.get("content", {})
            
            if item_type == "citation":
                html_parts.append(format_citation_html(content))
            elif item_type == "diff":
                html_parts.append(format_diff_html(content))
            elif item_type == "feedback":
                priority = content.get("priority", "medium")
                suggestion = content.get("suggestion", "")
                html_parts.append(f'''
                    <p class="feedback-{priority}">
                        • {escape_html(suggestion)}
                        <span class="priority-badge {priority}">{priority}</span>
                    </p>
                ''')
            elif item_type == "analysis" or item_type == "insight":
                title = content.get("title", "Analysis")
                description = content.get("description", "")
                html_parts.append(f'''
                    <div class="analysis-item">
                        <h6>{escape_html(title)}</h6>
                        <p>{escape_html(description)}</p>
                    </div>
                ''')
            else:
                # Generic content display
                if isinstance(content, dict):
                    suggestion = content.get("suggestion") or content.get("description") or str(content)
                else:
                    suggestion = str(content)
                html_parts.append(f'<p>• {escape_html(suggestion)}</p>')
        
        html_parts.append('</div>')
    
    return f'''
    <div class="feedback-item">
        <h4>✨ {escape_html(prompt_name)}</h4>
        {"".join(html_parts)}
    </div>
    '''


def format_citation_html(content):
    """Format citation content as HTML"""
    fields = []
    
    if content.get("source"):
        fields.append(f'''
            <div class="citation-field">
                <span class="field-label">Source</span>
                <span class="field-value">{escape_html(content["source"])}</span>
            </div>
        ''')
    
    if content.get("title"):
        fields.append(f'''
            <div class="citation-field">
                <span class="field-label">Title</span>
                <span class="field-value">{escape_html(content["title"])}</span>
            </div>
        ''')
    
    if content.get("url"):
        fields.append(f'''
            <div class="citation-field">
                <span class="field-label">URL</span>
                <span class="field-value link" onclick="window.open('{escape_html(content["url"])}', '_blank')">{escape_html(content["url"])}</span>
            </div>
        ''')
    
    if content.get("relevance"):
        fields.append(f'''
            <div class="citation-field">
                <span class="field-label">Relevance</span>
                <span class="field-value">{escape_html(content["relevance"])}</span>
            </div>
        ''')

    return f'''
        <div class="citation-item">
            <div class="citation-header">
                <span class="citation-icon">📚</span>
                <h6 class="citation-title">Citation</h6>
            </div>
            <div class="citation-content">
                {"".join(fields)}
            </div>
            <span class="priority-badge citation">{content.get("priority", "medium")}</span>
        </div>
    '''


def format_diff_html(content):
    """Format diff content as HTML"""
    html = '<div class="diff-item">'
    html += '''
        <div class="diff-header">
            <span class="diff-icon">✏️</span>
            <h6 class="diff-title">Suggested Edit</h6>
        </div>
        <div class="diff-content">
    '''
    
    if content.get("original"):
        html += f'''
            <div class="diff-section">
                <div class="diff-text original" data-label="Original">
                    {escape_html(content["original"])}
                </div>
            </div>
        '''
    
    if content.get("suggested"):
        html += f'''
            <div class="diff-section">
                <div class="diff-text suggested" data-label="Suggested">
                    {escape_html(content["suggested"])}
                </div>
            </div>
        '''
    
    if content.get("reason"):
        html += f'''
            <div class="diff-reason">
                {escape_html(content["reason"])}
            </div>
        '''
    
    html += f'''
        </div>
        <span class="priority-badge diff">{content.get("priority", "high")}</span>
    </div>
    '''
    
    return html


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
    text: str
    prompt_name: str
    prompt_text: str


class GenericResponseItem(BaseModel):
    type: str  # "feedback", "citation", "reference", "diff", "analysis", etc.
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

        html_response = f"""
        <div class="improved-text-container">
            <h3>✨ Improved Text</h3>
            <div class="improved-text-content">
                <p>{improved_text.replace(chr(10), '</p><p>')}</p>
            </div>
        </div>
        """

        return HTMLResponse(content=html_response)

    except Exception as e:
        error_html = f"""
        <div class="error-container">
            <h3>❌ Error</h3>
            <p class="error-message">Error improving text: {str(e)}</p>
        </div>
        """
        raise HTTPException(status_code=500, detail=error_html)


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

        html_response = f"""
        <div class="summary-container">
            <h3>📝 Summary</h3>
            <div class="summary-content">
                <p>{summary.replace(chr(10), '</p><p>')}</p>
            </div>
        </div>
        """

        return HTMLResponse(content=html_response)

    except Exception as e:
        error_html = f"""
        <div class="error-container">
            <h3>❌ Error</h3>
            <p class="error-message">Error summarizing text: {str(e)}</p>
        </div>
        """
        raise HTTPException(status_code=500, detail=error_html)


@app.post("/analyze-prompt")
async def analyze_prompt(request: PromptRequest):
    """
    Analyze text using a prompt and return a flexible response.
    Can return feedback, citations, references, diffs, or other types of analysis.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if not request.prompt_text.strip():
        raise HTTPException(status_code=400, detail="Prompt text cannot be empty")

    try:
        # Replace {text} placeholder in prompt
        prompt_text = request.prompt_text.replace("{text}", request.text)

        # Add instructions for flexible JSON response format
        full_prompt = f"""{prompt_text}

Please respond in JSON format. You can return any type of analysis result. Here are some common formats:

For feedback:
{{
    "response_type": "feedback",
    "items": [
        {{
            "type": "feedback",
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
        response_text = call_ai_model(full_prompt)

        # Try to extract JSON from response
        import json
        import re

        # Look for JSON in the response
        json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group()
            claude_response = json.loads(json_str)

            # Handle new generic format
            if "items" in claude_response and "response_type" in claude_response:
                items = claude_response.get("items", [])
                html_response = format_content_to_html(items, claude_response.get("response_type", "analysis"), request.prompt_name)
                return HTMLResponse(content=html_response)

            # Backward compatibility: handle old feedback format
            elif "recommendations" in claude_response or "feedback" in claude_response:
                feedback = claude_response.get("recommendations") or claude_response.get("feedback", [])
                items = []
                for item in feedback:
                    if isinstance(item, dict) and "suggestion" in item:
                        items.append({
                            "type": "feedback",
                            "content": {
                                "category": item.get("category", "Analysis"),
                                "suggestion": item.get("suggestion", ""),
                                "priority": item.get("priority", "medium"),
                            }
                        })

                html_response = format_content_to_html(items, "feedback", request.prompt_name)
                return HTMLResponse(content=html_response)

            else:
                # Unknown JSON format, treat as general analysis
                items = [{
                    "type": "analysis",
                    "content": {
                        "title": "Custom Analysis",
                        "description": json.dumps(claude_response),
                        "category": "Analysis",
                    }
                }]

                html_response = format_content_to_html(items, "analysis", request.prompt_name)
                return HTMLResponse(content=html_response)

        else:
            # Fallback: treat entire response as general analysis
            items = [{
                "type": "analysis",
                "content": {
                    "title": "Text Analysis",
                    "description": (
                        response_text[:500] + "..."
                        if len(response_text) > 500
                        else response_text
                    ),
                    "category": "Analysis",
                }
            }]

            html_response = format_content_to_html(items, "analysis", request.prompt_name)
            return HTMLResponse(content=html_response)

    except json.JSONDecodeError:
        # If JSON parsing fails, create a general analysis
        items = [{
            "type": "analysis",
            "content": {
                "title": "Analysis Result",
                "description": "Unable to parse structured response. Raw analysis available.",
                "category": "Analysis",
            }
        }]

        html_response = format_content_to_html(items, "analysis", request.prompt_name)
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
