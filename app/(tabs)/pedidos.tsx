// ScheduleAppointment.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  useColorScheme,
  Linking, // ← para abrir URLs
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Checkbox from 'expo-checkbox';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';


const ScheduleAppointment: React.FC = () => {
  const routeParams = useLocalSearchParams<{ phone?: string | string[] }>();
  const initialPhone = Array.isArray(routeParams.phone) ? routeParams.phone[0] : routeParams.phone;
  const colorScheme = useColorScheme(); // ← detecta modo oscuro
  const isDarkMode = colorScheme === 'dark';

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('---');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [errors, setErrors] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [loadingSearchCustomer, setLoadingSearchCustomer] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const parsePhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 13 && digits.startsWith('521')) return digits.slice(3);
    if (digits.length === 12 && digits.startsWith('52')) return digits.slice(2);
    return digits;
  };

  const pastePhoneNumber = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      const phoneNumberRegex = /^[+]?[0-9\s\-().]+$/;
      if (phoneNumberRegex.test(clipboardContent)) {
        setPhoneNumber(parsePhone(clipboardContent.replace(/\s+/g, '').trim()));
      } else {
        alert('El contenido del portapapeles no es un número válido.');
      }
    } catch (error) {
      console.error('No se pudo leer el portapapeles:', error);
    }
  };

  const resetNumber = () => setPhoneNumber('');

  const timeSlots = [
    '---',
    '09:00-10:00', '10:00-11:00', '11:00-12:00',
    '12:00-13:00', '13:00-14:00', '14:00-15:00',
    '15:00-16:00', '16:00-17:00', '17:00-18:00',
    '18:00-19:00', '19:00-20:00', '20:00-21:00'
  ];

  const handleSearchCustomer = async (phoneToSearch = phoneNumber) => {
    const cleanedPhone = parsePhone(phoneToSearch);
    if (cleanedPhone.length !== 10) {
      setCustomerInfo(null);
      setErrors('Ingresa un teléfono mexicano de 10 dígitos.');
      return;
    }

    try {
      setLoadingSearchCustomer(true);
      const query = new URLSearchParams({ phone: cleanedPhone });
      const response = await fetch(`https://us-central1-bonndia-85431.cloudfunctions.net/customers?${query}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || 'No se pudo buscar el cliente.');
      const { data } = result;
      const customer = data?.customers?.edges[0]?.node;
      if (!customer) {
        setCustomerInfo('NOT_FOUND');
      } else {
        customer.phone = cleanedPhone;
        setCustomerInfo(customer);
        setErrors(null);
      }
    } catch (e: any) {
      setErrors(e.message);
    } finally {
      setLoadingSearchCustomer(false);
    }
  };

  useEffect(() => {
    if (!initialPhone) return;
    const cleanedPhone = parsePhone(initialPhone);
    setPhoneNumber(cleanedPhone);
    void handleSearchCustomer(cleanedPhone);
  }, [initialPhone]);

  const handleCreateAgenda = async () => {
    if (!selectedDate || selectedTimeSlot === '---') {
      setErrors('Selecciona fecha y hora');
      return;
    }
    if (!checked && !customerInfo) {
      setErrors('Busca al cliente con número de teléfono');
      return;
    }

    setLoading(true);

    const dateFormatted = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

    const payload: any = {
      createDraftOrder: true,
      date: dateFormatted,
      timeSlot: selectedTimeSlot,
      timezone,
    };

    if (!checked) {
      Object.assign(payload, {
        phone: customerInfo.phone,
        email: customerInfo.email || undefined,
        customerId: customerInfo.id,
      });
    }

    try {
      const response = await fetch('https://us-central1-bonndia-85431.cloudfunctions.net/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      const id = result?.data?.draftOrderCreate?.draftOrder?.id?.match(/\/(\d+)$/)?.[1];
      if (id) {
        setDraftId(id);
      } else {
        Alert.alert('Error', 'No se pudo crear la orden correctamente.');
      }
    } catch (e: any) {
      setErrors(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedTimeSlot('---');
    setSelectedDate(new Date());
    setPhoneNumber('');
    setCustomerInfo(null);
    setErrors(null);
    setLoading(false);
    setDraftId(null);
    setChecked(false);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
      {!draftId ? (
        <>
          <View style={styles.row}>
            <Checkbox value={checked} onValueChange={setChecked} />
            <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}> El cliente no tiene registro</Text>
          </View>

          {!checked && (
            <View style={styles.section}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Teléfono del cliente</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
                  color: isDarkMode ? '#fff' : '#000'
                }]}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
              <View style={styles.row}>
                <Button title={loadingSearchCustomer ? 'Buscando...' : 'Buscar cliente'} onPress={() => void handleSearchCustomer()} />
                <Button title="Pegar" onPress={pastePhoneNumber} color="#00BFFF" />
                <Button title="Reset" onPress={resetNumber} color="#FF6347" />
              </View>
            </View>
          )}

          {customerInfo === 'NOT_FOUND' && <Text style={styles.error}>Cliente no encontrado con el teléfono "{phoneNumber}"</Text>}

          {customerInfo && customerInfo !== 'NOT_FOUND' && (
            <View style={styles.section}>
              <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Cliente encontrado:</Text>
              <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>{customerInfo.firstName} {customerInfo.lastName}</Text>
              <Text style={{ color: isDarkMode ? '#fff' : '#000' }}>{customerInfo.phone}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.label, { color: isDarkMode ? '#000' : '#000' }]}>Fecha</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
              <Text style={{ color: isDarkMode ? '#000' : '#000' }}>{selectedDate.toDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                mode="date"
                value={selectedDate}
                minimumDate={today}
                maximumDate={new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000)}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setSelectedDate(date);
                }}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#000' }]}>Elige la hora</Text>
            <Picker
              selectedValue={selectedTimeSlot}
              onValueChange={setSelectedTimeSlot}
              style={{ color: isDarkMode ? '#fff' : '#000' }}
            >
              {timeSlots.map((slot) => (
                <Picker.Item label={slot} value={slot} key={slot} />
              ))}
            </Picker>
          </View>

          <Button
            title={checked ? 'Crear orden sin cliente' : 'Crear agenda'}
            onPress={handleCreateAgenda}
            disabled={loading || (!checked && (!customerInfo || customerInfo === 'NOT_FOUND'))}
          />

          {errors && <Text style={styles.error}>{errors}</Text>}
        </>
      ) : (
        <View style={styles.section}>
          <Text style={styles.success}>¡Bien hecho! Se creó la orden.</Text>
          <View style={styles.buttonGroup}>
            <View style={styles.buttonWrapper}>
              <Button
                title="Ver orden en Shopify"
                onPress={async () => {
                  const url = `https://admin.shopify.com/store/aa51a3/draft_orders/${draftId}`;
                  await WebBrowser.openBrowserAsync(url);
                }}
              />
              <Text
                style={{
                  marginTop: 10,
                  color: 'white',
                  textDecorationLine: 'underline',
                }}
                selectable
                onLongPress={() => {
                  const url = `https://aa51a3.myshopify.com/admin/draft_orders/${draftId}`;
                  Clipboard.setStringAsync(url);
                  Alert.alert('Copiado', 'Enlace copiado al portapapeles');
                }}
              >
                https://aa51a3.myshopify.com/admin/draft_orders/{draftId}
              </Text>
            </View>
            <View style={styles.buttonWrapper}>
              <Button title="Crear nueva orden" onPress={resetForm} />
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default ScheduleAppointment;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  buttonWrapper: {
    marginBottom: 20, // ajusta a tu gusto
  },
  section: {
    marginBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 8,
    borderRadius: 6,
  },
  dateButton: {
    padding: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
  success: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'green',
    marginBottom: 10,
  },
  buttonGroup: {
    flexDirection: 'column',
  },
});
