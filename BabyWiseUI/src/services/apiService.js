import axios from 'axios';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import { auth } from '../config/firebase';

// Crear instancia de axios con configuración base
const apiClient = axios.create({
  baseURL: SIGNALING_SERVER_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación automáticamente
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Success:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.log('API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Servicios de Groups
export const groupService = {
  // Obtener todos los grupos del usuario autenticado
  async getUserGroups(UID) {
    console.log('=== getUserGroups: Getting groups for user ===');
    console.log('UID:', UID);
    
    try {
      console.log('Fetching user groups from:', `${SIGNALING_SERVER_URL}/secure/groups-for-user`);

      const response = await fetch(`${SIGNALING_SERVER_URL}/secure/groups-for-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': await getCurrentUserToken()
        },
        body: JSON.stringify({ UID })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('User groups fetched successfully:', data);
      return data;
      
    } catch (error) {
      console.error('Error fetching user groups:', error);
      console.error('Error message:', error.message);
      return [];
    }
  },

  // Crear nuevo grupo
  async createGroup(UID, name) {
    try {
      console.log('Attempting to create group:', { UID, name });
      console.log('Using server URL:', SIGNALING_SERVER_URL);
      console.log('Full URL:', `${SIGNALING_SERVER_URL}/secure/new-group`);
      
      const response = await apiClient.post('/secure/new-group', { UID, name });
      console.log('Group created successfully:', response.data);
      return response.data;
    } catch (error) {
      const errorDetails = {
        url: '/secure/new-group',
        method: 'post',
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      };
      console.error('API Error Details:', errorDetails);
      console.error('Error creating group:', error);
      
      // Agregar información adicional sobre el error de red
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        console.error('This is a network connectivity issue. Check if:');
        console.error('1. Backend is running on port 3001');
        console.error('2. Server URL is correct:', SIGNALING_SERVER_URL);
        console.error('3. Emulator can reach the backend');
      }
      
      throw error;
    }
  },

  // Agregar miembro al grupo
  async addMember(UID, inviteCode) {
    try {
      const response = await apiClient.post('/secure/add-member', { UID, inviteCode });
      return response.data;
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  },

  // Remover miembro del grupo
  async removeMember(UID, groupId) {
    try {
      console.log('=== removeMember API call ===');
      console.log('UID:', UID);
      console.log('groupId:', groupId);
      console.log('Request URL:', `${SIGNALING_SERVER_URL}/secure/remove-member`);
      console.log('Request body:', { UID, groupId });
      
      const response = await apiClient.post('/secure/remove-member', { UID, groupId });
      
      console.log('removeMember response:', response.data);
      return response.data;
    } catch (error) {
      console.error('=== removeMember API Error ===');
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error response status:', error.response?.status);
      console.error('Error response data:', error.response?.data);
      console.error('Request config:', error.config);
      throw error;
    }
  },

  // Verificar si es admin
  async isAdmin(UID, groupId) {
    try {
      const response = await apiClient.post('/secure/is-admin-member', { UID, groupId });
      return response.data;
    } catch (error) {
      console.error('Error checking admin status:', error);
      throw error;
    }
  },

  // Agregar admin
  async addAdmin(UID, groupId) {
    try {
      const response = await apiClient.post('/secure/add-admin-member', { UID, groupId });
      return response.data;
    } catch (error) {
      console.error('Error adding admin:', error);
      throw error;
    }
  },

  // Obtener código de invitación
  async getInviteCode(groupId) {
    try {
      const response = await apiClient.post('/secure/invitation-code', { groupId });
      return response.data;
    } catch (error) {
      console.error('Error getting invite code:', error);
      throw error;
    }
  },

  // Función de prueba de conectividad
  async testConnection() {
    try {
      console.log('Testing connection to:', SIGNALING_SERVER_URL);
      const response = await axios.get(`${SIGNALING_SERVER_URL}/groups`);
      console.log('Connection test successful:', response.status);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error.message);
      return false;
    }
  },

  //AddCamera
  async addCamera(groupId, name){
    try {
      const response = await apiClient.post('/secure/add-camera',{groupId,name})
    } catch (error) {
      console.log(error)
    }
  },

  async getEventByCamera(groupId, cameraName){
    try {
      const response = await apiClient.get(`/events/group/${groupId}/camera/${encodeURIComponent(cameraName)}`)
      return response.data
    } catch (error) {
      console.log(error)
    }
  },

  // Obtener configuraciones del grupo
  async getGroupSettings(groupId) {
    try {
      console.log('=== getGroupSettings API call ===');
      console.log('groupId:', groupId);
      const response = await apiClient.get(`/secure/group-settings/${groupId}`);
      console.log('Settings received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting group settings:', error);
      throw error;
    }
  },

  // Actualizar configuraciones del grupo
  async updateGroupSettings(groupId, settings) {
    try {
      console.log('=== updateGroupSettings API call ===');
      console.log('groupId:', groupId);
      console.log('settings:', settings);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const response = await apiClient.post('/secure/update-group-settings', {
        groupId,
        settings,
        UID: currentUser.uid
      });
      console.log('Settings updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating group settings:', error);
      throw error;
    }
  },
  //Obtener permisos de un usuario en un grupo
  async getUserPermmissionForGroup(userId,groupId){
    try {
      const currentUser = auth.currentUser
      const response = await apiClient.get(`/secure/group/${groupId}/user/${userId}/permission`)
      return response.data
    } catch (error) {
      console.log(error)
    }
  },
  async setUserPermmissionForGroup(userId,groupId, permisos){
    try {
      const response = await apiClient.post(`/secure/group/${groupId}/permission`,{UID: userId, permissionType: permisos})
      return response.data
    } catch (error) {
      console.log(error)
    }
  },
  async getGroupRules(groupId){
    try {
      const response = await apiClient.get(`/secure/group/${groupId}/rules`)
      return response.data
    } catch (error) {
      console.log(error)
    }
  },
  async addGroupRules(groupId,rule){
    try {
      const response = await apiClient.post(`/secure/group/${groupId}/rules`,{rule: rule})
      return response.data
    } catch (error) {
      console.log(error)
    }
  },
   async updateGroupRules(groupId,rule){
    try {
      const response = await apiClient.put(`/secure/group/${groupId}/rules`,{rule: rule})
      return response.data
    } catch (error) {
      console.log(error)
    }
  },
  async deleteGroupRules(groupId,ruleId){
    try {
      const response = await apiClient.put(`/secure/group/${groupId}/rules/delete`,{ruleId: ruleId})
      return response.data
    } catch (error) {
      console.log(error)
    }
  }

};

// Función helper para obtener token del usuario actual
async function getCurrentUserToken() {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      return `Bearer ${token}`;
    }
    return '';
  } catch (error) {
    console.log('Error getting auth token:', error);
    return '';
  }
}

// Servicios de Users
export const userService = {
  // Crear nuevo usuario
  async createUser(userData) {
    try {
      const response = await apiClient.post('/secure/new-user', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // Obtener todos los usuarios (para admin)
  async getAllUsers() {
    try {
      const response = await apiClient.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Obtener configuraciones del usuario
  async getUserSettings(UID) {
    try {
      console.log('=== getUserSettings API call ===');
      console.log('UID:', UID);
      const response = await apiClient.get(`/secure/user-settings/${UID}`);
      console.log('User settings received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  },

  // Actualizar configuraciones del usuario
  async updateUserSettings(UID, settings) {
    try {
      console.log('=== updateUserSettings API call ===');
      console.log('UID:', UID);
      console.log('settings:', settings);
      
      const response = await apiClient.post('/secure/update-user-settings', {
        UID,
        settings
      });
      console.log('User settings updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }
};

export default apiClient;
