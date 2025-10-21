"""
TheNoReal Backend - Complete API Handler
Single file implementation for Vercel serverless functions
"""
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse
import json
import os
import urllib.request
import urllib.error
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# GROQ API CLIENT
# ============================================================================

# Model mappings for different providers
MODEL_MAPPINGS = {
    # OpenRouter models (when using OPENROUTER_API_KEY)
    'openrouter': {
        'llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct',
        'llama-3.1-70b': 'meta-llama/llama-3.1-70b-instruct',
        'qwen-32b': 'qwen/qwen-2.5-72b-instruct',
        'gpt-4o': 'openai/gpt-4o',
        'gpt-4o-mini': 'openai/gpt-4o-mini',
        'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
        'default': 'meta-llama/llama-3.3-70b-instruct'
    },
    # Groq direct models (when using GROQ_API_KEY)
    'groq': {
        'llama-3.3-70b': 'llama-3.3-70b-versatile',
        'llama-3.1-70b': 'llama-3.1-70b-versatile',
        'default': 'llama-3.3-70b-versatile'
    }
}


def call_groq(messages, model=None, temperature=0.7, max_tokens=2000, retry_count=3):
    """
    Call LLM API for chat completions with retry logic.
    Uses OpenRouter to avoid Cloudflare blocks on Vercel.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        model: Model identifier (e.g., 'llama-3.3-70b', 'gpt-4o', 'qwen-32b')
        temperature: Sampling temperature (0-2)
        max_tokens: Maximum tokens to generate
        retry_count: Number of retries on failure
        
    Returns:
        str: Generated text content
        
    Raises:
        Exception: If API key is missing or API call fails after retries
    """
    import time
    
    # Check for OpenRouter key first, fallback to Groq
    api_key = os.environ.get('OPENROUTER_API_KEY') or os.environ.get('GROQ_API_KEY', '')
    use_openrouter = bool(os.environ.get('OPENROUTER_API_KEY'))
    
    if not api_key:
        raise Exception("OPENROUTER_API_KEY or GROQ_API_KEY not configured in environment variables")
    
    # Resolve model name
    if model is None:
        model = os.environ.get('DEFAULT_MODEL', 'llama-3.3-70b')
    
    # Map model to provider-specific format
    provider = 'openrouter' if use_openrouter else 'groq'
    model_map = MODEL_MAPPINGS[provider]
    resolved_model = model_map.get(model, model_map['default'])
    
    logger.info(f"Using {provider} with model: {resolved_model}")
    
    # Set API endpoint
    if use_openrouter:
        url = "https://openrouter.ai/api/v1/chat/completions"
    else:
        url = "https://api.groq.com/openai/v1/chat/completions"
    
    payload = {
        "model": resolved_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    # Headers optimized for each provider
    if use_openrouter:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://thenonreal.app",
            "X-Title": "TheNoReal"
        }
    else:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "TheNoReal/1.0 (https://thenonreal.app)",
            "Accept": "application/json"
        }
    
    last_error = None
    
    for attempt in range(retry_count):
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers=headers,
                method='POST'
            )
            
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
                content = result['choices'][0]['message']['content']
                return content.strip()
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            last_error = f"HTTP {e.code}: {error_body}"
            
            # Don't retry on auth errors (401, 403) unless it's Cloudflare
            if e.code == 403 and "error code: 1010" in error_body:
                logger.warning(f"Cloudflare block detected, attempt {attempt + 1}/{retry_count}")
                if attempt < retry_count - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    continue
            elif e.code in [401, 403]:
                logger.error(f"Auth error: {last_error}")
                raise Exception(f"Authentication error: {e.code}")
            
            logger.warning(f"Groq API error on attempt {attempt + 1}: {last_error}")
            if attempt < retry_count - 1:
                time.sleep(1 + attempt)  # Progressive backoff
                continue
                
        except urllib.error.URLError as e:
            last_error = f"Connection error: {e.reason}"
            logger.warning(f"Connection error on attempt {attempt + 1}: {last_error}")
            if attempt < retry_count - 1:
                time.sleep(1 + attempt)
                continue
                
        except Exception as e:
            last_error = str(e)
            logger.warning(f"Unexpected error on attempt {attempt + 1}: {last_error}")
            if attempt < retry_count - 1:
                time.sleep(1)
                continue
    
    # All retries failed
    logger.error(f"All {retry_count} attempts failed. Last error: {last_error}")
    raise Exception(f"Groq API error after {retry_count} attempts: {last_error}")


# ============================================================================
# PROMPT GENERATION
# ============================================================================

