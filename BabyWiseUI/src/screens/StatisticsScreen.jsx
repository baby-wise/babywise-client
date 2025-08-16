import React, { useState, useEffect } from 'react';
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

const StatisticsScreen = ({ navigation, route }) => {
  const { group } = route.params;
  const [eventsData, setEventsData] = useState(null);
  const [llmResponse, setLlmResponse] = useState('');
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingLLM, setIsLoadingLLM] = useState(true);

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    fetchEventsData();
    fetchLLMAnalysis();
  }, []);

  const fetchEventsData = async () => {
    try {
      setIsLoadingEvents(true);
      
      // HARDCODED: Datos simulados de eventos
      const hardcodedData = {
        groupId: group.id,
        events: [
          { hour: 8, crying: 2, movement: 12 },
          { hour: 9, crying: 1, movement: 8 },
          { hour: 10, crying: 0, movement: 15 },
          { hour: 11, crying: 3, movement: 6 },
          { hour: 12, crying: 1, movement: 9 },
          { hour: 13, crying: 0, movement: 14 },
          { hour: 14, crying: 2, movement: 11 },
          { hour: 15, crying: 4, movement: 5 },
          { hour: 16, crying: 1, movement: 13 },
          { hour: 17, crying: 2, movement: 7 },
          { hour: 18, crying: 3, movement: 10 },
          { hour: 19, crying: 1, movement: 8 }
        ],
        period: '12h',
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
      const response = await fetch('http://10.0.2.2:3001/llm-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          UID: group.id
        }),
      });
      
      const data = await response.json();
      
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

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Actividad en las últimas 12 horas</Text>
        
        {/* Gráfico temporal con texto */}
        <View style={styles.tempChartContainer}>
          <Text style={styles.tempChartTitle}>📊 Datos de Actividad</Text>
          
          <View style={styles.dataTable}>
            <View style={styles.tableHeader}>
              <Text style={styles.headerCell}>Hora</Text>
              <Text style={styles.headerCell}>Llantos</Text>
              <Text style={styles.headerCell}>Movimientos</Text>
            </View>
            
            {eventsData.events.map((event, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.cell}>{event.hour}h</Text>
                <Text style={[styles.cell, styles.cryingCell]}>{event.crying}</Text>
                <Text style={[styles.cell, styles.movementCell]}>{event.movement}</Text>
              </View>
            ))}
          </View>
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Análisis LLM */}
        <View style={styles.analysisContainer}>
          <Text style={styles.analysisTitle}>Análisis Inteligente</Text>
          {isLoadingLLM ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3E5F8A" />
              <Text style={styles.loadingText}>Generando análisis...</Text>
            </View>
          ) : (
            <Text style={styles.analysisText}>{llmResponse}</Text>
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
});

export default StatisticsScreen;
