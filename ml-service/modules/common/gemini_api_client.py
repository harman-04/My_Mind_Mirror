import requests
import json
import re
import logging
import time
import threading
from collections import deque
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

from config import Config 

logger = logging.getLogger(__name__)
logging.getLogger('modules.common.gemini_api_client').setLevel(logging.DEBUG)

class GeminiApiClient:
    _instance = None
    _lock = threading.Lock() 
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock: 
                if not cls._instance: 
                    cls._instance = super(GeminiApiClient, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, '_initialized'):
            self.requests_timestamps = deque() 
            self.rpm_window = 60 
            
            self.current_tokens_in_window = 0 
            self._tpm_last_reset_time = time.time() 
            self.tpm_window = 60 

            self.max_requests_per_minute = Config.GEMINI_API_RPM_LIMIT
            self.max_tokens_per_minute = Config.GEMINI_API_TPM_LIMIT

            self._initialized = True
            logger.info(f"GeminiApiClient initialized with RPM: {self.max_requests_per_minute}, TPM: {self.max_tokens_per_minute}")

    def _wait_for_rate_limit(self, tokens_to_add=0):
        with self._lock:
            current_time = time.time()

            # --- Handle RPM (Requests Per Minute) ---
            while self.requests_timestamps and self.requests_timestamps[0] <= current_time - self.rpm_window:
                self.requests_timestamps.popleft()

            if len(self.requests_timestamps) >= self.max_requests_per_minute:
                time_to_wait = self.rpm_window - (current_time - self.requests_timestamps[0]) + 0.01 
                if time_to_wait > 0:
                    logger.warning(f"Gemini API RPM limit (requests) approaching. Waiting for {time_to_wait:.2f}s...")
                    time.sleep(time_to_wait)
                    current_time = time.time()
                    while self.requests_timestamps and self.requests_timestamps[0] <= current_time - self.rpm_window:
                        self.requests_timestamps.popleft()

            self.requests_timestamps.append(current_time)

            # --- Handle TPM (Tokens Per Minute) ---
            if current_time - self._tpm_last_reset_time >= self.tpm_window:
                self.current_tokens_in_window = 0
                self._tpm_last_reset_time = current_time

            if self.current_tokens_in_window + tokens_to_add > self.max_tokens_per_minute:
                time_in_current_window = current_time - self._tpm_last_reset_time
                time_to_wait = self.tpm_window - time_in_current_window + 0.01 
                if time_to_wait > 0:
                    logger.warning(f"Gemini API TPM limit (tokens) approaching. Waiting for {time_to_wait:.2f}s...")
                    time.sleep(time_to_wait)
                    self.current_tokens_in_window = 0
                    self._tpm_last_reset_time = time.time()

            self.current_tokens_in_window += tokens_to_add
            logger.debug(f"Current RPM: {len(self.requests_timestamps)}, Current TPM: {self.current_tokens_in_window}")


    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10), 
        stop=stop_after_attempt(5), 
        retry=retry_if_exception_type((
            requests.exceptions.HTTPError,      
            requests.exceptions.Timeout,        
            requests.exceptions.ConnectionError 
        )),
        reraise=True 
    )
    def _make_api_call_with_retries(self, prompt_text, response_schema, temperature, timeout):
        estimated_tokens = len(prompt_text) // 4 
        self._wait_for_rate_limit(tokens_to_add=estimated_tokens)

        chat_history = [{"role": "user", "parts": [{"text": prompt_text}]}]
        payload = {"contents": chat_history}

        generation_config = {
            "temperature": temperature,
            "maxOutputTokens": 2048
        }

        if response_schema:
            generation_config["responseMimeType"] = "application/json"
        
        payload["generation_config"] = generation_config

        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]
        payload["safety_settings"] = safety_settings

        logger.info(f"Attempting Gemini API call (timeout: {timeout}s)...")
        response = requests.post(
            f"{Config.GEMINI_API_URL}?key={Config.GEMINI_API_KEY}",
            headers=Config.HEADERS,
            json=payload,
            timeout=timeout 
        )
        logger.debug(f"RAW GEMINI RESPONSE -> Status: {response.status_code}, Body: {response.text[:500]}...")

        # --- FIX APPLIED HERE ---
        # Removed access to retry.statistics as it's not directly available this way
        if response.status_code == 429:
            logger.warning(f"Gemini API returned 429 (RESOURCE_EXHAUSTED). Retrying...")
            response.raise_for_status() 
        elif response.status_code >= 500: 
            logger.warning(f"Gemini API returned {response.status_code} (Server Error). Retrying...")
            response.raise_for_status() 
        elif response.status_code >= 400: 
            logger.error(f"Gemini API HTTP error (non-retriable): {response.status_code} - {response.text}")
            response.raise_for_status() 

        result = response.json()
        logger.info("Gemini API call successful.")

        if result.get("candidates") and result["candidates"][0].get("content") and result["candidates"][0]["content"].get("parts"):
            response_text = result["candidates"][0]["content"]["parts"][0].get("text", "")
            
            if result.get("promptFeedback") and result["promptFeedback"].get("blockReason"):
                block_reason = result["promptFeedback"]["blockReason"]
                logger.warning(f"Gemini API blocked response due to: {block_reason}. Prompt (first 100 chars): {prompt_text[:100]}...")
                return None 

            if response_schema:
                try:
                    parsed_json = json.loads(response_text)
                    logger.debug("Successfully parsed raw JSON from Gemini response.")
                    return parsed_json
                except json.JSONDecodeError as e:
                    logger.warning("Failed to parse raw JSON from Gemini response: %s. Attempting markdown block extraction. Raw: %s", e, response_text[:200])
                    json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', response_text, re.DOTALL)
                    if json_match:
                        parsed_text_content = json_match.group(1)
                        try:
                            parsed_json = json.loads(parsed_text_content)
                            logger.debug("Successfully extracted and parsed JSON from markdown block.")
                            return parsed_json
                        except json.JSONDecodeError as e_inner:
                            logger.error("Failed to decode JSON from markdown block: %s. Content: %s", e_inner, parsed_text_content)
                            return None
                    else:
                        logger.error("Gemini response did not contain valid JSON (raw or markdown block) as expected by schema. Response text: %s", response_text)
                        return None
            else:
                return response_text
        else:
            logger.warning("Gemini API response structure unexpected or content missing. Raw result: %s", result)
            return None

    def call_gemini_api(self, prompt_text, response_schema=None, temperature=0.7, timeout=Config.GEMINI_API_TIMEOUT):
        try:
            return self._make_api_call_with_retries(prompt_text, response_schema, temperature, timeout)
        except requests.exceptions.Timeout:
            logger.error(f"Gemini API request timed out after {timeout} seconds (after all retries).")
            return None
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Gemini API connection error (after all retries): {e}")
            return None
        except requests.exceptions.HTTPError as e:
            logger.error(f"Gemini API HTTP error after all retries: {e.response.status_code} - {e.response.text}")
            return None
        except json.JSONDecodeError as e:
            logger.error("Failed to decode JSON from Gemini API response: %s", e)
            return None
        except Exception as e:
            logger.error("An unexpected error occurred during Gemini API call (after all retries): %s", e, exc_info=True)
            return None

gemini_api_client = GeminiApiClient()