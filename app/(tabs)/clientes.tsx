import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';

type Customer = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  defaultAddress?: {
    address1?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
  };
};

type ValidatedAddress = {
  formattedAddress: string;
  address1: string;
  city: string;
  province: string;
  zip: string;
  placeId: string;
};

type PhoneStatus = 'idle' | 'checking' | 'available' | 'exists' | 'created';

const CUSTOMERS_URL = 'https://us-central1-bonndia-85431.cloudfunctions.net/customers';

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('521') && digits.length === 13) digits = digits.slice(3);
  else if (digits.startsWith('52') && digits.length === 12) digits = digits.slice(2);
  return digits;
}

async function readResponse(response: Response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || result.error || 'No se pudo completar la solicitud.');
  }
  return result;
}

export default function ClientesScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>('idle');
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(null);
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);
  const [validatedAddress, setValidatedAddress] = useState<ValidatedAddress | null>(null);
  const [busy, setBusy] = useState<'phone' | 'address' | 'create' | null>(null);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  const colors = {
    background: isDark ? '#121212' : '#F5F7F8',
    surface: isDark ? '#202124' : '#FFFFFF',
    text: isDark ? '#F4F6F8' : '#172126',
    muted: isDark ? '#AAB3B8' : '#5D6B72',
    border: isDark ? '#48545A' : '#C7D0D4',
    input: isDark ? '#292E31' : '#FFFFFF',
    accent: '#087E8B',
    error: '#B42318',
    success: '#167344',
  };

  const setNotice = (text: string, isError = false) => {
    setMessage(text);
    setMessageIsError(isError);
  };

  const verifyPhone = async () => {
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length !== 10) {
      setPhoneStatus('idle');
      setExistingCustomer(null);
      setNotice('Ingresa un teléfono mexicano válido de 10 dígitos.', true);
      return;
    }

    setBusy('phone');
    setExistingCustomer(null);
    setValidatedAddress(null);
    setNotice('');
    try {
      const query = new URLSearchParams({ phone: normalizedPhone });
      const response = await fetch(`${CUSTOMERS_URL}?${query}`);
      const result = await readResponse(response);
      const customer = result.data?.customers?.edges?.[0]?.node as Customer | undefined;

      if (customer) {
        setExistingCustomer(customer);
        setPhoneStatus('exists');
        setNotice('Ya existe un cliente con este teléfono. Revisa sus datos antes de continuar.');
      } else {
        setPhoneStatus('available');
        setNotice('Teléfono disponible para registrar.');
      }
    } catch (error) {
      setPhoneStatus('idle');
      setNotice(error instanceof Error ? error.message : 'No se pudo verificar el teléfono.', true);
    } finally {
      setBusy(null);
    }
  };

  const validateAddress = async () => {
    if (!address.trim()) {
      setNotice('Escribe la dirección para validarla.', true);
      return;
    }

    setBusy('address');
    setValidatedAddress(null);
    setNotice('');
    try {
      const response = await fetch(CUSTOMERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validateAddress: true, address: address.trim() }),
      });
      const result = await readResponse(response);
      setValidatedAddress(result as ValidatedAddress);
      setAddress(result.formattedAddress);
      setNotice('Dirección validada con Google Maps.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo validar la dirección.', true);
    } finally {
      setBusy(null);
    }
  };

  const createCustomer = async () => {
    const normalizedPhone = normalizePhone(phone);
    if (phoneStatus !== 'available' || !name.trim() || !validatedAddress) {
      setNotice('Verifica el teléfono, completa el nombre y valida la dirección.', true);
      return;
    }

    setBusy('create');
    setNotice('');
    try {
      const response = await fetch(CUSTOMERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createCustomer: true,
          phoneNumber: normalizedPhone,
          name: name.trim(),
          address: validatedAddress.formattedAddress,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (response.status === 409 && result.customer) {
        setExistingCustomer(result.customer as Customer);
        setPhoneStatus('exists');
        setNotice('Este teléfono ya fue registrado. No se creó un duplicado.');
        return;
      }
      if (!response.ok) {
        throw new Error(result.message || result.error || 'No se pudo crear el cliente.');
      }

      setCreatedCustomer(result.customer as Customer);
      setPhoneStatus('created');
      setNotice('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo crear el cliente.', true);
    } finally {
      setBusy(null);
    }
  };

  const startOrder = (customerPhone: string) => {
    router.push({ pathname: '/(tabs)/pedidos', params: { phone: normalizePhone(customerPhone) } });
  };

  const resetForm = () => {
    setPhone('');
    setName('');
    setAddress('');
    setPhoneStatus('idle');
    setExistingCustomer(null);
    setCreatedCustomer(null);
    setValidatedAddress(null);
    setNotice('');
  };

  const customerName = (customer?: Customer | null) =>
    [customer?.firstName, customer?.lastName].filter(Boolean).join(' ');

  if (phoneStatus === 'created' && createdCustomer) {
    return (
      <View style={[styles.successPage, { backgroundColor: colors.background }]}>
        <Text style={[styles.eyebrow, { color: colors.success }]}>CLIENTE REGISTRADO</Text>
        <Text style={[styles.title, { color: colors.text }]}>Cliente creado correctamente</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{customerName(createdCustomer) || name}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{createdCustomer.phone || `+52 ${normalizePhone(phone)}`}</Text>
        <Text style={[styles.prompt, { color: colors.text }]}>¿Quieres crear un pedido?</Text>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={() => startOrder(phone)}>
          <Text style={styles.primaryButtonText}>Crear pedido</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={resetForm}>
          <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>Registrar otro cliente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.eyebrow, { color: colors.accent }]}>SHOPIFY</Text>
        <Text style={[styles.title, { color: colors.text }]}>Nuevo cliente</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Verifica el teléfono antes de registrar sus datos.</Text>

        <Text style={[styles.label, { color: colors.text }]}>Teléfono</Text>
        <TextInput
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            setPhoneStatus('idle');
            setExistingCustomer(null);
            setNotice('');
          }}
          placeholder="844 123 4567"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
        />
        <TouchableOpacity
          style={[styles.secondaryButton, styles.topButton, { borderColor: colors.accent }]}
          disabled={busy !== null}
          onPress={verifyPhone}
        >
          {busy === 'phone' ? <ActivityIndicator color={colors.accent} /> : <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>Verificar teléfono</Text>}
        </TouchableOpacity>

        {phoneStatus === 'available' && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Nombre del cliente</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nombre y apellidos"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
            />
            <Text style={[styles.label, { color: colors.text }]}>Dirección</Text>
            <TextInput
              value={address}
              onChangeText={(value) => {
                setAddress(value);
                setValidatedAddress(null);
              }}
              placeholder="Calle, número, colonia y ciudad"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
              multiline
              style={[styles.input, styles.addressInput, { color: colors.text, backgroundColor: colors.input, borderColor: colors.border }]}
            />
            <TouchableOpacity
              style={[styles.secondaryButton, styles.topButton, { borderColor: colors.accent }]}
              disabled={busy !== null}
              onPress={validateAddress}
            >
              {busy === 'address' ? <ActivityIndicator color={colors.accent} /> : <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>Validar dirección</Text>}
            </TouchableOpacity>
            {validatedAddress && <Text style={[styles.validatedAddress, { color: colors.success }]}>{validatedAddress.formattedAddress}</Text>}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.accent }, (busy !== null || !validatedAddress || !name.trim()) && styles.disabledButton]}
              disabled={busy !== null || !validatedAddress || !name.trim()}
              onPress={createCustomer}
            >
              {busy === 'create' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Crear cliente</Text>}
            </TouchableOpacity>
          </>
        )}

        {phoneStatus === 'exists' && existingCustomer && (
          <View style={[styles.customerPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.text }]}>Cliente existente</Text>
            <Text style={[styles.body, { color: colors.text }]}>{customerName(existingCustomer) || 'Nombre no disponible'}</Text>
            <Text style={[styles.body, { color: colors.muted }]}>{existingCustomer.phone}</Text>
            {existingCustomer.email ? <Text style={[styles.body, { color: colors.muted }]}>{existingCustomer.email}</Text> : null}
            {existingCustomer.defaultAddress?.address1 ? (
              <Text style={[styles.body, { color: colors.muted }]}>
                {[existingCustomer.defaultAddress.address1, existingCustomer.defaultAddress.city, existingCustomer.defaultAddress.province]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            ) : null}
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={() => startOrder(existingCustomer.phone || phone)}>
              <Text style={styles.primaryButtonText}>Crear pedido para este cliente</Text>
            </TouchableOpacity>
          </View>
        )}

        {message ? <Text style={[styles.message, { color: messageIsError ? colors.error : colors.success }]}>{message}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  successPage: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 6,
  },
  prompt: {
    fontSize: 19,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addressInput: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  topButton: {
    marginTop: 10,
    marginBottom: 6,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  validatedAddress: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  customerPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  message: {
    fontSize: 14,
    marginTop: 14,
  },
});
