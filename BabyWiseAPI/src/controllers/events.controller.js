const getEventsByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    console.log(`HARDCODED: Obteniendo eventos para grupo: ${groupId}`);
    
    // HARDCODED: Simulando datos de eventos de las últimas 12 horas
    const now = new Date();
    const events = [];
    
    // Generar datos hardcodeados para las últimas 12 horas
    for (let i = 11; i >= 0; i--) {
      const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
      
      // Generar cantidad aleatoria de llantos (0-8)
      const cryingEvents = Math.floor(Math.random() * 9);
      
      // Generar cantidad aleatoria de movimientos (2-15)
      const movementEvents = Math.floor(Math.random() * 14) + 2;
      
      events.push({
        hour: hour.getHours(),
        crying: cryingEvents,
        movement: movementEvents,
        timestamp: hour.toISOString()
      });
    }
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('HARDCODED: Eventos generados:', events);
    
    res.status(200).json({
      success: true,
      data: {
        groupId,
        events,
        period: '12h',
        generatedAt: now.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};
const getCamerasByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log(`HARDCODED: Obteniendo camaras para grupo: ${groupId}`);

    // HARDCODED: lista de camaras del grupo
    const cameras = [
      { uid: 'cam1', name: 'Cámara entrada' },
      { uid: 'cam2', name: 'Cámara dormitorio' },
      { uid: 'cam3', name: 'Cámara jardín' }
    ];

    await new Promise(resolve => setTimeout(resolve, 200));

    res.status(200).json({ success: true, data: { groupId, cameras } });
  } catch (error) {
    console.error('Error al obtener camaras:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

const getEventsByCamera = async (req, res) => {
  try {
    const { cameraUid } = req.params;
    console.log(`HARDCODED: Obteniendo eventos para camara: ${cameraUid}`);

    // HARDCODED: Datos simulados para 24 horas, varían según cameraUid
    const now = new Date();
    const events = [];

    // Define patterns per camera
    const patterns = {
      cam1: {
        crying: [3,2,4,1,2,1,0,1,2,0,1,3,1,0,2,5,3,1,4,2,3,1,2,1],
        movement: [5,3,2,4,6,8,12,15,14,18,16,8,12,20,17,6,10,19,9,11,7,5,4,3]
      },
      cam2: {
        // cam2 shows higher movement during daytime and fewer cries
        crying: [1,1,2,0,1,0,0,0,1,0,0,1,0,0,1,2,1,0,1,1,0,0,0,0],
        movement: [8,6,4,5,10,12,18,22,24,28,26,20,22,30,28,10,12,20,14,12,10,6,4,3]
      },
      cam3: {
        // cam3 noisy nights (more crying at night)
        crying: [5,4,6,5,4,3,2,3,2,1,1,2,2,1,1,3,2,1,4,3,2,2,3,4],
        movement: [3,2,2,3,4,6,8,10,9,8,7,6,6,8,7,5,6,8,7,6,5,4,3,2]
      }
    };

    const key = cameraUid in patterns ? cameraUid : 'cam1';
    const cryingPattern = patterns[key].crying;
    const movementPattern = patterns[key].movement;

    // Build 24 hourly buckets for the last 24 hours ending at current hour (rounded down)
    const current = new Date(now);
    current.setMinutes(0, 0, 0); // round down to start of current hour
    for (let i = 23; i >= 0; i--) {
      const bucketTime = new Date(current.getTime() - i * 60 * 60 * 1000);
      const hour = bucketTime.getHours();
      const crying = cryingPattern[hour] ?? 0;
      const movement = movementPattern[hour] ?? 0;
      events.push({ hour, crying, movement, timestamp: bucketTime.toISOString() });
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    res.status(200).json({ success: true, data: { cameraUid, events, period: '24h', generatedAt: now.toISOString() } });
  } catch (error) {
    console.error('Error al obtener eventos por camara:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
  }
};

export {
  getEventsByGroup,
  getCamerasByGroup,
  getEventsByCamera
};
