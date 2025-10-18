import React, { useState, useEffect, useRef } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { groupService } from '../services/apiService';
import { auth } from '../config/firebase';
import { GlobalStyles, Colors} from '../styles/Styles';


const GroupOptionsScreen = ({ navigation, route }) => {
  const { group, userName } = route.params || {};
  
  // Estados para el modal de agregar miembro
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Estado para el modal de media
  const [showMediaModal, setShowMediaModal] = useState(false);
  
  // Estado para el modal de opciones de cámara
  const [showCameraOptionsModal, setShowCameraOptionsModal] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  
  // Estados para el modal de settings
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [cryingDetection, setCryingDetection] = useState(false);
  const [audioVideoRecording, setAudioVideoRecording] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // HARDCODED: Simulación de base de datos local para settings
  const [localSettingsDB, setLocalSettingsDB] = useState({});
  const [fetchedCameras, setFetchedCameras] = useState(null);
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);

  // Cargar settings al montar el componente
  useEffect(() => {
    loadGroupSettings();
    fetchCamerasFromBackend();
  }, []);

  const fetchCamerasFromBackend = async () => {
    setIsLoadingCameras(true);
    try {
      // Use groupService to get groups for current user, then find this group by id
      // If groupService requires UID, try to use group._id (fallback to public /groups)
      let groups = [];
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          groups = await groupService.getUserGroups(currentUser.uid);
        }
      } catch (e) {
        // fallback to public fetch
        const res = await fetch(`${SIGNALING_SERVER_URL}/groups`);
        groups = await res.json();
      }

      const found = Array.isArray(groups) ? groups.find(g => String(g._id) === String(group._id || group.id)) : null;
      if (found && found.cameras) {
        setFetchedCameras(found.cameras);
      } else {
        setFetchedCameras(group.cameras || []);
      }
    } catch (error) {
      console.error('Error fetching cameras:', error);
      setFetchedCameras(group.cameras || []);
    } finally {
      setIsLoadingCameras(false);
    }
  };

  // HARDCODED: Función para cargar settings (simulando llamada a backend)
  const loadGroupSettings = async () => {
    setIsLoadingSettings(true);
    try {
      console.log(`HARDCODED: Cargando settings para grupo: ${group.id}`);
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Si no existen settings para este grupo, usar defaults
      const groupSettings = localSettingsDB[group.id] || {
        cryDetection: false,
        audioVideoRecording: false,
        updatedAt: new Date().toISOString()
      };
      
      setCryingDetection(groupSettings.cryDetection);
      setAudioVideoRecording(groupSettings.audioVideoRecording);
      console.log('HARDCODED: Settings cargados:', groupSettings);
      
    } catch (error) {
      console.error('HARDCODED: Error al cargar settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // HARDCODED: Función para guardar settings (simulando llamada a backend)
  const saveGroupSettings = async () => {
    setIsSavingSettings(true);
    try {
      console.log(`HARDCODED: Guardando settings para grupo: ${group.id}`, {
        cryDetection: cryingDetection,
        audioVideoRecording: audioVideoRecording
      });
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actualizar "base de datos" local
      const newSettings = {
        cryDetection: cryingDetection,
        audioVideoRecording: audioVideoRecording,
        updatedAt: new Date().toISOString()
      };
      
      setLocalSettingsDB(prev => ({
        ...prev,
        [group.id]: newSettings
      }));
      
      console.log('HARDCODED: Settings guardados exitosamente:', newSettings);
      console.log('HARDCODED: Estado actual de la "base de datos":', { ...localSettingsDB, [group.id]: newSettings });
      
      showSuccessToast('Settings actualizados correctamente');
      setShowSettingsModal(false);
      
    } catch (error) {
      console.error('HARDCODED: Error al guardar settings:', error);
      Alert.alert('Error', 'Error simulado al guardar settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Modal para ingresar nombre de la cámara
  const [showCameraNameModal, setShowCameraNameModal] = useState(false);
  const [cameraName, setCameraName] = useState('');

  const goToCamera = () => {
    setShowCameraNameModal(true);
  };

  const goToStatistics = () => {
    navigation.navigate('Statistics', { group });
  };

  const handleCameraName = () => {
    if (!cameraName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para la cámara');
      return;
    }
    setShowCameraNameModal(false);
    groupService.addCamera(group.id,cameraName)
    navigation.navigate('Camera', { group, cameraName: cameraName.trim(), userName });
    setCameraName('');
  };


  // Función para mostrar toast
  const showSuccessToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    
    // Ocultar el toast después de 3 segundos
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Función para generar código de invitación
  const generateInviteCode = async () => {
    setIsGeneratingCode(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const code = await groupService.getInviteCode(group._id || group.id);
      setInviteCode(code);
      showSuccessToast('Código de invitación generado');
    } catch (error) {
      console.error('Error generating invite code:', error);
      Alert.alert('Error', 'No se pudo generar el código de invitación');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const addMembers = () => {
    setShowAddMemberModal(true);
    generateInviteCode(); // Generar código automáticamente al abrir modal
  };

  const cancelAddMember = () => {
    setShowAddMemberModal(false);
    setInviteCode('');
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={GlobalStyles.backButton} onPress={() => navigation.goBack()}>
          <Text style={GlobalStyles.backButtonText}>‹</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: -45 }}>
          <TouchableOpacity style={[styles.settingsButton, { marginRight: 35 }]} onPress={addMembers}>
            {/* Ícono de personas (agregar miembros) */}
            <View style={{ width: 26, height: 22, position: 'relative' }}>
              {/* Primera persona (atrás/izquierda) */}
              <View style={{
                position: 'absolute',
                left: 0,
                top: 0,
              }}>
                {/* Cabeza */}
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: Colors.text,
                  marginLeft: 3,
                }} />
                {/* Cuerpo */}
                <View style={{
                  width: 13,
                  height: 12,
                  borderTopLeftRadius: 7,
                  borderTopRightRadius: 7,
                  backgroundColor: Colors.text,
                  marginTop: 1,
                }} />
              </View>
              
              {/* Segunda persona (adelante/derecha) - superpuesta */}
              <View style={{
                position: 'absolute',
                right: 0,
                top: 0,
              }}>
                {/* Cabeza */}
                <View style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: Colors.text,
                  marginLeft: 2.5,
                }} />
                {/* Cuerpo */}
                <View style={{
                  width: 13,
                  height: 12,
                  borderTopLeftRadius: 7,
                  borderTopRightRadius: 7,
                  backgroundColor: Colors.text,
                  marginTop: 1,
                }} />
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettingsModal(true)}>
            {/* Ícono de engranaje (configuración) */}
            <View style={{ width: 22, height: 22, position: 'relative' }}>
              {/* Dientes del engranaje */}
              <View style={{
                position: 'absolute',
                top: -1,
                left: 9,
                width: 4,
                height: 4,
                backgroundColor: Colors.text,
              }} />
              <View style={{
                position: 'absolute',
                bottom: -1,
                left: 9,
                width: 4,
                height: 4,
                backgroundColor: Colors.text,
              }} />
              <View style={{
                position: 'absolute',
                top: 9,
                left: 0,
                width: 4,
                height: 4,
                backgroundColor: Colors.text,
              }} />
              <View style={{
                position: 'absolute',
                top: 9,
                right: -1,
                width: 4,
                height: 4,
                backgroundColor: Colors.text,
              }} />
              {/* Dientes diagonales */}
              <View style={{
                position: 'absolute',
                top: 2,
                left: 2,
                width: 5,
                height: 5,
                backgroundColor: Colors.text,
              }} />
              <View style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 5,
                height: 5,
                backgroundColor: Colors.text,
              }} />
              <View style={{
                position: 'absolute',
                bottom: 2,
                left: 2,
                width: 5,
                height: 5,
                backgroundColor: Colors.text,
              }} />
              <View style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 5,
                height: 5,
                backgroundColor: Colors.text,
              }} />
              {/* Anillo exterior desde donde salen los dientes */}
              <View style={{
                position: 'absolute',
                top: 3,
                left: 3,
                width: 16,
                height: 16,
                borderRadius: 8,
                borderWidth: 3,
                borderColor: Colors.text,
                backgroundColor: Colors.background,
              }} />
              {/* Círculo central sólido */}
              <View style={{
                position: 'absolute',
                top: 8,
                left: 8,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: Colors.text,
              }} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.headerInfoCentered}>
        <Text style={styles.title}>{group.name}</Text>
        <Text style={styles.subtitle}>{group.members} miembros</Text>
      </View>

      {/* Título fijo de cámaras */}
      <Text style={styles.sectionTitle}>Cámaras</Text>

      {/* Camera list */}
      <ScrollView style={styles.cameraListContainer} showsVerticalScrollIndicator={false}>
        {isLoadingCameras ? (
          <View style={styles.noCameraCard}>
            <ActivityIndicator />
          </View>
        ) : (
          (fetchedCameras && fetchedCameras.length > 0) ? (
            fetchedCameras.map((cam, idx) => (
              <TouchableOpacity 
                key={cam._id || cam.user || idx} 
                style={styles.cameraCardVertical} 
                onPress={(event) => {
                  const { pageX, pageY } = event.nativeEvent;
                  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
                  
                  // Dimensiones aproximadas del modal (flexible)
                  const modalWidth = 200; // Ancho estimado basado en el texto más largo
                  const modalHeight = 220;
                  
                  // Calcular posición ajustada para que no se salga de la pantalla
                  let adjustedX = pageX;
                  let adjustedY = pageY;
                  
                  // Ajustar si se sale por la derecha
                  if (pageX + modalWidth > screenWidth) {
                    adjustedX = screenWidth - modalWidth - 20;
                  }
                  
                  // Ajustar si se sale por abajo
                  if (pageY + modalHeight > screenHeight) {
                    adjustedY = screenHeight - modalHeight - 20;
                  }
                  
                  // Ajustar si se sale por la izquierda (mínimo 20px de margen)
                  if (adjustedX < 20) {
                    adjustedX = 20;
                  }
                  
                  // Ajustar si se sale por arriba (mínimo 20px de margen)
                  if (adjustedY < 20) {
                    adjustedY = 20;
                  }
                  
                  setModalPosition({ x: adjustedX, y: adjustedY });
                  setSelectedCamera(cam);
                  setShowCameraOptionsModal(true);
                }}
              >
                {/* Thumbnail placeholder con relación de aspecto 16:9 */}
                <View style={styles.cameraAvatarVertical} />
                
                {/* Información debajo del thumbnail */}
                <View style={styles.cameraInfo}>
                  <Text style={styles.cameraNameVertical}>{cam.name || `Cámara ${idx+1}`}</Text>
                  <Text style={styles.cameraStatus}>
                    {cam.status === 'ONLINE' ? '🟢 En línea' : '⚫ Desconectada'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noCameraCard}>
              <Text style={styles.noCameraText}>No hay cámaras añadidas</Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Barra de navegación inferior */}
      <View style={styles.bottomNavBar}>
        {/* Botón de Estadísticas */}
        <TouchableOpacity 
          style={styles.navButton}
          onPress={goToStatistics}
        >
          <View style={styles.navIconContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
              <View style={{ width: 4, height: 12, backgroundColor: Colors.textSecondary, borderRadius: 2 }} />
              <View style={{ width: 4, height: 18, backgroundColor: Colors.textSecondary, borderRadius: 2 }} />
              <View style={{ width: 4, height: 10, backgroundColor: Colors.textSecondary, borderRadius: 2 }} />
              <View style={{ width: 4, height: 16, backgroundColor: Colors.textSecondary, borderRadius: 2 }} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Botón central de Agregar Bebé */}
        <TouchableOpacity 
          style={styles.navButtonCenter}
          onPress={goToCamera}
        >
          <View style={styles.navIconContainerCenter}>
            <Text style={styles.navIconCenter}>+</Text>
          </View>
        </TouchableOpacity>

        {/* Botón de Grabaciones */}
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => setShowMediaModal(!showMediaModal)}
        >
          <View style={styles.navIconContainer}>
            {/* Ícono de play (reproducir) */}
            <View style={{ 
              width: 0, 
              height: 0, 
              borderLeftWidth: 16,
              borderTopWidth: 10,
              borderBottomWidth: 10,
              borderLeftColor: Colors.textSecondary,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              marginLeft: 4,
            }} />
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Menú de opciones de Media */}
      {showMediaModal && (
        <View style={styles.mediaMenuContainer}>
          <TouchableOpacity
            onPress={() => {
              setShowMediaModal(false);
              navigation.navigate('AudioListScreen', { room: group._id || group.id });
            }}
            style={styles.mediaMenuOption}
          >
            <Text style={styles.mediaMenuText}>Audios</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              setShowMediaModal(false);
              navigation.navigate('RecordingsListScreen', { room: group._id || group.id });
            }}
            style={[styles.mediaMenuOption, { borderBottomWidth: 0 }]}
          >
            <Text style={styles.mediaMenuText}>Grabaciones</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal para agregar miembro */}
      <Modal
        visible={showAddMemberModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelAddMember}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Código de Invitación</Text>
            
            <Text style={styles.modalDescription}>
              Comparte este código con la persona que deseas agregar al grupo:
            </Text>
            
            {isGeneratingCode ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3E5F8A" />
                <Text style={styles.loadingText}>Generando código...</Text>
              </View>
            ) : (
              <View style={styles.codeContainer}>
                <Text style={styles.inviteCode}>{inviteCode}</Text>
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={() => {
                    // TODO: Implementar copia al portapapeles
                    showSuccessToast('Código copiado al portapapeles');
                  }}
                >
                  <Text style={styles.copyButtonText}>Copiar</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={cancelAddMember}
              >
                <Text style={styles.cancelButtonText}>Cerrar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButton]} 
                onPress={generateInviteCode}
                disabled={isGeneratingCode}
              >
                {isGeneratingCode ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>Nuevo Código</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para ingresar nombre de la cámara */}
      <Modal
        visible={showCameraNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCameraNameModal(false)}
      >
        <View style={GlobalStyles.modalOverlay}>
          <View style={GlobalStyles.modalContainer}>
            <Text style={GlobalStyles.modalTitle}>Nombre del Bebe</Text>
            <TextInput
              style={GlobalStyles.modalInput}
              placeholderTextColor="#999"
              value={cameraName}
              onChangeText={setCameraName}
              autoFocus={true}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <View style={GlobalStyles.modalButtons}>
              <TouchableOpacity 
                style={[GlobalStyles.modalButton, GlobalStyles.cancelButton]} 
                onPress={() => setShowCameraNameModal(false)}
              >
                <Text style={GlobalStyles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[GlobalStyles.modalButton, GlobalStyles.addButton]} 
                onPress={handleCameraName}
              >
                <Text style={GlobalStyles.addButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal de Settings */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={GlobalStyles.modalOverlay}>
          <View style={GlobalStyles.modalContainer}>
            <Text style={GlobalStyles.modalTitle}>Configuración</Text>
            
            {isLoadingSettings ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Cargando configuración...</Text>
              </View>
            ) : (
              <>
                {/* Toggle para detección de llanto */}
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Detección de llanto</Text>
                  <TouchableOpacity 
                    style={[styles.toggle, cryingDetection && styles.toggleActive]}
                    onPress={() => setCryingDetection(!cryingDetection)}
                    disabled={isSavingSettings}
                  >
                    <View style={[styles.toggleCircle, cryingDetection && styles.toggleCircleActive]} />
                  </TouchableOpacity>
                </View>
                
                {/* Toggle para grabación de audio y video */}
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Grabación de audio y video</Text>
                  <TouchableOpacity 
                    style={[styles.toggle, audioVideoRecording && styles.toggleActive]}
                    onPress={() => setAudioVideoRecording(!audioVideoRecording)}
                    disabled={isSavingSettings}
                  >
                    <View style={[styles.toggleCircle, audioVideoRecording && styles.toggleCircleActive]} />
                  </TouchableOpacity>
                </View>
              </>
            )}
            
            <View style={GlobalStyles.modalButtons}>
              <TouchableOpacity 
                style={[GlobalStyles.modalButton, GlobalStyles.cancelButton]} 
                onPress={() => setShowSettingsModal(false)}
                disabled={isSavingSettings}
              >
                <Text style={GlobalStyles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[GlobalStyles.modalButton, GlobalStyles.addButton]} 
                onPress={saveGroupSettings}
                disabled={isSavingSettings || isLoadingSettings}
              >
                {isSavingSettings ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de opciones de cámara */}
      {showCameraOptionsModal && (
        <>
          {/* Overlay invisible para cerrar al tocar fuera */}
          <TouchableOpacity 
            style={styles.cameraOptionsOverlay}
            activeOpacity={1}
            onPress={() => setShowCameraOptionsModal(false)}
          />
          
          <View style={[styles.cameraOptionsContainer, { top: modalPosition.y, left: modalPosition.x }]}>
            {/* Ver en vivo */}
            <TouchableOpacity
              style={styles.cameraOptionButton}
              onPress={() => {
                setShowCameraOptionsModal(false);
                navigation.navigate('Viewer', { group, userName, cameraName: selectedCamera?.name });
              }}
            >
              <Text style={styles.cameraOptionButtonText}>Ver en vivo</Text>
            </TouchableOpacity>
            
            {/* Grabar en vivo */}
            <TouchableOpacity
              style={styles.cameraOptionButton}
              onPress={() => {
                setShowCameraOptionsModal(false);
                navigation.navigate('Camera', { group, cameraName: selectedCamera?.name, userName });
              }}
            >
              <Text style={styles.cameraOptionButtonText}>Grabar en vivo</Text>
            </TouchableOpacity>
            
            {/* Ver grabaciones */}
            <TouchableOpacity
              style={styles.cameraOptionButton}
              onPress={() => {
                setShowCameraOptionsModal(false);
                navigation.navigate('RecordingsListScreen', { 
                  room: group._id || group.id, 
                  babyName: selectedCamera?.name 
                });
              }}
            >
              <Text style={styles.cameraOptionButtonText}>Ver grabaciones</Text>
            </TouchableOpacity>
            
            {/* Ver estadísticas */}
            <TouchableOpacity
              style={[styles.cameraOptionButton, { borderBottomWidth: 0 }]}
              onPress={() => {
                setShowCameraOptionsModal(false);
                navigation.navigate('Statistics', { group, cameraName: selectedCamera?.name });
              }}
            >
              <Text style={styles.cameraOptionButtonText}>Ver estadísticas</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Toast de éxito */}
      {showToast && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 28,
    color: '#0F172A',
    fontWeight: '600',
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 15,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  settingsButtonText: {
    fontSize: 26,
    color: '#0F172A',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerInfoCentered: { 
    alignItems: 'center', 
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  cameraListContainer: { 
    flex: 1,
    paddingHorizontal: 12,
    marginBottom: 100, // Espacio para el bottom nav
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#0F172A', 
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 18,
  },
  cameraCardVertical: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEFF1',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cameraAvatarVertical: {
    width: '100%',
    aspectRatio: 16 / 9, // Relación de aspecto 16:9
    borderRadius: 16,
    backgroundColor: '#E6EEF8',
    marginBottom: 12,
  },
  cameraInfo: {
    paddingHorizontal: 4,
  },
  cameraNameVertical: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#0F172A',
    marginBottom: 4,
  },
  cameraStatus: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  noCameraCard: { 
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noCameraText: { 
    color: '#94A3B8',
    fontSize: 15,
  },
  actionsSection: { marginTop: 24, paddingLeft: 18 },
  actionsGridRowFirst: { paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  actionsGridRow: { paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', marginTop: 0 },
  gridCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F4F6FB',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardActionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  cardActionSubtitle: { color: '#777', marginTop: 6, fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: 'bold' },
  addButton: { backgroundColor: '#4CAF50' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  toastContainer: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  toastText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  settingLabel: { fontSize: 16, color: '#333', fontWeight: '500', flex: 1 },
  toggle: { width: 50, height: 26, borderRadius: 13, backgroundColor: '#ccc', justifyContent: 'center', padding: 2 },
  toggleActive: { backgroundColor: '#4CAF50' },
  toggleCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 2 },
  toggleCircleActive: { transform: [{ translateX: 24 }] },
  loadingContainer: { alignItems: 'center', marginVertical: 30 },
  loadingText: { marginTop: 10, fontSize: 14, color: '#666' },
  modalDescription: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  codeContainer: { alignItems: 'center', marginVertical: 20 },
  inviteCode: { fontSize: 24, fontWeight: 'bold', color: '#3E5F8A', backgroundColor: '#f5f5f5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginBottom: 10, letterSpacing: 2 },
  copyButton: { backgroundColor: '#E8F4FD', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5 },
  copyButtonText: { color: '#3E5F8A', fontSize: 14, fontWeight: 'bold' },
  
  // Barra de navegación inferior
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navButtonCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -40,
  },
  navIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconContainerCenter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  navIconCenter: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Menú de opciones de Media
  mediaMenuContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 8,
    minWidth: 150,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 1000,
  },
  mediaMenuOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  mediaMenuText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  
  // Modal de opciones de cámara
  cameraOptionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  cameraOptionsContainer: {
    position: 'absolute',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 1000,
  },
  cameraOptionButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  cameraOptionButtonText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
});

  

export default GroupOptionsScreen;