def generate_story_prompt(config, model=None):
    """
    Generate a creative story seed based on configuration.
    
    Args:
        config: Dict with story configuration (genres, style, settings)
        model: Optional model identifier to use
        
    Returns:
        str: Generated story prompt (around 30 words)
    """
    system_msg = (
        "Genera una semilla de historia creativa basada en la configuración proporcionada. "
        "La semilla debe ser un texto corto y conciso, de alrededor de 30 palabras. "
        "Escribe en español y sé creativo."
    )
    
    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": json.dumps(config, ensure_ascii=False, indent=2)}
    ]
    
    return call_groq(messages, model=model, temperature=0.8)


def improve_prompt(original_prompt, model=None):
    """
    Improve an existing prompt while maintaining original intent.
    
    Args:
        original_prompt: The prompt text to improve
        model: Optional model identifier to use
        
    Returns:
        str: Improved prompt (around 30 words)
    """
    system_msg = (
        "Eres un asistente que mejora prompts manteniendo la intención original. "
        "La semilla mejorada debe ser un texto corto y conciso, de alrededor de 30 palabras. "
        "Hazla más interesante y cautivadora sin cambiar la idea principal."
    )
    
    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": original_prompt}
    ]
    
    return call_groq(messages, model=model, temperature=0.7)


# ============================================================================
# STORY GENERATION
# ============================================================================

def parse_story_response(generated_text, is_final=False):
    """
    Parse the generated story text to extract chapter and options.
    
    Args:
        generated_text: Raw text from Groq
        is_final: Whether this is a final chapter (no options needed)
        
    Returns:
        tuple: (chapter_text, options_list)
    """
    chapter_text = ""
    options = []
    
    if is_final:
        return generated_text.strip(), []
    
    # Try to extract chapter
    if "[CAPITULO]" in generated_text and "[/CAPITULO]" in generated_text:
        start = generated_text.find("[CAPITULO]") + len("[CAPITULO]")
        end = generated_text.find("[/CAPITULO]")
        chapter_text = generated_text[start:end].strip()
    
    # Try to extract options
    if "[OPCIONES]" in generated_text and "[/OPCIONES]" in generated_text:
        start = generated_text.find("[OPCIONES]") + len("[OPCIONES]")
        end = generated_text.find("[/OPCIONES]")
        options_text = generated_text[start:end].strip()
        
        for line in options_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            
            # Clean option text
            if ":" in line:
                # Format: "Opción 1: description"
                option_clean = line.split(":", 1)[1].strip()
            elif line.startswith("-") or line.startswith("•"):
                # Format: "- description"
                option_clean = line[1:].strip()
            else:
                option_clean = line
            
            if option_clean and len(option_clean) > 5:
                options.append(option_clean)
    
    # Fallback: if parsing failed, use full text as chapter
    if not chapter_text:
        chapter_text = generated_text.strip()
    
    return chapter_text, options


def generate_story_chapter(story_text, chosen_option="", options_per_decision=2, 
                          language="es", finalize=False, ajustes=None, model=None):
    """
    Generate a story chapter with options or a final ending.
    
    Args:
        story_text: Current story text
        chosen_option: Previously chosen option (empty for first chapter)
        options_per_decision: Number of options to generate
        language: Story language (default: "es")
        finalize: Whether to generate a final ending
        ajustes: Dict with settings (temperature, targetWords, etc.)
        model: Optional model identifier to use
        
    Returns:
        dict: {"text": chapter_text, "options": [list of options]}
    """
    if ajustes is None:
        ajustes = {}
    
    temperature = ajustes.get("temperature", 0.75)
    target_words = ajustes.get("targetWords", 220)
    
    # Build appropriate prompt based on context
    if finalize:
        prompt = f"""Historia hasta ahora:
{story_text}

Genera un final épico y satisfactorio para esta historia. Debe ser conclusivo y resolver todos los hilos narrativos.
Responde SOLO con el texto del final (máximo {int(target_words * 1.5)} palabras), sin opciones adicionales.
Escribe en español."""
        
    elif chosen_option:
        prompt = f"""Historia hasta ahora:
{story_text}

El lector eligió: {chosen_option}

Continúa la historia basándote en esta elección. Genera el siguiente capítulo (máximo {target_words} palabras) y luego {options_per_decision} opciones claras y distintas para continuar.

FORMATO OBLIGATORIO:
[CAPITULO]
texto del capítulo aquí
[/CAPITULO]

[OPCIONES]
Opción 1: descripción breve y atractiva
Opción 2: descripción breve y atractiva
[/OPCIONES]

Escribe en español y sé creativo."""
        
    else:
        prompt = f"""Comienza una historia interactiva con este inicio:
{story_text}

Genera el primer capítulo (máximo {target_words} palabras) y luego {options_per_decision} opciones claras y distintas para continuar.

FORMATO OBLIGATORIO:
[CAPITULO]
texto del capítulo aquí
[/CAPITULO]

[OPCIONES]
Opción 1: descripción breve y atractiva
Opción 2: descripción breve y atractiva
[/OPCIONES]

Escribe en español y sé creativo."""
    
    messages = [
        {
            "role": "system", 
            "content": "Eres un escritor experto en crear historias interactivas cautivadoras. Siempre sigues el formato solicitado exactamente."
        },
        {"role": "user", "content": prompt}
    ]
    
    generated = call_groq(messages, model=model, temperature=temperature, max_tokens=2000)
    chapter_text, options = parse_story_response(generated, is_final=finalize)
    
    # Ensure we have the right number of options (if not final)
    if not finalize and len(options) < options_per_decision:
        fallback_options = [
            "Continuar explorando con cautela",
            "Tomar una decisión arriesgada",
            "Buscar más información",
            "Huir de la situación"
        ]
        while len(options) < options_per_decision:
            options.append(fallback_options[len(options) % len(fallback_options)])
    
    return {
        "text": chapter_text,
        "options": options if not finalize else []
    }


