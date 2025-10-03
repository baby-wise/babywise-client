import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  View
} from 'react-native';
import { GlobalStyles} from '../styles/Styles';


const BabyHomeScreen = ({ navigation, route }) => {
  const { group, userName, babyName } = route.params || {};
  const goToViewer = () => {
    navigation.navigate('Viewer', { group, userName });
  };

  const goToCamera = () => {
    navigation.navigate('Camera', { group, cameraName: babyName, userName });
  };

  const goToStatistics = () => {
    navigation.navigate('Statistics', { group, babyName });
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
    {/* Botón de volver minimalista */}
    <View>
      <TouchableOpacity style={GlobalStyles.backButton} onPress={() => navigation.goBack()}>
        <Text style={GlobalStyles.backButtonText}>‹</Text>
      </TouchableOpacity>
    </View>
    
    {/* Opciones centradas */}
    <View style={GlobalStyles.optionList}>
    {/* Título */}
    <Text style={GlobalStyles.title}>
      {babyName ? babyName : "Error: No Baby Name sent"}
    </Text>
    
      <TouchableOpacity 
        style={GlobalStyles.optionButton} 
        onPress={goToViewer}
      >
        <Text style={GlobalStyles.optionButtonText}>Ver a {babyName}</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={GlobalStyles.optionButton} 
        onPress={goToCamera}
      >
        <Text style={GlobalStyles.optionButtonText}>Ser Cámara</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={GlobalStyles.optionButton} 
        onPress={() => navigation.navigate("MediaOptionsScreen", { group })}
      >
        <Text style={GlobalStyles.optionButtonText}>Ver archivos multimedia</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={GlobalStyles.optionButton} 
        onPress={goToStatistics}
      >
        <Text style={GlobalStyles.optionButtonText}>Ver Estadísticas</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
  );
};

export default BabyHomeScreen;