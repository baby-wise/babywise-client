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
  Alert,
  FlatList
} from 'react-native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import ChartWebView from '../components/ChartWebView';


const StatisticsScreen = ({ navigation, route }) => {
  const { group } = route.params;
  const [eventsData, setEventsData] = useState(null);
  const [llmResponse, setLlmResponse] = useState('');
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingLLM, setIsLoadingLLM] = useState(true);
  // Control para desactivar el scroll vertical del padre mientras se hace scroll horizontal en la tarjeta
  const [parentScrollEnabled, setParentScrollEnabled] = useState(true);

  const screenWidth = Dimensions.get('window').width;

  // Referencias para sincronizar scrolls
  const chartScrollRef = useRef(null);
  const hoursScrollRef = useRef(null);

  const handleChartScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    if (hoursScrollRef.current) {
      hoursScrollRef.current.scrollTo({ x: scrollX, animated: false });
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

    const chartHeight = 180;
    const hourWidth = 50; // Ancho por cada hora
    const totalWidth = hourWidth * 24; // 1200px total para 24 horas
    const maxCrying = Math.max(...eventsData.events.map(e => e.crying));
    const maxMovement = Math.max(...eventsData.events.map(e => e.movement));
    const maxValue = Math.max(maxCrying, maxMovement);
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Actividad en las últimas 24 horas</Text>
        
        {/* Contenedor fijo para el gráfico */}
        <View style={styles.chartFixedContainer}>
          
          {/* Etiquetas del eje Y - Fijas */}
          <View style={styles.yAxisContainer}>
            {[maxValue, Math.round(maxValue * 0.75), Math.round(maxValue * 0.5), Math.round(maxValue * 0.25), 0].map((value, index) => (
              <Text key={index} style={styles.yAxisLabel}>{value}</Text>
            ))}
          </View>
          
          {/* ScrollView SOLO para el gráfico */}
          <ScrollView 
            ref={chartScrollRef}
            horizontal={true}
            showsHorizontalScrollIndicator={true}
            style={styles.chartScrollView}
            contentContainerStyle={[styles.chartContent, { width: totalWidth }]}
            bounces={false}
            scrollEventThrottle={16}
            onScroll={handleChartScroll}
          >
            <View style={[styles.chartGraph, { width: totalWidth, height: chartHeight }]}>
              {/* Líneas de cuadrícula horizontales */}
              {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
                <View 
                  key={i}
                  style={[
                    styles.gridLineHorizontal, 
                    { 
                      bottom: ratio * chartHeight,
                      width: totalWidth
                    }
                  ]} 
                />
              ))}
              
              {/* Líneas verticales y datos por hora */}
              {eventsData.events.map((event, index) => {
                const x = index * hourWidth;
                const cryingHeight = (event.crying / maxValue) * chartHeight;
                const movementHeight = (event.movement / maxValue) * chartHeight;
                
                return (
                  <View key={event.hour} style={[styles.hourColumn, { left: x, width: hourWidth }]}>
                    {/* Línea vertical de cuadrícula */}
                    <View style={[styles.gridLineVertical, { height: chartHeight }]} />
                    
                    {/* Barra de llantos */}
                    <View 
                      style={[
                        styles.cryingBar, 
                        { 
                          height: cryingHeight,
                          bottom: 0,
                          left: 15
                        }
                      ]} 
                    />
                    
                    {/* Barra de movimientos */}
                    <View 
                      style={[
                        styles.movementBar, 
                        { 
                          height: movementHeight,
                          bottom: 0,
                          left: 25
                        }
                      ]} 
                    />
                    
                    {/* Punto de llantos */}
                    <View 
                      style={[
                        styles.cryingPoint, 
                        { 
                          bottom: cryingHeight - 3,
                          left: 16
                        }
                      ]} 
                    />
                    
                    {/* Punto de movimientos */}
                    <View 
                      style={[
                        styles.movementPoint, 
                        { 
                          bottom: movementHeight - 3,
                          left: 26
                        }
                      ]} 
                    />
                  </View>
                );
              })}
            </View>
          </ScrollView>
          
          {/* Etiquetas de horas - ScrollView separado sincronizado */}
          <ScrollView 
            ref={hoursScrollRef}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            style={styles.hoursScrollView}
            contentContainerStyle={[styles.hoursContent, { width: totalWidth }]}
            bounces={false}
            scrollEnabled={false}
          >
            <View style={[styles.hoursContainer, { width: totalWidth }]}>
              {eventsData.events.map((event, index) => (
                <Text 
                  key={event.hour} 
                  style={[
                    styles.hourLabel, 
                    { 
                      left: index * hourWidth + 20,
                      width: hourWidth
                    }
                  ]}
                >
                  {event.hour}h
                </Text>
              ))}
            </View>
          </ScrollView>
        </View>
        
        {/* Instrucciones */}
        <Text style={styles.instructionText}>← Desliza horizontalmente para ver todas las 24 horas →</Text>
        
        {/* Leyenda */}
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

  <ScrollView style={styles.content} showsVerticalScrollIndicator={false} scrollEnabled={parentScrollEnabled} nestedScrollEnabled={true}>
        {/* Título del grupo */}
        <Text style={styles.groupName}>{group.name}</Text>

        {/* Gráfico */}
        {isLoadingEvents ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3E5F8A" />
            <Text style={styles.loadingText}>Cargando datos...</Text>
          </View>
        ) : (
          <View style={styles.chartContainer}>
            {/* WebView chart: Chart.js con panning horizontal - altura fija para evitar crecimiento infinito */}
            <ChartWebView
              height={220}
              labels={eventsData.events.map(e => `${e.hour}h`)}
              datasets={[
                { label: 'Llantos', data: eventsData.events.map(e => e.crying), borderColor: 'rgba(255,99,132,1)', backgroundColor: 'rgba(255,99,132,0.2)' },
                { label: 'Movimientos', data: eventsData.events.map(e => e.movement), borderColor: 'rgba(54,162,235,1)', backgroundColor: 'rgba(54,162,235,0.2)' }
              ]}
            />
          </View>
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
      </ScrollView>
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
  minHeight: 220,
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
  chartFixedContainer: {
    height: 250,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  yAxisContainer: {
    position: 'absolute',
    left: 5,
    top: 10,
    height: 180,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: 25,
    zIndex: 2,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    backgroundColor: 'rgba(250, 250, 250, 0.8)',
    paddingHorizontal: 2,
  },
  chartScrollView: {
    marginLeft: 30,
    marginTop: 10,
    height: 180,
    backgroundColor: '#fafafa',
  },
  chartContent: {
    paddingRight: 20,
  },
  chartGraph: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  gridLineHorizontal: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#e8e8e8',
    left: 0,
  },
  hourColumn: {
    position: 'absolute',
    top: 0,
    height: '100%',
  },
  gridLineVertical: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#e0e0e0',
    left: 25,
    top: 0,
  },
  cryingBar: {
    position: 'absolute',
    width: 8,
    backgroundColor: 'rgba(255, 99, 132, 0.7)',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  movementBar: {
    position: 'absolute',
    width: 8,
    backgroundColor: 'rgba(54, 162, 235, 0.7)',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  cryingPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 99, 132, 1)',
    borderWidth: 1,
    borderColor: '#fff',
  },
  movementPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(54, 162, 235, 1)',
    borderWidth: 1,
    borderColor: '#fff',
  },
  hoursScrollView: {
    height: 30,
    marginLeft: 30,
    backgroundColor: '#fafafa',
  },
  hoursContent: {
    paddingRight: 20,
  },
  hoursContainer: {
    position: 'relative',
    height: 30,
  },
  hourLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
    top: 5,
  },
  instructionText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
    marginBottom: 10,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
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
});

export default StatisticsScreen;
