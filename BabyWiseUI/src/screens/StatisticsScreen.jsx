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
  FlatList,
  Keyboard,
  Pressable,
  Platform
} from 'react-native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import ChartWebView from '../components/ChartWebView';
import ChatPanel from '../components/ChatPanel';
import { GlobalStyles } from '../styles/Styles';


  {/* Chart container layout measurement for overlay */}
  {/* note: ensure we measure the same container that renders the ChartWebView */}

const StatisticsScreen = ({ navigation, route }) => {
  const { group } = route.params;
  const [eventsData, setEventsData] = useState(null);
  const [llmResponse, setLlmResponse] = useState('');
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoadingLLM, setIsLoadingLLM] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [chartBottom, setChartBottom] = useState(0);
  const INPUT_HEIGHT = Platform.OS === 'ios' ? 96 : 72;
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
    fetchCameras();
  }, []);

  // Listen to keyboard to show a dismiss-overlay when open
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Fetch cameras for the group (HARDCODED from backend for now)
  const fetchCameras = async () => {
    try {
      setIsLoadingEvents(true);
      // Use existing public endpoint /groups to obtain group info (includes cameras)
      const url = `${SIGNALING_SERVER_URL}/groups`;
      const res = await fetch(url);
      const data = await res.json();
      // /groups returns an array of group objects
      if (Array.isArray(data)) {
        const found = data.find(g => String(g._id) === String(group.id) || String(g.id) === String(group.id));
        if (found && found.cameras) {
          setCameras(found.cameras);
          const first = found.cameras[0];
          if (first) {
            setSelectedCamera(first);
            // camera object has .user which is a user id; pass that as cameraUid
            const camUid = first.user && first.user._id ? first.user._id : first.user ? first.user : first.uid;
            await fetchEventsByCamera(camUid);
          }
        } else {
          // group not found or no cameras
          console.warn('fetchCameras: group not found in /groups response or no cameras present');
          setCameras([]);
          setEventsData(null);
        }
      } else {
        console.warn('fetchCameras: unexpected /groups response', data);
        setCameras([]);
        setEventsData(null);
      }
    } catch (error) {
      console.error('Error al obtener camaras:', error);
      Alert.alert('Error', 'No se pudo obtener la lista de cámaras');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const fetchEventsByCamera = async (cameraUid) => {
    try {
      setIsLoadingEvents(true);
      console.log('fetchEventsByCamera called with cameraUid:', cameraUid, 'type:', typeof cameraUid);
  const url = `${SIGNALING_SERVER_URL}/events/camera/${cameraUid}`;
      console.log('Fetching from URL:', url);
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.success && data.data && data.data.events) {
        setEventsData({ groupId: group.id, events: data.data.events, period: data.data.period, generatedAt: data.data.generatedAt });
      } else {
        setEventsData(null);
      }
    } catch (error) {
      console.error('Error al obtener eventos por camara:', error);
      Alert.alert('Error', 'No se pudieron obtener los eventos de la cámara');
      setEventsData(null);
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
        <View style={styles.chartContainer} onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            // compute bottom position relative to the content container
            setChartBottom(y + height);
          }}>
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
            nestedScrollEnabled={true}
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
                    <View key={`${event.timestamp}-${index}`} style={[styles.hourColumn, { left: x, width: hourWidth }]}>
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
            nestedScrollEnabled={false}
          >
            <View style={[styles.hoursContainer, { width: totalWidth }]}>
              {eventsData.events.map((event, index) => (
                <Text 
                  key={`h-${event.timestamp}-${index}`} 
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
    <SafeAreaView style={GlobalStyles.container}>
      {/* Header */}
      <View>
        <TouchableOpacity style={GlobalStyles.backButton} onPress={() => navigation.goBack()}>
          <Text style={GlobalStyles.backButtonText}>‹</Text>
        </TouchableOpacity>
       </View>
      

      <View style={GlobalStyles.container}>
      <Text style={GlobalStyles.title}>Estadísticas</Text>
        
        {/* Selector de cámaras */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>Bebe</Text>
          {isLoadingEvents ? (
            <View style={{ padding: 12, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#3E5F8A" />
            </View>
          ) : (
            <View>
              {/* Collapsed picklist: show only selected camera. Tap to toggle list. */}
              <TouchableOpacity onPress={() => setDropdownOpen(o => !o)} style={{ padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff' }}>
                <Text style={{ color: '#333' }}>{selectedCamera ? selectedCamera.name : 'Seleccionar cámara'}</Text>
              </TouchableOpacity>

              {/* Expanded list */}
              {dropdownOpen && (
                <View style={{ marginTop: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' }}>
                  {cameras.map((cam, index) => {
                    // Use the same logic as in fetchCameras to get the camera UID
                    const camUid = cam.user && cam.user._id ? cam.user._id : cam.user ? cam.user : cam.uid;
                    return (
                      <TouchableOpacity 
                        key={camUid || index} 
                        onPress={async () => { 
                          setDropdownOpen(false); 
                          setSelectedCamera(cam); 
                          await fetchEventsByCamera(camUid); 
                        }} 
                        style={{ 
                          padding: 12, 
                          backgroundColor: selectedCamera && ((selectedCamera.user && selectedCamera.user._id) === camUid || selectedCamera.user === camUid || selectedCamera.uid === camUid) ? '#eef4ff' : '#fff' 
                        }}
                      >
                        <Text style={{ color: '#333' }}>{cam.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Gráfico - Área fija que no scrollea */}
        {isLoadingEvents ? (
          <View style={GlobalStyles.loadingContainer} pointerEvents="none">
            <ActivityIndicator size="large" color="#3E5F8A" />
            <Text style={GlobalStyles.cardSubtitle}>Cargando datos...</Text>
          </View>
        ) : (
          <View style={styles.chartContainer} onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              setChartBottom(y + height);
            }} pointerEvents="box-none">
              {/* WebView chart: Chart.js con panning horizontal - altura fija para evitar crecimiento infinito */}
                {eventsData && eventsData.events ? (
                  <ChartWebView
                    height={220}
                    labels={eventsData.events.map(e => `${e.hour}h`)}
                    datasets={[
                      { label: 'Llantos', data: eventsData.events.map(e => e.crying), borderColor: 'rgba(255,99,132,1)', backgroundColor: 'rgba(255,99,132,0.2)' },
                      { label: 'Movimientos', data: eventsData.events.map(e => e.movement), borderColor: 'rgba(54,162,235,1)', backgroundColor: 'rgba(54,162,235,0.2)' }
                    ]}
                  />
                ) : (
                  <Text style={styles.noDataText}>No hay datos disponibles</Text>
                )}
            </View>
        )}

        {/* Chat area - Esta es la única zona que controla el scroll vertical */}
        {/* Usamos el ScrollView del padre (no lo removemos). Hacemos que su content se expanda y permita taps mientras
            el teclado está abierto para que el botón Enviar sea accesible. */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <ChatPanel
            groupId={group.id}
            cameraUid={selectedCamera ? (selectedCamera.user && selectedCamera.user._id ? selectedCamera.user._id : selectedCamera.user ? selectedCamera.user : selectedCamera.uid) : null}
            initialMessages={[{ id: 'greeting', role: 'assistant', text: '¡Hola! Soy tu asistente inteligente. ¿Cómo puedo ayudarte?' }]}
          />
        </ScrollView>
      </View> 
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
    minHeight: 180,
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
    height: 220,
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
  keyboardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 50,
  },
});

export default StatisticsScreen;
