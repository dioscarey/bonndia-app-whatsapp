import { useState } from 'react';
import { StyleSheet, TextInput, Button, View, Linking, useColorScheme } from 'react-native';
import * as Clipboard from 'expo-clipboard'; // Import Clipboard from expo-clipboard


import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

function encodePhoneNumber(phoneNumber: string) {
  return btoa(phoneNumber); // Base64 encoding
}

export default function HomeScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const colorScheme = useColorScheme(); // Detect current theme

  const parsePhone = (p: any) => {
    const digits = p.replace(/\D/g, "")
    // Mexican numbers: keep the 10-digit national number, dropping 52 / 521 prefixes
    return digits.length > 10 ? digits.slice(-10) : digits
  }

  const pastePhoneNumber = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync()
      // Validate if clipboard content is a phone number
      const phoneNumberRegex = /^[+]?[0-9\s\-().]+$/;

      if (phoneNumberRegex.test(clipboardContent)) {
        setPhoneNumber(parsePhone(clipboardContent.replace(/\s+/g, '').trim())); // Remove spaces and trim
      } else {
        alert('Clipboard content is not a valid phone number.');
      }
    } catch (error) {
      console.error('Failed to read clipboard content:', error);
    }
  };


  const generateWhatsAppLink = () => {
    const formattedNumber = parsePhone(phoneNumber);

    const encodedPhone = encodePhoneNumber(formattedNumber);

    const template = `
Presione en la siguiente liga para seleccionar la hora de entrega. Al finalizar, será redirigido de vuelta aquí ☺️

📅 https://bonndia-peddidos.fly.dev/agenda?z=${encodedPhone}

📩 Si necesita apoyo para seleccionar la hora, hágamelo saber.
`

    const link = `https://wa.me/52${formattedNumber}?text=${encodeURIComponent(template.trim())}&app_absent=0`;
    setGeneratedLink(link);
  };

  const openLink = () => {

    if (generatedLink) {
      Linking.openURL(generatedLink).catch(err => console.error('Failed to open link:', err));
    }
  };

  const resetNumber = () => {
    setPhoneNumber('');
    setGeneratedLink('');
  };


  return (
   
      <ThemedView
        style={[
          styles.container,
          { backgroundColor: colorScheme === 'dark' ? '#121212' : '#FFFFFF' },
        ]}>
        <ThemedText
          type="title"
          style={{
            color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
          }}>
          Whatsapp
        </ThemedText>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F2F2F2',
              color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
              borderColor: colorScheme === 'dark' ? '#333333' : '#CCCCCC',
            },
          ]}

          placeholderTextColor={colorScheme === 'dark' ? '#888888' : '#666666'}
          keyboardType="phone-pad"
          
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />

        <View style={styles.buttonContainer}>
          <Button title="Generar link" onPress={generateWhatsAppLink} />
          <Button title="Paste" onPress={pastePhoneNumber} color="#00BFFF" />
          <Button title="Reset" onPress={resetNumber} color="#FF6347" />
        </View>

        {generatedLink ? (
          <View style={styles.linkContainer}>
            <ThemedText style={styles.linkText}>{generatedLink}</ThemedText>
            <Button title="Open in WhatsApp" onPress={openLink} />
          </View>
        ) : null}
      </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 200,
    padding: 30,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    width: '100%',
    marginBottom: 10,
  },
  buttonContainer: {
    marginVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
  },
  linkContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  linkText: {
    marginBottom: 10,
    textDecorationLine: 'underline',
  },
});