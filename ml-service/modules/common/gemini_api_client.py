# modules/common/gemini_api_client.py

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

class GeminiAPIException(Exception):
    """Custom exception for Gemini API errors."""
    def __init__(self, message, status_code=None, details=None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details

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
            # RPM limiting
            while self.requests_timestamps and self.requests_timestamps[0] <= current_time - self.rpm_window:
                self.requests_timestamps.popleft()
            if len(self.requests_timestamps) >= self.max_requests_per_minute:
                time_to_wait = self.rpm_window - (current_time - self.requests_timestamps[0]) + 0.01
                if time_to_wait > 0:
                    logger.warning(f"Gemini API RPM limit approaching. Waiting {time_to_wait:.2f}s...")
                    time.sleep(time_to_wait)
                    current_time = time.time()
                    while self.requests_timestamps and self.requests_timestamps[0] <= current_time - self.rpm_window:
                        self.requests_timestamps.popleft()
            self.requests_timestamps.append(current_time)
            # TPM limiting
            if current_time - self._tpm_last_reset_time >= self.tpm_window:
                self.current_tokens_in_window = 0
                self._tpm_last_reset_time = current_time
            if self.current_tokens_in_window + tokens_to_add > self.max_tokens_per_minute:
                time_in_current_window = current_time - self._tpm_last_reset_time
                time_to_wait = self.tpm_window - time_in_current_window + 0.01
                if time_to_wait > 0:
                    logger.warning(f"Gemini API TPM limit approaching. Waiting {time_to_wait:.2f}s...")
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
    def _make_api_call_with_retries(self, prompt_text, response_schema, temperature, timeout, api_key):
        estimated_tokens = len(prompt_text) // 4
        self._wait_for_rate_limit(tokens_to_add=estimated_tokens)

        key_to_use = api_key if api_key else Config.GEMINI_API_KEY
        if not key_to_use:
            raise GeminiAPIException("No Gemini API key available (neither per‑user nor global).", status_code=500)

        chat_history = [{"role": "user", "parts": [{"text": prompt_text}]}]
        payload = {"contents": chat_history}
        generation_config = {"temperature": temperature, "maxOutputTokens": 2048}
        if response_schema:
            generation_config["responseMimeType"] = "application/json"
        payload["generation_config"] = generation_config
        payload["safety_settings"] = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]

        url = f"{Config.GEMINI_API_URL}?key={key_to_use}"
        try:
            response = requests.post(url, headers=Config.HEADERS, json=payload, timeout=timeout)
        except requests.exceptions.Timeout:
            raise GeminiAPIException(f"Gemini API request timed out after {timeout}s", status_code=504)
        except requests.exceptions.ConnectionError as e:
            raise GeminiAPIException(f"Connection error: {str(e)}", status_code=503)

        if response.status_code == 429:
            logger.warning("Gemini API returned 429 (RESOURCE_EXHAUSTED).")
            raise GeminiAPIException("Gemini API rate limit exceeded. Please try again later.", status_code=429)
        elif response.status_code >= 500:
            raise GeminiAPIException(f"Gemini API server error: {response.status_code}", status_code=response.status_code)
        elif response.status_code >= 400:
            raise GeminiAPIException(f"Gemini API client error: {response.status_code} - {response.text}", status_code=response.status_code)

        result = response.json()
        if not result.get("candidates"):
            block_reason = result.get("promptFeedback", {}).get("blockReason")
            if block_reason:
                raise GeminiAPIException(f"Prompt blocked by Gemini: {block_reason}", status_code=400)
            raise GeminiAPIException("Empty response from Gemini API", status_code=500)

        response_text = result["candidates"][0]["content"]["parts"][0].get("text", "")
        if not response_text:
            raise GeminiAPIException("Gemini API returned empty content", status_code=500)

        if response_schema:
            try:
                parsed_json = json.loads(response_text)
                return parsed_json
            except json.JSONDecodeError:
                json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', response_text, re.DOTALL)
                if json_match:
                    try:
                        return json.loads(json_match.group(1))
                    except json.JSONDecodeError:
                        pass
                raise GeminiAPIException("Gemini response did not contain valid JSON", status_code=500)
        return response_text

    def call_gemini_api(self, prompt_text, response_schema=None, temperature=0.7, timeout=None, api_key=None):
        actual_timeout = timeout if timeout is not None else Config.GEMINI_API_TIMEOUT
        try:
            return self._make_api_call_with_retries(prompt_text, response_schema, temperature, actual_timeout, api_key)
        except GeminiAPIException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in Gemini API call: {e}", exc_info=True)
            raise GeminiAPIException(f"Internal error: {str(e)}", status_code=500)

gemini_api_client = GeminiApiClient()