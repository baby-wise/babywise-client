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

export {
  getEventsByGroup
};
