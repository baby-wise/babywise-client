import React, { useState, useEffect, useRef } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
// import { LineChart } from 'react-native-chart-kit'; // Comentado temporalmente
import SIGNALING_SERVER_URL from '../siganlingServerUrl';


const StatisticsScreen = ({ navigation, route }) => {
  const { group } = route.params;
  const [eventsData, setEventsData] = useState(null);
  const [llmResponse, setLlmResponse] = useState('');
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingLLM, setIsLoadingLLM] = useState(true);

  const screenWidth = Dimensions.get('window').width;

  // Referencias para sincronizar scrolls - moverlas fuera de renderChart
  const chartScrollRef = useRef(null);
  const xAxisScrollRef = useRef(null);

  const handleScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    if (xAxisScrollRef.current) {
      xAxisScrollRef.current.scrollTo({ x: scrollX, animated: false });
    }
  };

  useEffect(() => {
    fetchEventsData();
    fetchLLMAnalysis();
  }, []);

  const fetchEventsData = async () => {
    try {
      setIsLoadingEvents(true);
      
      // HARDCODED: Datos simulados de eventos para 24 horas con patrones más entrecruzados
      const hardcodedData = {
        groupId: group.id,
        events: [
          { hour: 0, crying: 3, movement: 5 },   // Noche - más llantos, menos movimiento
          { hour: 1, crying: 2, movement: 3 },
          { hour: 2, crying: 4, movement: 2 },   // Pico de llanto nocturno
          { hour: 3, crying: 1, movement: 4 },
          { hour: 4, crying: 2, movement: 6 },
          { hour: 5, crying: 1, movement: 8 },   // Despertar temprano
          { hour: 6, crying: 0, movement: 12 },  // Movimiento sin llanto
          { hour: 7, crying: 1, movement: 15 },  // Actividad matutina
          { hour: 8, crying: 2, movement: 14 },
          { hour: 9, crying: 0, movement: 18 },  // Pico de actividad
          { hour: 10, crying: 1, movement: 16 },
          { hour: 11, crying: 3, movement: 8 },  // Entrecruzamiento: más llanto, menos movimiento
          { hour: 12, crying: 1, movement: 12 }, // Mediodía
          { hour: 13, crying: 0, movement: 20 }, // Máximo movimiento
          { hour: 14, crying: 2, movement: 17 },
          { hour: 15, crying: 5, movement: 6 },  // Entrecruzamiento fuerte
          { hour: 16, crying: 3, movement: 10 },
          { hour: 17, crying: 1, movement: 19 }, // Actividad vespertina
          { hour: 18, crying: 4, movement: 9 },  // Llanto de cansancio
          { hour: 19, crying: 2, movement: 11 },
          { hour: 20, crying: 3, movement: 7 },  // Preparación para dormir
          { hour: 21, crying: 1, movement: 5 },
          { hour: 22, crying: 2, movement: 4 },
          { hour: 23, crying: 1, movement: 3 }   // Calma nocturna
        ],
        period: '24h',
        generatedAt: new Date().toISOString()
      };
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEventsData(hardcodedData);
    } catch (error) {
      console.error('Error al cargar eventos:', error);
      Alert.alert('Error', 'Error al cargar eventos');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const fetchLLMAnalysis = async () => {
    try {
      setIsLoadingLLM(true);
      
      // HARDCODED: URL del backend para LLM
      let url = `${SIGNALING_SERVER_URL}/llm-response`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          UID: group.id
        }),
      });
      
      const data = await response.json();

      console.log('data = ' + JSON.stringify(data));
      
      if (data.success) {
        setLlmResponse(data.response);
      } else {
        setLlmResponse('No se pudo generar el análisis en este momento.');
      }
    } catch (error) {
      console.error('Error al obtener análisis LLM:', error);
      setLlmResponse('Error al conectar con el servicio de análisis.');
    } finally {
      setIsLoadingLLM(false);
    }
  };

  const renderChart = () => {
    if (!eventsData || !eventsData.events) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.noDataText}>No hay datos disponibles</Text>
        </View>
      );
    }

    const maxCrying = Math.max(...eventsData.events.map(e => e.crying));
    const maxMovement = Math.max(...eventsData.events.map(e => e.movement));
    const maxValue = Math.max(maxCrying, maxMovement);
    const chartHeight = 200;
    
    // Calcular ancho para que se vean exactamente 8 horas
    const visibleWidth = screenWidth - 80; // Ancho visible del gráfico
    const hourWidth = visibleWidth / 8; // Ancho por hora para ver 8 horas
    const totalChartWidth = eventsData.events.length * hourWidth; // Ancho total para 24 horas

    // Función para convertir valor a posición Y
    const getYPosition = (value) => {
      return chartHeight - (value / maxValue) * chartHeight;
    };

    // Función para obtener posición X (espaciado uniforme)
    const getXPosition = (index) => {
      return index * hourWidth; // hourWidth por hora
    };

    // Generar puntos para las líneas
    const cryingPoints = eventsData.events.map((event, index) => ({
      x: getXPosition(index),
      y: getYPosition(event.crying),
      value: event.crying,
      hour: event.hour
    }));

    const movementPoints = eventsData.events.map((event, index) => ({
      x: getXPosition(index),
      y: getYPosition(event.movement),
      value: event.movement,
      hour: event.hour
    }));
  
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Actividad en las últimas 24 horas</Text>
        
        <View style={styles.customChart}>
          {/* Eje Y - Etiquetas */}
          <View style={styles.yAxisLabels}>
            {[maxValue, Math.floor(maxValue * 0.75), Math.floor(maxValue * 0.5), Math.floor(maxValue * 0.25), 0].map((value, index) => (
              <Text key={index} style={styles.yAxisLabel}>{value}</Text>
            ))}
          </View>

          {/* Contenedor del gráfico con altura fija */}
          <View style={styles.chartWrapper}>
            {/* ScrollView horizontal SOLO para el gráfico */}
            <ScrollView 
              ref={chartScrollRef}
              horizontal 
              showsHorizontalScrollIndicator={true}
              style={[styles.chartScrollView, { width: visibleWidth, height: chartHeight }]}
              contentContainerStyle={{ width: totalChartWidth }}
              bounces={false}
              scrollEventThrottle={16}
              onScroll={handleScroll}
            >
                <View style={[styles.chartArea, { height: chartHeight, width: totalChartWidth }]}>
                  {/* Líneas de cuadrícula horizontales */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                    <View
                      key={index}
                      style={[
                        styles.gridLine,
                        {
                          top: ratio * chartHeight,
                          width: totalChartWidth
                        }
                      ]}
                    />
                  ))}

                {/* Líneas de cuadrícula verticales (cada hora) */}
                {eventsData.events.map((event, index) => (
                  <View
                    key={`vgrid-${index}`}
                    style={[
                      styles.verticalGridLine,
                      {
                        left: index * hourWidth,
                        height: chartHeight
                      }
                    ]}
                  />
                ))}

                {/* Línea de llantos */}
                <View style={styles.lineContainer}>
                  {cryingPoints.map((point, index) => {
                    if (index === 0) return null;
                    const prevPoint = cryingPoints[index - 1];
                    const length = Math.sqrt(
                      Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
                    );
                    const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x) * 180 / Math.PI;
                    
                    return (
                      <View
                        key={index}
                        style={[
                          styles.lineSegment,
                          styles.cryingLine,
                          {
                            left: prevPoint.x,
                            top: prevPoint.y,
                            width: length,
                            transform: [{ rotate: `${angle}deg` }]
                          }
                        ]}
                      />
                    );
                  })}
                </View>

                {/* Línea de movimientos */}
                <View style={styles.lineContainer}>
                  {movementPoints.map((point, index) => {
                    if (index === 0) return null;
                    const prevPoint = movementPoints[index - 1];
                    const length = Math.sqrt(
                      Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2)
                    );
                    const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x) * 180 / Math.PI;
                    
                    return (
                      <View
                        key={index}
                        style={[
                          styles.lineSegment,
                          styles.movementLine,
                          {
                            left: prevPoint.x,
                            top: prevPoint.y,
                            width: length,
                            transform: [{ rotate: `${angle}deg` }]
                          }
                        ]}
                      />
                    );
                  })}
                </View>

                {/* Puntos de datos - Llantos */}
                {cryingPoints.map((point, index) => (
                  <View
                    key={`crying-${index}`}
                    style={[
                      styles.dataPoint,
                      styles.cryingPoint,
                      {
                        left: point.x - 4,
                        top: point.y - 4
                      }
                    ]}
                  />
                ))}

                {/* Puntos de datos - Movimientos */}
                {movementPoints.map((point, index) => (
                  <View
                    key={`movement-${index}`}
                    style={[
                      styles.dataPoint,
                      styles.movementPoint,
                      {
                        left: point.x - 4,
                        top: point.y - 4
                      }
                    ]}
                  />
                ))}
              </View>
            </ScrollView>
            
            {/* Eje X - Etiquetas de horas fijas alineadas con el gráfico */}
          <View style={styles.xAxisContainer}>
            <ScrollView
                ref={xAxisScrollRef}
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.xAxisScrollView}
                contentContainerStyle={{ width: totalChartWidth }}
                bounces={false}
                scrollEnabled={false}
              >
                <View style={[styles.xAxisLabelsContainer, { width: totalChartWidth }]}>
                  {eventsData.events.map((event, index) => (
                    <Text
                      key={`hour-${index}`}
                      style={[
                        styles.xAxisHourLabel,
                        {
                          left: index * hourWidth - 8,
                          width: 16
                        }
                      ]}
                    >
                      {event.hour}h
                    </Text>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Información fija fuera del scroll */}
        <View style={styles.xAxisInfo}>
          <Text style={styles.xAxisInstructions}>← Desliza para ver todas las 24 horas (8 visibles) →</Text>
        </View>
        
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 99, 132, 1)' }]} />
            <Text style={styles.legendText}>Llantos</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: 'rgba(54, 162, 235, 1)' }]} />
            <Text style={styles.legendText}>Movimientos</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estadísticas</Text>
      </View>

      <View style={styles.content}>
        {/* Título del grupo */}
        <Text style={styles.groupName}>{group.name}</Text>

        {/* Gráfico */}
        {isLoadingEvents ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3E5F8A" />
            <Text style={styles.loadingText}>Cargando datos...</Text>
          </View>
        ) : (
          renderChart()
        )}

        {/* Análisis LLM - Sin ScrollView */}
        <View style={styles.analysisContainer}>
          <Text style={styles.analysisTitle}>Análisis Inteligente</Text>
          {isLoadingLLM ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3E5F8A" />
              <Text style={styles.loadingText}>Generando análisis...</Text>
            </View>
          ) : (
            <Text style={styles.analysisText} numberOfLines={6} ellipsizeMode="tail">{llmResponse}</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3E5F8A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 40,
  },
  analysisContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  analysisText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    textAlign: 'left',
  },
  tempChartContainer: {
    padding: 15,
  },
  tempChartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  dataTable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerCell: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    color: '#333',
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    color: '#666',
  },
  cryingCell: {
    color: 'rgba(255, 99, 132, 1)',
    fontWeight: '600',
  },
  movementCell: {
    color: 'rgba(54, 162, 235, 1)',
    fontWeight: '600',
  },
  customChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 20,
  },
  yAxisLabels: {
    height: 200,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 10,
    width: 30,
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  chartScrollView: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  chartArea: {
    position: 'relative',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#e8e8e8',
  },
  verticalGridLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  lineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 3,
    transformOrigin: 'left center',
  },
  cryingLine: {
    backgroundColor: 'rgba(255, 99, 132, 1)',
  },
  movementLine: {
    backgroundColor: 'rgba(54, 162, 235, 1)',
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  cryingPoint: {
    borderColor: 'rgba(255, 99, 132, 1)',
  },
  movementPoint: {
    borderColor: 'rgba(54, 162, 235, 1)',
  },
  chartScrollContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  chartWrapper: {
    width: '100%',
  },
  xAxisContainer: {
    marginLeft: 30,
    height: 25,
    overflow: 'hidden',
  },
  xAxisScrollView: {
    height: 25,
  },
  xAxisLabelsContainer: {
    height: 25,
    position: 'relative',
  },
  xAxisHourLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    top: 2,
  },
  hourLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    width: 20,
    textAlign: 'center',
  },
  xAxisInfo: {
    marginLeft: 30,
    marginTop: 10,
  },
  xAxisInstructions: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  timeRangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeRangeLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 30,
    marginTop: 10,
  },
  xAxisLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default StatisticsScreen;