# ============================================================================
# OPTIONS GENERATION
# ============================================================================

def generate_story_options(story_text, count=2, model=None):
    """
    Generate or regenerate options for continuing a story.
    
    Args:
        story_text: Current story text
        count: Number of options to generate
        model: Optional model identifier to use
        
    Returns:
        list: List of option strings
    """
    prompt = f"""Dada esta historia:
{story_text}

Genera {count} opciones distintas, interesantes y creativas para continuar la historia. 
Cada opción debe ser:
- Concisa (máximo 15 palabras)
- Intrigante y atractiva
- Claramente diferente de las otras opciones

Responde SOLO con las opciones en formato JSON:
{{"options": ["opción 1", "opción 2", ...]}}"""
    
    messages = [
        {
            "role": "system", 
            "content": "Eres un escritor experto. Responde ÚNICAMENTE con JSON válido, sin texto adicional."
        },
        {"role": "user", "content": prompt}
    ]
    
    response = call_groq(messages, model=model, temperature=0.8)
    
    # Try to parse JSON from response
    try:
        # Remove markdown code blocks if present
        response_clean = response.replace("```json", "").replace("```", "").strip()
        result = json.loads(response_clean)
        options = result.get("options", [])
        return options[:count]
    except Exception as e:
        logger.warning(f"Failed to parse options JSON: {e}")
        # Fallback: extract lines as options
        lines = [line.strip() for line in response.split("\n") if line.strip()]
        options = []
        for line in lines:
            if line.startswith("{") or line.startswith("}") or line.startswith("[") or line.startswith("]"):
                continue
            clean = line.strip('",')
            if clean and len(clean) > 5:
                options.append(clean)
        
        if options:
            return options[:count]
        
        # Ultimate fallback
        return [
            "Continuar explorando",
            "Tomar una decisión arriesgada",
            "Buscar ayuda",
            "Cambiar de rumbo"
        ][:count]


# ============================================================================
# HTTP HANDLER
# ============================================================================

