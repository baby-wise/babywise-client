// Simple Cerebras client wrapper using fetch (OpenAI-compatible API)
// NOTE: The API key is hardcoded per user request. For production, move to env/secure storage.
const API_KEY = 'csk-3hw5wfmjhmy5vytf9rxtpfc2jwv4fc9mt6f664kc8tw8jknk';
const API_URL = 'https://api.cerebras.ai/v1/chat/completions';

export async function completeChat({ messages, model = 'llama3.1-8b', maxTokens = 400, temperature = 0.7, top_p = 0.8 }) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: maxTokens,
      temperature,
      top_p,
    }),
  });

  if (!res.ok) {
    // Try to parse error body for better message
    let errText = 'LLM request failed';
    try { const j = await res.json(); errText = j?.error?.message || JSON.stringify(j); } catch (_) {}
    throw new Error(errText);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}
