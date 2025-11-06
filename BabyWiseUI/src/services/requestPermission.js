import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';
export const requestNotificationPermission = async () => {
    try {
      // En Android 13+ necesitamos pedir POST_NOTIFICATIONS manualmente
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        // Primero verificamos el estado actual del permiso
        const hasPermission = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (hasPermission) {
            console.log('✅ Ya tiene permisos de notificación.');
            return true;
        }

        // Pedimos el permiso si no está concedido
        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
            title: 'Permiso para notificaciones',
            message:
                'Esta app necesita permisos para enviarte alertas y notificaciones importantes.',
            buttonPositive: 'Permitir',
            }
        );

        if (result === PermissionsAndroid.RESULTS.GRANTED) {
            console.log('✅ Permiso concedido');
            return true;
        } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            console.log('🚫 Permiso denegado permanentemente');
            Alert.alert(
            'Permiso de notificaciones bloqueado',
            'Parece que has bloqueado las notificaciones para esta app. ¿Quieres abrir la configuración para activarlas?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                text: 'Abrir configuración',
                onPress: () => Linking.openSettings(),
                },
            ]
            );
            return false;
        } else {
            console.log('🚫 Permiso denegado');
            return false;
        }
        }
    } catch (error) {
      console.error('Error al pedir permisos:', error);
    }
  };

  export const requestNotificationPermissionFirstTimeOpen = async () => {
    try {
      // En Android 13+ necesitamos pedir POST_NOTIFICATIONS manualmente
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ Permiso de notificaciones concedido');
        } else {
          console.log('🚫 Permiso de notificaciones denegado');
          return;
        }
      }
    } catch (error) {
      console.error('Error al pedir permisos:', error);
    }
  };