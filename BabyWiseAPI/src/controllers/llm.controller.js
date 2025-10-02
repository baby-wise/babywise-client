// NOTE: per front-end request, we do NOT persist responses server-side here.
// This controller always generates a fresh response based on the incoming
// conversation and the group's events.

import { Event_DB } from '../domain/event.js';
import { Group_DB } from '../domain/group.js';

// Función helper para obtener la fecha actual en formato YYYY-MM-DD
const getCurrentDate = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// Función helper para obtener eventos reales de la base de datos por cámara específica
const getRealEventsData = async (groupUID, cameraUid) => {
  try {
    console.log('Obteniendo eventos reales para cámara:', cameraUid, 'en grupo:', groupUID);
    
    // Si no hay cameraUid, usar eventos de todo el grupo
    if (!cameraUid || cameraUid === 'undefined' || cameraUid === 'null') {
      console.log('No se especificó cameraUid, usando eventos de todo el grupo');
      const events = await Event_DB.find({ group: groupUID });
      return await processEventsData(events, groupUID);
    }

    // Encontrar el grupo que contiene esta cámara (mismo código que getEventsByCamera)
    const group = await Group_DB.findOne({ 'cameras.user': cameraUid });
    if (!group) {
      console.log('Cámara no encontrada en ningún grupo:', cameraUid);
      return getEmptyEventsData(groupUID);
    }

    // Encontrar el objeto de la cámara y obtener su nombre (baby name mapping)
    const cameraObj = group.cameras.find(c => String(c.user) === String(cameraUid) || (c.user && String(c.user._id) === String(cameraUid)));
    if (!cameraObj) {
      console.log('Objeto de cámara no encontrado:', cameraUid);
      return getEmptyEventsData(groupUID);
    }
    
    const cameraName = cameraObj.name;
    console.log('Nombre de la cámara/bebé encontrado:', cameraName);

    // Obtener eventos específicos de esta cámara/bebé (últimas 24 horas)
    const now = new Date();
    const end = new Date(now);
    end.setMinutes(0,0,0);
    const start = new Date(end);
    start.setHours(end.getHours() - 23);

    const events = await Event_DB.find({
      group: group._id,
      baby: cameraName,
      date: { $gte: start, $lte: new Date(end.getTime() + (60 * 60 * 1000)) }
    }).lean();

    console.log(`Eventos encontrados para cámara ${cameraName}:`, events.length);
    return await processEventsData(events, groupUID, start);

  } catch (error) {
    console.error('Error obteniendo eventos reales:', error);
    return getEmptyEventsData(groupUID);
  }
};

// Función helper para procesar los eventos en buckets de horas
const processEventsData = async (events, groupUID, customStart = null) => {
  if (!events || events.length === 0) {
    console.log('No hay eventos para procesar');
    return getEmptyEventsData(groupUID);
  }

  // Usar ventana de tiempo personalizada o día actual
  let start, end;
  if (customStart) {
    start = customStart;
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  } else {
    const today = new Date();
    start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  }

  // Crear buckets por hora (24 horas)
  const hourlyData = [];
  for (let i = 0; i < 24; i++) {
    const bucketStart = new Date(start.getTime() + i * 60 * 60 * 1000);
    const bucketEnd = new Date(bucketStart.getTime() + 60 * 60 * 1000);
    
    const eventsInBucket = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= bucketStart && eventDate < bucketEnd;
    });

    const crying = eventsInBucket.filter(e => e.type === 'LLANTO').length;
    const movement = eventsInBucket.filter(e => e.type === 'MOVIMIENTO').length;
    
    hourlyData.push({ hour: bucketStart.getHours(), crying, movement });
  }

  // Calcular métricas
  const totalCrying = hourlyData.reduce((sum, h) => sum + h.crying, 0);
  const totalMovement = hourlyData.reduce((sum, h) => sum + h.movement, 0);
  const peakCryingHour = hourlyData.reduce((max, h) => h.crying > max.crying ? h : max);
  const peakMovementHour = hourlyData.reduce((max, h) => h.movement > max.movement ? h : max);

  console.log(`Eventos procesados: ${totalCrying} llanto, ${totalMovement} movimiento`);

  return {
    groupId: groupUID,
    events: hourlyData,
    totalCrying,
    totalMovement,
    peakCryingHour,
    peakMovementHour,
    period: '24h',
    generatedAt: new Date().toISOString()
  };
};

