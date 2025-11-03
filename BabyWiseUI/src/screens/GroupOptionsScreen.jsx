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
  Dimensions,
  RefreshControl
} from 'react-native';
import apiClient, { groupService } from '../services/apiService';
import { auth } from '../config/firebase';
import { GlobalStyles, Colors} from '../styles/Styles';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import CameraThumbnailPreview from '../components/CameraThumbnailPreview';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import Clipboard from '@react-native-clipboard/clipboard';

const GroupOptionsScreen = ({ navigation, route }) => {
  const { group, userName } = route.params || {};
  const [userPermission, setUserPermission] = useState(null)
  
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
  const [motionDetection, setMotionDetection] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [fetchedCameras, setFetchedCameras] = useState(null);
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [camerasRuntimeStatus, setCamerasRuntimeStatus] = useState({});

  // Estados para el modal de miembros
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserUID, setCurrentUserUID] = useState(null);

  // Cargar settings al montar el componente
  useEffect(() => {
    console.log(group)
    loadGroupSettings();
    fetchCamerasFromBackend();
    checkIfUserIsAdmin();
    getCurrentUserUID();
    getUserPermission();
  }, []);

  const getUserPermission = async () =>{
    try {
      const permisos = await groupService.getUserPermmissionForGroup(auth.currentUser.uid,group.id)
      if(permisos){
        setUserPermission(permisos)
      }
      console.log(permisos)
    } catch (error) {
      console.log(error)
      setUserPermission({camera: true, viewer: true})
    }
  }

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

  // Función para verificar si el usuario actual es admin
  const checkIfUserIsAdmin = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const response = await groupService.isAdmin(currentUser.uid, group._id || group.id);
      // El backend retorna {message: "Is admin"} o {message: "Is not admin"}
      setIsAdmin(response.message === "Is admin");
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // Función para obtener el UID del usuario actual
  const getCurrentUserUID = () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setCurrentUserUID(currentUser.uid);
    }
  };

  // Función para obtener miembros del grupo
  const fetchGroupMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener los grupos del usuario y encontrar el grupo actual
      const groups = await groupService.getUserGroups(currentUser.uid);
      const currentGroup = groups.find(g => String(g._id) === String(group._id || group.id));
      
      if (currentGroup && currentGroup.users) {
        // Extraer los usuarios del array de objetos {user: {...}, role: "..."}
        const members = currentGroup.users.map(userObj => userObj.user);
        setGroupMembers(members);
        group.members = members.length
      } else {
        setGroupMembers([]);
      }
    } catch (error) {
      console.error('Error fetching group members:', error);
      Alert.alert('Error', 'No se pudo cargar la lista de miembros');
      setGroupMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Función para manejar la eliminación de un miembro
  const handleRemoveMember = async (member) => {
    console.log('=== handleRemoveMember: Iniciando eliminación ===');
    console.log('Member to remove:', member);
    console.log('Member UID (Firebase):', member.UID);
    console.log('Member _id (MongoDB):', member._id);
    console.log('Group ID:', group._id || group.id);
    console.log('Current user is admin:', isAdmin);
    console.log('Current user UID:', currentUserUID);

    // Verificar que el usuario sea admin
    if (!isAdmin) {
      Alert.alert('Sin permisos', 'Solo los administradores pueden eliminar miembros');
      return;
    }

    // Verificar que no se esté intentando eliminar a sí mismo
    if (member.UID === currentUserUID) {
      Alert.alert('Acción no permitida', 'No puedes eliminarte a ti mismo del grupo');
      return;
    }

    // Mostrar confirmación
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que deseas eliminar a ${member.email} del grupo?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Calling removeMember with:', {
                UID: member.UID,
                groupId: group._id || group.id
              });
              
              const result = await groupService.removeMember(member.UID, group._id || group.id);
              
              console.log('removeMember result:', result);
              showSuccessToast('Miembro eliminado correctamente');
              // Refrescar la lista de miembros
              await fetchGroupMembers();
            } catch (error) {
              console.error('=== Error removing member ===');
              console.error('Error object:', error);
              console.error('Error message:', error.message);
              console.error('Error response:', error.response);
              console.error('Error response data:', error.response?.data);
              console.error('Error response status:', error.response?.status);
              Alert.alert('Error', `No se pudo eliminar al miembro: ${error.response?.data?.error || error.message}`);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Función para abrir el modal de miembros
  const openMembersModal = async () => {
    setShowMembersModal(true);
    await fetchGroupMembers();
  };

  // Función para refrescar las cámaras
  const onRefresh = async () => {
    setRefreshing(true);
    console.log('Refrescando lista de cámaras...');
    await fetchCamerasFromBackend();
    await loadGroupSettings();
    await checkIfUserIsAdmin();
    await getCurrentUserUID();
    await getUserPermission();
    // Resetear el estado de runtime al refrescar
    setCamerasRuntimeStatus({});
    setRefreshing(false);
  };

  // Manejar cuando una cámara se desconecta en tiempo real
  const handleCameraDisconnected = (cameraId) => {
    console.log('[GroupOptions] Cámara desconectada en runtime:', cameraId);
    setCamerasRuntimeStatus(prev => ({
      ...prev,
      [cameraId]: 'OFFLINE'
    }));
  };

  // HARDCODED: Función para cargar settings (simulando llamada a backend)
  const loadGroupSettings = async () => {
    setIsLoadingSettings(true);
    try {
      console.log(`Loading settings for group: ${group._id || group.id}`);
      
      const settings = await groupService.getGroupSettings(group._id || group.id);
      
      setCryingDetection(settings.cryDetection);
      setAudioVideoRecording(settings.audioVideoRecording);
      setMotionDetection(settings.motionDetection);
      console.log('Settings loaded:', settings);
      
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'No se pudieron cargar las configuraciones');
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // HARDCODED: Función para guardar settings (simulando llamada a backend)
  const saveGroupSettings = async () => {
    setIsSavingSettings(true);
    try {
      console.log(`Saving settings for group: ${group._id || group.id}`, {
        cryDetection: cryingDetection,
        audioVideoRecording: audioVideoRecording,
        motionDetection: motionDetection
      });
      
      await groupService.updateGroupSettings(group._id || group.id, {
        cryDetection: cryingDetection,
        audioVideoRecording: audioVideoRecording,
        motionDetection: motionDetection
      });
      
      console.log('Settings saved successfully');
      
      showSuccessToast('Configuración guardada correctamente');
      setShowSettingsModal(false);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      
      // Verificar si es error 403 (no admin)
      if (error.response?.status === 403) {
        Alert.alert('Sin permisos', 'Solo los administradores pueden cambiar la configuración');
      } else {
        Alert.alert('Error', 'No se pudo guardar la configuración');
      }
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

  //Modal de permisos
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberOptionsModal, setShowMemberOptionsModal] = useState(false);
  const [permissions, setPermissions] = useState({ camera: false, viewer: false });
  const [selectedMemberIsAdmin, setSelectedMemberIsAdmin] = useState(false)

  const handleOpenMemberOptions = async (member) => {
    const permisos = await groupService.getUserPermmissionForGroup(member.UID,group.id)
    setSelectedMember(member);
    setPermissions(permisos);
    const response = await groupService.isAdmin(member.UID, group._id || group.id);
    setSelectedMemberIsAdmin(response.message === "Is admin");
    setShowMemberOptionsModal(true);
  };

  const handleTogglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePermissions = async () => {
    if (!selectedMember) return;
    if (!permissions) return;
    try {
      groupService.setUserPermmissionForGroup(selectedMember.UID, group.id, permissions)
      //Alert.alert('Éxito', 'Permisos actualizados correctamente');
      setShowMemberOptionsModal(false);
    } catch (error) {
      console.error('Error al actualizar permisos:', error);
      Alert.alert('Error', 'No se pudieron actualizar los permisos');
    }
  };

  const handleMakeAdmin = async () => {
    try {
      await groupService.addAdmin(selectedMember.UID, group.id)
      //Alert.alert('Éxito', 'El usuario ahora es administrador');
      setShowMemberOptionsModal(false);
    } catch (error) {
      console.error('Error al hacer admin:', error);
      Alert.alert('Error', 'No se pudo actualizar el rol de administrador');
    }
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={GlobalStyles.backButton} onPress={() => navigation.goBack()}>
          <Text style={GlobalStyles.backButtonText}>‹</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: -45 }}>
          <TouchableOpacity style={[styles.settingsButton, { marginRight: 35 }]} onPress={addMembers}>
            <MaterialDesignIcons name="account-multiple-plus" size={28} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettingsModal(true)}>
            <MaterialDesignIcons name="cog" size={28} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.headerInfoCentered} onPress={openMembersModal}>
        <Text style={styles.title}>{group.name}</Text>
        <Text style={styles.subtitle}>{group.members} miembros</Text>
      </TouchableOpacity>

      {/* Título fijo de cámaras */}
      <Text style={styles.sectionTitle}>Cámaras</Text>

      {/* Camera list */}
      <ScrollView 
        style={styles.cameraListContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
            title="Actualizando cámaras..."
            titleColor="#64748B"
          />
        }
      >
        {isLoadingCameras ? (
          <View style={styles.noCameraCard}>
            <ActivityIndicator />
          </View>
        ) : (
          (fetchedCameras && fetchedCameras.length > 0) ? (
            fetchedCameras.map((cam, idx) => {
              // Determinar el estado real: runtime status tiene prioridad sobre el del backend
              const cameraId = cam._id || cam.user || idx;
              const runtimeStatus = camerasRuntimeStatus[cameraId];
              const effectiveStatus = runtimeStatus || cam.status;
              const isCurrentlyOnline = effectiveStatus === 'ONLINE';

              return (
              <TouchableOpacity 
                key={cameraId} 
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
                <View style={styles.cameraAvatarVertical}>
                  {isCurrentlyOnline ? (
                    <>
                      <CameraThumbnailPreview
                        roomId={group._id || group.id}
                        cameraName={cam.name}
                        isOnline={true}
                        onDisconnected={() => handleCameraDisconnected(cameraId)}
                      />
                      {/* Badge de "EN VIVO" */}
                      <View style={styles.liveBadge}>
                        <View style={styles.liveIndicator} />
                        <Text style={styles.liveText}>EN VIVO</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.offlineIconContainer}>
                      <MaterialDesignIcons 
                        name="video-off-outline" 
                        size={48} 
                        color="#94A3B8" 
                      />
                    </View>
                  )}
                </View>
                
                {/* Información debajo del thumbnail */}
                <View style={styles.cameraInfo}>
                  <Text style={styles.cameraNameVertical}>{cam.name || `Cámara ${idx+1}`}</Text>
                </View>
              </TouchableOpacity>
              );
            })
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
          <MaterialDesignIcons name="chart-bar" size={32} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Botón central de Agregar Bebé */}
        <TouchableOpacity 
          style={styles.navButtonCenter}
          onPress={goToCamera}
        >
          <View style={styles.navIconContainerCenter}>
            <MaterialDesignIcons name="plus" size={40} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Botón de Grabaciones */}
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => setShowMediaModal(!showMediaModal)}
        >
          <MaterialDesignIcons name="play" size={32} color={Colors.textSecondary} />
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
                    Clipboard.setString(inviteCode);
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
                    onPress={() => isAdmin && setCryingDetection(!cryingDetection)}
                    disabled={isSavingSettings || !isAdmin}
                  >
                    <View style={[styles.toggleCircle, cryingDetection && styles.toggleCircleActive]} />
                  </TouchableOpacity>
                </View>
                
                {/* Toggle para grabación de audio y video */}
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Grabación de audio y video</Text>
                  <TouchableOpacity 
                    style={[styles.toggle, audioVideoRecording && styles.toggleActive]}
                    onPress={() => isAdmin && setAudioVideoRecording(!audioVideoRecording)}
                    disabled={isSavingSettings || !isAdmin}
                  >
                    <View style={[styles.toggleCircle, audioVideoRecording && styles.toggleCircleActive]} />
                  </TouchableOpacity>
                </View>
                
                {/* Toggle para detección de movimiento */}
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Detección de movimiento</Text>
                  <TouchableOpacity 
                    style={[styles.toggle, motionDetection && styles.toggleActive]}
                    onPress={() => isAdmin && setMotionDetection(!motionDetection)}
                    disabled={isSavingSettings || !isAdmin}
                  >
                    <View style={[styles.toggleCircle, motionDetection && styles.toggleCircleActive]} />
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
                <Text style={GlobalStyles.cancelButtonText}>{isAdmin ? 'Cancelar' : 'Cerrar'}</Text>
              </TouchableOpacity>
              
              {isAdmin && (
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
              )}
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
            {userPermission?.viewer && (
              <TouchableOpacity
                style={styles.cameraOptionButton}
                onPress={() => {
                  setShowCameraOptionsModal(false);
                  navigation.navigate('Viewer', {
                    group,
                    userName,
                    cameraName: selectedCamera?.name
                  });
                }}
              >
                <Text style={styles.cameraOptionButtonText}>Ver en vivo</Text>
              </TouchableOpacity>
            )}
            
            {/* Grabar en vivo */}
            {userPermission?.camera && (
              <TouchableOpacity
                style={styles.cameraOptionButton}
                onPress={() => {
                  setShowCameraOptionsModal(false);
                  navigation.navigate('Camera', { group, cameraName: selectedCamera?.name, userName });
                }}
              >
                <Text style={styles.cameraOptionButtonText}>Grabar en vivo</Text>
              </TouchableOpacity>
            )}
            
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

      {/* Modal de miembros del grupo */}
      <Modal
        visible={showMembersModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Miembros del Grupo</Text>
            
            {isLoadingMembers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3E5F8A" />
                <Text style={styles.loadingText}>Cargando miembros...</Text>
              </View>
            ) : (
              <ScrollView style={styles.membersListContainer} showsVerticalScrollIndicator={false}>
                {groupMembers.length > 0 ? (
                  groupMembers.map((member, index) => {
                    const isCurrentUser = member.UID === currentUserUID;
                    return (
                      <View key={member._id || index} style={styles.memberItem}>
                        <View style={styles.memberInfo}>
                          <MaterialDesignIcons name="account-circle" size={24} color="#64748B" />
                          <View style={styles.memberTextContainer}>
                            <Text style={styles.memberEmail}>{member.email}</Text>
                            {isCurrentUser && (
                              <Text style={styles.currentUserLabel}>(Tú)</Text>
                            )}
                          </View>
                        </View>
                        {isAdmin && !isCurrentUser && (
                          <View style={{ flexDirection: "row", alignItems: "center" }}>

                            {/* Botón de eliminar miembro */}
                            <TouchableOpacity
                              style={styles.removeButton}
                              onPress={() => handleRemoveMember(member)}
                            >
                              <MaterialDesignIcons name="account-remove" size={24} color="#DC2626" />
                            </TouchableOpacity>
                            {/* Botón de opciones avanzadas */}
                            <TouchableOpacity
                              style={styles.optionsButton}
                              onPress={() => handleOpenMemberOptions(member)}
                            >
                              <MaterialDesignIcons name="dots-vertical" size={22} color="#3E5F8A" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.noMembersContainer}>
                    <Text style={styles.noMembersText}>No hay miembros en este grupo</Text>
                  </View>
                )}
              </ScrollView>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowMembersModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal de opciones avanzadas de miembro */}
      <Modal
        visible={showMemberOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMemberOptionsModal(false)}
      >
        <View style={GlobalStyles.modalOverlay}>
          <View style={GlobalStyles.modalContainer}>
            <Text style={GlobalStyles.modalTitle}>Permisos</Text>

            {selectedMember ? (
              <>
                <Text style={styles.memberEmail}>{selectedMember.email}</Text>

                {/* Toggle: Permiso de cámara */}
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Permiso para grabar</Text>
                  <TouchableOpacity
                    style={[styles.toggle, permissions.camera && styles.toggleActive]}
                    onPress={() => handleTogglePermission('camera')}
                    disabled={isSavingSettings}
                  >
                    <View
                      style={[
                        styles.toggleCircle,
                        permissions.camera && styles.toggleCircleActive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>

                {/* Toggle: Permiso de viewer */}
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Permiso de viewer</Text>
                  <TouchableOpacity
                    style={[styles.toggle, permissions.viewer && styles.toggleActive]}
                    onPress={() => handleTogglePermission('viewer')}
                    disabled={isSavingSettings}
                  >
                    <View
                      style={[
                        styles.toggleCircle,
                        permissions.viewer && styles.toggleCircleActive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>

                {/* Botón: Hacer administrador */}
                {!selectedMemberIsAdmin && (
                  <TouchableOpacity
                    style={styles.adminButton}
                    onPress={handleMakeAdmin}
                    disabled={isSavingSettings}
                  >
                    <MaterialDesignIcons name="account-star" size={20} color="#FFF" />
                    <Text style={styles.adminButtonText}>Hacer administrador</Text>
                  </TouchableOpacity>
                )}

                {/* Botones inferiores */}
                <View style={GlobalStyles.modalButtons}>
                  <TouchableOpacity
                    style={[GlobalStyles.modalButton, GlobalStyles.cancelButton]}
                    onPress={() => setShowMemberOptionsModal(false)}
                  >
                    <Text style={GlobalStyles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[GlobalStyles.modalButton, GlobalStyles.addButton]}
                    onPress={handleSavePermissions}
                  >
                    <Text style={styles.addButtonText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.loadingText}>Cargando datos del usuario...</Text>
            )}
          </View>
        </View>
      </Modal>

  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 4,
    left: 4,
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
    top: 4,
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
    paddingTop: 4,
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
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Importante para que el video respete el borderRadius
    position: 'relative',
  },
  offlineIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    marginTop: 8,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
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
  
  // Badge de "EN VIVO"
  liveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  liveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  
  // Estilos para el modal de miembros
  membersListContainer: {
    maxHeight: 400,
    marginVertical: 10,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    flex: 1,
  },
  memberEmail: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  currentUserLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 8,
  },
  removeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  noMembersContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noMembersText: {
    fontSize: 15,
    color: '#94A3B8',
  },
});

  

export default GroupOptionsScreen;
