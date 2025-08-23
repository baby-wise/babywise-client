// NOTE: per front-end request, we do NOT persist responses server-side here.
// This controller always generates a fresh response based on the incoming
// conversation and the group's events. In the future, events should be
// fetched from the database using the UID. For now we hardcode them.

// Función helper para obtener la fecha actual en formato YYYY-MM-DD
const getCurrentDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Función helper para generar clave de cache
const getCacheKey = (UID, date) => {
  return `${UID}-${date}`;
};

// Función helper para generar prompt dinámico usando UID, conversation y el último mensaje
const generatePrompt = (UID, conversation = [], userMessage = '') => {
  const currentDate = getCurrentDate();

  // Hardcoded data copied from the front-end (so crying vs movement is explicit).
  // TODO: in the future fetch real events from DB using UID instead of hardcoding.
  const hardcodedData = {
    groupId: UID,
    events: [
      { hour: 0, crying: 3, movement: 5 },
      { hour: 1, crying: 2, movement: 3 },
      { hour: 2, crying: 4, movement: 2 },
      { hour: 3, crying: 1, movement: 4 },
      { hour: 4, crying: 2, movement: 6 },
      { hour: 5, crying: 1, movement: 8 },
      { hour: 6, crying: 0, movement: 12 },
      { hour: 7, crying: 1, movement: 15 },
      { hour: 8, crying: 2, movement: 14 },
      { hour: 9, crying: 0, movement: 18 },
      { hour: 10, crying: 1, movement: 16 },
      { hour: 11, crying: 3, movement: 8 },
      { hour: 12, crying: 1, movement: 12 },
      { hour: 13, crying: 0, movement: 20 },
      { hour: 14, crying: 2, movement: 17 },
      { hour: 15, crying: 5, movement: 6 },
      { hour: 16, crying: 3, movement: 10 },
      { hour: 17, crying: 1, movement: 19 },
      { hour: 18, crying: 4, movement: 9 },
      { hour: 19, crying: 2, movement: 11 },
      { hour: 20, crying: 3, movement: 7 },
      { hour: 21, crying: 1, movement: 5 },
      { hour: 22, crying: 2, movement: 4 },
      { hour: 23, crying: 1, movement: 3 }
    ],
    period: '24h',
    generatedAt: new Date().toISOString()
  };

  // Include the exact hardcoded object in the prompt so the LLM clearly sees which fields are crying vs movement
  const eventsSummary = `Eventos simulados (${currentDate}): ${JSON.stringify(hardcodedData)}`;

  // Conversation formatting: include role and text for clarity
  const conversationText = (conversation || []).map(m => `(${m.role}) ${m.text}`).join('\n');

  // Prompt instructions: be concise and answer taking into account conversation + events
  return `Eres un asistente experto en cuidado infantil. Responde de forma concisa y en español (máximo 4-6 frases).

Toma en cuenta:
- Fecha de referencia: ${currentDate}
- Eventos disponibles: ${eventsSummary}

Conversación previa:
${conversationText}

Pregunta actual del usuario:
${userMessage}

Instrucción: usando la conversación y los eventos, responde brevemente a la pregunta del usuario. No generes pasos largos ni listas extensas; devuelve una respuesta corta, clara y útil.`;
};

// Función helper para generar respuesta del LLM usando apifreellm.com
const generateLLMResponse = async (prompt) => {
  try {
    console.log('Llamando a apifreellm.com con prompt:', prompt.substring(0, 100) + '...');
    
    // Llamada a la API de apifreellm.com
    const response = await fetch('https://apifreellm.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Respuesta recibida de apifreellm.com');
    
    // La API devuelve la respuesta en el campo 'response' o 'message'
    return data.response || data.message || data;
    
  } catch (error) {
    console.error('Error llamando a apifreellm.com:', error);
    
    // Fallback a respuesta hardcodeada si falla la API
    console.log('Usando respuesta de fallback');
    return `[Error de conexión con LLM] Basándome en la información proporcionada, aquí tienes un resumen personalizado para hoy:

🍼 **Alimentación**: Tu bebé ha mostrado patrones regulares de alimentación hoy.

😴 **Sueño**: Los ciclos de sueño han sido consistentes con las recomendaciones para su edad.

👶 **Desarrollo**: Continúa mostrando signos positivos de desarrollo saludable.

💡 **Recomendaciones**: 
- Mantén la rutina actual de alimentación
- Considera ajustar ligeramente los horarios de siesta
- Todo va muy bien, ¡sigue así!

Este es un resumen generado automáticamente basado en los datos del día.`;
  }
};

const getLLMResponseForUser = async (req, res) => {
  try {
    // Debug logging
    console.log('=== DEBUG getLLMResponseForUser ===');
    console.log('req.method:', req.method);
    console.log('req.headers:', req.headers);
    console.log('req.body:', req.body);

    const { UID, conversation, userMessage } = req.body || {};

    if (!UID) {
      console.log('UID not found in request');
      return res.status(400).json({ 
        success: false,
        error: 'UID is required'
      });
    }

    // Build prompt using incoming conversation and userMessage
    const prompt = generatePrompt(UID, conversation || [], userMessage || '');
    console.log('Prompt generado (trunc):', prompt.substring(0, 200));

    // Always generate a fresh response (no caching/storage)
    const llmResponse = await generateLLMResponse(prompt);

    // Return the response directly to the front-end
    return res.status(200).json({
      success: true,
      response: llmResponse,
      date: getCurrentDate(),
      cached: false
    });

  } catch (error) {
    console.error('Error en getLLMResponseForUser:', error);
    
    return res.status(500).json({ 
      success: false,
      error: "Error interno del servidor al generar respuesta LLM" 
    });
  }
};

export { getLLMResponseForUser };