// Función helper para datos vacíos
const getEmptyEventsData = (groupUID) => {
  return {
    groupId: groupUID,
    events: [],
    totalCrying: 0,
    totalMovement: 0,
    peakCryingHour: { hour: 0, crying: 0 },
    peakMovementHour: { hour: 0, movement: 0 }
  };
};

// Función helper para generar prompt dinámico usando UID, cameraUid, conversation y el último mensaje
const generatePrompt = async (UID, cameraUid, conversation = [], userMessage = '') => {
  const currentDate = getCurrentDate();

  // Obtener datos reales de la base de datos para la cámara específica
  const realEventsData = await getRealEventsData(UID, cameraUid);

  // Conversation formatting: include role and text for clarity
  const conversationText = (conversation || []).map(m => `(${m.role}) ${m.text}`).join('\n');

  // Extract key metrics from real events
  const { totalCrying, totalMovement, peakCryingHour, peakMovementHour } = realEventsData;

  // Prompt instructions: be concise and answer taking into account conversation + events
  return `Eres un asistente experto en cuidado infantil. Responde SOLO en español, de forma concisa (máximo 4-6 frases).

DATOS DEL BEBÉ PARA HOY (${currentDate}):
- Total de llanto detectado: ${totalCrying} episodios
- Total de movimiento detectado: ${totalMovement} episodios  
- Hora con más llanto: ${peakCryingHour.hour}:00 (${peakCryingHour.crying} episodios)
- Hora con más movimiento: ${peakMovementHour.hour}:00 (${peakMovementHour.movement} episodios)

Conversación previa:
${conversationText}

Pregunta del usuario: ${userMessage}

IMPORTANTE: Responde SOLO en español basándote en los datos del bebé. Si piden un resumen, analiza los patrones de llanto y movimiento para dar consejos útiles.`;
};

// Función para generar respuesta usando API LLM gratuita (simple)
const generateLLMResponse = async (prompt) => {
  console.log('Llamando a API LLM gratuita...');
  
  try {
    // Usando una API sin clave que realmente funciona
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      console.log('Pollinations error:', response.status, response.statusText);
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    console.log('Pollinations respuesta exitosa');
    
    return text.trim();

  } catch (error) {
    console.error('Error con Pollinations:', error);
    return 'Disculpa, no puedo procesar tu consulta en este momento.';
  }
};

const getLLMResponseForUser = async (req, res) => {
  try {
    // Debug logging
    console.log('=== DEBUG getLLMResponseForUser ===');
    console.log('req.method:', req.method);
    console.log('req.headers:', req.headers);
    console.log('req.body:', req.body);

    const { UID, cameraUid, conversation, userMessage } = req.body || {};

    if (!UID) {
      console.log('UID not found in request');
      return res.status(400).json({ 
        success: false,
        error: 'UID is required'
      });
    }

    console.log('Datos recibidos - UID:', UID, 'cameraUid:', cameraUid);

    // Build prompt using incoming conversation and userMessage for specific camera
    const prompt = await generatePrompt(UID, cameraUid, conversation || [], userMessage || '');
    console.log('Prompt generado (trunc):', prompt.substring(0, 200));

    // Always generate a fresh response (no caching/storage)
    console.log('Llamando a generateLLMResponse...');
    const llmResponse = await generateLLMResponse(prompt);
    console.log('generateLLMResponse terminó exitosamente. Respuesta recibida:', llmResponse ? 'SÍ' : 'NO');

    // Return the response directly to the front-end
    console.log('Preparando respuesta JSON...');
    const currentDate = getCurrentDate();
    console.log('Fecha actual obtenida:', currentDate);
    
    const responseObj = {
      success: true,
      response: llmResponse,
      date: currentDate,
      cached: false
    };
    
    console.log('Enviando respuesta exitosa al cliente:', responseObj.success);
    return res.status(200).json(responseObj);

  } catch (error) {
    console.error('Error en getLLMResponseForUser:', error);
    
    // Asegurar que siempre devolvemos JSON válido
    try {
      return res.status(500).json({ 
        success: false,
        error: "Error interno del servidor al generar respuesta LLM",
        details: error.message || 'Error desconocido'
      });
    } catch (jsonError) {
      console.error('Error enviando respuesta JSON:', jsonError);
      // Último recurso: enviar texto plano
      return res.status(500).send('Error interno del servidor');
    }
  }
};

export { getLLMResponseForUser };
