// Cache en memoria para simular respuestas guardadas (sin MongoDB)
// Estructura: { "UID-YYYY-MM-DD": { response, date, prompt, createdAt } }
const llmResponseCache = {};

// Función helper para obtener la fecha actual en formato YYYY-MM-DD
const getCurrentDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Función helper para generar clave de cache
const getCacheKey = (UID, date) => {
  return `${UID}-${date}`;
};

// Función helper para generar prompt (hardcodeado por ahora)
const generatePrompt = (UID) => {
  const currentDate = getCurrentDate();
  
  // TODO: Aquí se implementará la lógica real para obtener datos del bebé de la BD
  return `Actúa como un asistente experto en cuidado infantil y desarrollo de bebés. 

Basándome en los datos de monitoreo del bebé del usuario ${UID} para la fecha ${currentDate}, proporciona un resumen personalizado y recomendaciones.

Datos simulados del día de hoy:
- Patrones de sueño: 3 siestas (9:00-10:30, 13:00-14:30, 17:00-18:00), sueño nocturno de 20:00 a 06:30
- Alimentación: 6 tomas, última toma a las 18:30
- Actividad: Períodos de juego activos entre comidas
- Estado general: Tranquilo, sin episodios de llanto prolongado

Por favor genera un resumen que incluya:
1. 🍼 Estado de alimentación y recomendaciones
2. 😴 Análisis de patrones de sueño
3. 👶 Observaciones sobre desarrollo y bienestar
4. 💡 Recomendaciones personalizadas para los próximos días
5. ⚠️ Cualquier punto de atención si lo hay

Mantén un tono cálido, profesional y tranquilizador para los padres. Responde en español.`;
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
    console.log('req.body type:', typeof req.body);
    console.log('req.body keys:', Object.keys(req.body || {}));
    
    const { UID } = req.body || {};
    
    if (!UID) {
      console.log('UID not found in request');
      return res.status(400).json({ error: "UID is required" });
    }

    const currentDate = getCurrentDate();
    const cacheKey = getCacheKey(UID, currentDate);
    
    console.log(`Buscando respuesta LLM para usuario ${UID} en fecha ${currentDate}`);

    // Buscar si ya existe una respuesta en cache para este usuario y fecha
    const existingResponse = llmResponseCache[cacheKey];

    if (existingResponse) {
      console.log(`Respuesta existente encontrada en cache para ${UID}`);
      return res.status(200).json({
        response: existingResponse.response,
        date: existingResponse.date,
        cached: true
      });
    }

    // Si no existe, generar nueva respuesta
    console.log(`Generando nueva respuesta para ${UID}`);
    
    const prompt = generatePrompt(UID);
    const llmResponse = await generateLLMResponse(prompt);
    
    // Guardar en cache
    llmResponseCache[cacheKey] = {
      UID: UID,
      date: currentDate,
      prompt: prompt,
      response: llmResponse,
      createdAt: new Date().toISOString()
    };

    console.log(`Nueva respuesta LLM guardada en cache para ${UID}`);
    console.log(`Cache actual tiene ${Object.keys(llmResponseCache).length} entradas`);

    return res.status(201).json({
      response: llmResponse,
      date: currentDate,
      cached: false
    });

  } catch (error) {
    console.error('Error en getLLMResponseForUser:', error);
    
    return res.status(500).json({ 
      error: "Error interno del servidor al generar respuesta LLM" 
    });
  }
};

export { getLLMResponseForUser };