class Handler(BaseHTTPRequestHandler):
    """Main HTTP request handler for Vercel serverless function."""
    
    def _set_headers(self, status=200):
        """Set response headers with CORS support."""
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def _send_json(self, data, status=200):
        """Send JSON response."""
        self._set_headers(status)
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def _read_body(self):
        """Read and parse JSON body."""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            post_data = self.rfile.read(content_length)
            try:
                return json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                return None
        return {}

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self._set_headers()
        
    def do_GET(self):
        """Handle GET requests."""
        path = urlparse(self.path).path
        
        routes = {
            '/api/health': lambda: {"ok": True},
            '/api/ping': lambda: {"status": "ok"},
            '/api/models': self._get_available_models,
            '/api/backgrounds': lambda: {
                "backgrounds": [
                    {"id": "bg1", "url": "/backgrounds/default.jpg", "name": "Default"},
                    {"id": "bg2", "url": "/backgrounds/space.jpg", "name": "Space"},
                    {"id": "bg3", "url": "/backgrounds/forest.jpg", "name": "Forest"}
                ]
            },
            '/': lambda: {"status": "ok", "message": "TheNoReal API"},
            '/api': lambda: {"status": "ok", "message": "TheNoReal API"},
            '/api/': lambda: {"status": "ok", "message": "TheNoReal API"},
        }
        
        if path in routes:
            result = routes[path]() if callable(routes[path]) else routes[path]
            self._send_json(result)
        else:
            self._send_json({"error": "Not found"}, 404)
    
    def _get_available_models(self):
        """Return list of available models based on configured provider."""
        use_openrouter = bool(os.environ.get('OPENROUTER_API_KEY'))
        provider = 'openrouter' if use_openrouter else 'groq'
        
        models_info = {
            'openrouter': [
                {
                    "id": "llama-3.3-70b",
                    "name": "Llama 3.3 70B",
                    "provider": "Meta",
                    "description": "Latest Llama model, excellent for creative writing"
                },
                {
                    "id": "llama-3.1-70b",
                    "name": "Llama 3.1 70B",
                    "provider": "Meta",
                    "description": "Stable and fast"
                },
                {
                    "id": "qwen-32b",
                    "name": "Qwen 2.5 72B",
                    "provider": "Alibaba",
                    "description": "Multilingual, great reasoning"
                },
                {
                    "id": "gpt-4o",
                    "name": "GPT-4o",
                    "provider": "OpenAI",
                    "description": "Most capable, premium pricing"
                },
                {
                    "id": "gpt-4o-mini",
                    "name": "GPT-4o Mini",
                    "provider": "OpenAI",
                    "description": "Fast and affordable"
                },
                {
                    "id": "claude-3.5-sonnet",
                    "name": "Claude 3.5 Sonnet",
                    "provider": "Anthropic",
                    "description": "Excellent for creative writing"
                }
            ],
            'groq': [
                {
                    "id": "llama-3.3-70b",
                    "name": "Llama 3.3 70B Versatile",
                    "provider": "Meta",
                    "description": "Latest Llama model on Groq"
                },
                {
                    "id": "llama-3.1-70b",
                    "name": "Llama 3.1 70B Versatile",
                    "provider": "Meta",
                    "description": "Stable and fast"
                }
            ]
        }
        
        return {
            "provider": provider,
            "models": models_info[provider],
            "default": os.environ.get('DEFAULT_MODEL', 'llama-3.3-70b')
        }

    def do_POST(self):
        """Handle POST requests."""
        path = urlparse(self.path).path
        body = self._read_body()
        
        if body is None:
            self._send_json({"error": "Invalid JSON"}, 400)
            return
        
        try:
            if path == '/api/prompt/generate':
                self._handle_generate_prompt(body)
            elif path == '/api/prompt/improve':
                self._handle_improve_prompt(body)
            elif path == '/api/story':
                self._handle_story(body)
            elif path == '/api/options':
                self._handle_options(body)
            else:
                self._send_json({"error": "Not found"}, 404)
        except Exception as e:
            logger.error(f"Error handling {path}: {e}")
            self._send_json({"error": str(e)}, 500)

    def _handle_generate_prompt(self, body):
        """Handle /api/prompt/generate endpoint."""
        config = body.get("config", {})
        model = body.get("model")  # Optional model selection
        
        if not config:
            self._send_json({"error": "config is required"}, 400)
            return
        
        try:
            prompt = generate_story_prompt(config, model=model)
            self._send_json({"prompt": prompt})
        except Exception as e:
            logger.error(f"Error generating prompt: {e}")
            self._send_json({"error": str(e)}, 500)

    def _handle_improve_prompt(self, body):
        """Handle /api/prompt/improve endpoint."""
        prompt = body.get("prompt", "")
        model = body.get("model")  # Optional model selection
        
        if not prompt or not prompt.strip():
            self._send_json({"error": "prompt is required"}, 400)
            return
        
        try:
            improved = improve_prompt(prompt, model=model)
            self._send_json({"prompt": improved})
        except Exception as e:
            logger.error(f"Error improving prompt: {e}")
            self._send_json({"error": str(e)}, 500)

    def _handle_story(self, body):
        """Handle /api/story endpoint."""
        story_text = body.get("story", "")
        
        if not story_text or not story_text.strip():
            self._send_json({"error": "story no puede estar vacío"}, 400)
            return
        
        option = body.get("option", "")
        options_per_decision = body.get("optionsPerDecision", 2)
        language = body.get("language", "es")
        finalize = body.get("finalize", False)
        ajustes = body.get("ajustes", {})
        model = body.get("model")  # Optional model selection
        
        try:
            chapter = generate_story_chapter(
                story_text=story_text,
                chosen_option=option,
                options_per_decision=options_per_decision,
                language=language,
                finalize=finalize,
                ajustes=ajustes,
                model=model
            )
            self._send_json({"chapter": chapter})
        except Exception as e:
            logger.error(f"Error generating story: {e}")
            self._send_json({"error": str(e)}, 500)

    def _handle_options(self, body):
        """Handle /api/options endpoint."""
        story_text = body.get("story", "")
        count = body.get("count", 2)
        model = body.get("model")  # Optional model selection
        
        if not story_text or not story_text.strip():
            self._send_json({"error": "story is required"}, 400)
            return
        
        try:
            options = generate_story_options(story_text, count, model=model)
            self._send_json({"options": options})
        except Exception as e:
            logger.error(f"Error generating options: {e}")
            self._send_json({"error": str(e)}, 500)