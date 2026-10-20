import React, { useState, useEffect, useCallback } from 'react';
import { 
  Button, View, FlatList, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, useColorScheme
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface Order {
  name: string;
  address: string;
  formattedAddress: string;
  phone: string;
  email: string;
  lat: number;
  lng: number;
}

const API_URL = "https://us-central1-bonndia-85431.cloudfunctions.net/orders_shipday";
const HEADERS = {
  "Content-Type": "application/json",
  "Authorization": "3d015eea-6070-407d-a76c-fc62105503f4",
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifiedOrders, setNotifiedOrders] = useState<{ [phone: string]: boolean }>({});

  const getOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL, { headers: HEADERS });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      Alert.alert("Error", "Failed to fetch orders. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getOrders();
  }, []);

  const sendNotification = async (phoneNumber: string) => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ customerPhone: phoneNumber }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // ✅ Mark the order as notified
      setNotifiedOrders((prev) => ({ ...prev, [phoneNumber]: true }));

    } catch (error) {
      console.error("Error sending notification:", error);
      Alert.alert("Error", `Failed to send notification: ${error.message}`);
    }
  };

  const resetNotification = (phoneNumber: string) => {
    // ✅ Reset the notification state (show Notify button again)
    setNotifiedOrders((prev) => ({ ...prev, [phoneNumber]: false }));
  };

  const renderOrderItem = useCallback(({ item }: { item: Order }) => (
    <View style={[styles.orderItem, isDarkMode && styles.darkOrderItem]}>
      <Text style={[styles.orderName, isDarkMode && styles.darkText]}>{item.name}</Text>
      <Text style={[styles.orderAddress, isDarkMode && styles.darkText]}>{item.formattedAddress}</Text>
      <Text style={[styles.orderPhone, isDarkMode && styles.darkText]}>{item.phone}</Text>

      {/* ✅ If notified, show confirmation message & "Send notification again" button */}
      {notifiedOrders[item.phone] ? (
        <View style={styles.notificationSentContainer}>
          <Text style={[styles.notificationSentText, isDarkMode && styles.darkText]}>
            ✅ Notification sent correctly
          </Text>
          <TouchableOpacity 
            onPress={() => resetNotification(item.phone)} 
            style={styles.resendButton}
          >
            <Text style={styles.resendButtonText}>Send notification again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.notifyButton} 
          onPress={() => sendNotification(item.phone)}
        >
          <Text style={styles.notifyButtonText}>Notify</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [notifiedOrders, isDarkMode]);

  if (loading) {
    return (
      <View style={[styles.centered, isDarkMode && styles.darkBackground]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.darkText, isDarkMode && styles.darkText]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.darkBackground]}>
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.phone}
        contentContainerStyle={styles.flatListContent}
      />
      
      {/* Sticky Refresh Button */}
      <View style={styles.refreshButtonContainer}>
        <TouchableOpacity style={styles.refreshButton} onPress={getOrders}>
          <Text style={styles.refreshButtonText}>Refresh Orders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#f8f8f8",
  },
  darkBackground: {
    backgroundColor: "#121212",
  },
  orderItem: {
    backgroundColor: "#fff",
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  darkOrderItem: {
    backgroundColor: "#1e1e1e",
  },
  orderName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  orderAddress: {
    fontSize: 14,
    color: "#666",
    marginVertical: 2,
  },
  orderPhone: {
    fontSize: 14,
    color: "#007AFF",
  },
  darkText: {
    color: "#ffffff",
  },
  notifyButton: {
    marginTop: 10,
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  notifyButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  notificationSentContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  notificationSentText: {
    fontSize: 14,
    color: "#28a745",
    fontWeight: "bold",
  },
  resendButton: {
    marginTop: 5,
  },
  resendButtonText: {
    color: "#007AFF",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  flatListContent: {
    paddingBottom: 80, 
  },
  refreshButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  refreshButton: {
    backgroundColor: "#FF6347",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  refreshButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

